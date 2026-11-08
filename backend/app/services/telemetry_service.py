import random
import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import (
    Device, Telemetry, DigitalTwinParameter,
    DriftEvent, AnomalyEvent, RulPrediction, Alert
)
from app.services.digital_twin import DigitalTwinEngine
from app.services.drift_analytics import DriftAnalyticsService
from app.services.rul_engine import PredictiveMaintenanceService
from app.services.sensor_redundancy import SensorDiagnosticsEngine
from app.services.data_quality import DataQualityEngine
from app.services.xai_engine import ExplainableAIEngine

class TelemetryService:
    def __init__(self):
        self.drift_analytics = DriftAnalyticsService()

    def process_incoming_telemetry(
        self,
        db: Session,
        device_id: str,
        digital_pressure: float,
        analog_pressure: float,
        temperature: float,
        humidity: float,
        ref_temp: float = 25.0,
        is_simulated: bool = False,
        is_buffered: bool = False,
        sequence_id: int = None
    ) -> Dict[str, Any]:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            device = Device(
                device_id=device_id,
                name=f"Device {device_id}",
                is_demo=is_simulated
            )
            db.add(device)
            db.commit()
            db.refresh(device)

        # Retrieve digital twin parameters
        twin_param = db.query(DigitalTwinParameter).filter(
            DigitalTwinParameter.device_id == device_id
        ).first()

        if not twin_param:
            twin_param = DigitalTwinParameter(
                device_id=device_id,
                offset=0.0,
                gain=0.0,
                kT=0.02,
                kH=0.005,
                estimated_offset=0.0,
                estimated_gain=0.0,
                model_confidence=0.98
            )
            db.add(twin_param)
            db.commit()
            db.refresh(twin_param)

        # 1. Digital Twin calculation & EKF State Estimation
        dt_engine = DigitalTwinEngine(
            offset=twin_param.offset,
            gain=twin_param.gain,
            kT=twin_param.kT,
            kH=twin_param.kH
        )
        dt_engine.x[0, 0] = twin_param.estimated_offset
        dt_engine.x[1, 0] = twin_param.estimated_gain

        ekf_res = dt_engine.ekf_update(
            measured=digital_pressure,
            true_value=device.reference_pressure_kpa,
            temperature=temperature,
            humidity=humidity,
            ref_temp=ref_temp,
            ref_hum=device.reference_humidity_pct
        )

        expected_pressure = ekf_res["expected_reading"]
        residual = digital_pressure - expected_pressure

        # Fetch recent 20 readings for cross-validation & quality analysis
        recent_telemetries = db.query(Telemetry).filter(
            Telemetry.device_id == device_id
        ).order_by(Telemetry.id.desc()).limit(20).all()

        history_records = [
            {
                "digital_pressure": t.digital_pressure,
                "analog_pressure": t.analog_pressure,
                "timestamp": t.timestamp,
                "residual": t.residual
            }
            for t in reversed(recent_telemetries)
        ]

        # 2. Sensor Redundancy & Cross-Validation
        redundancy_res = SensorDiagnosticsEngine.cross_validate(
            digital_p=digital_pressure,
            analog_p=analog_pressure,
            temp_c=temperature,
            hum_pct=humidity,
            history=history_records
        )

        # 3. Data Quality & Trust Score (0 - 100)
        curr_reading_meta = {
            "digital_pressure": digital_pressure,
            "analog_pressure": analog_pressure,
            "timestamp": datetime.datetime.utcnow(),
            "residual": residual,
            "is_buffered": is_buffered
        }
        quality_res = DataQualityEngine.evaluate_quality(
            current_reading=curr_reading_meta,
            recent_readings=history_records,
            sensor_agreement_score=redundancy_res["sensor_agreement_score"]
        )

        # Update twin param estimates
        twin_param.estimated_offset = ekf_res["estimated_offset"]
        twin_param.estimated_gain = ekf_res["estimated_gain"]
        twin_param.model_confidence = ekf_res["model_confidence"]
        twin_param.updated_at = datetime.datetime.utcnow()

        # Update device status
        device.last_seen = datetime.datetime.utcnow()
        if abs(residual) > device.drift_critical_threshold_kpa or quality_res["trust_score"] < 40.0:
            device.status = "WARNING"
        elif not redundancy_res["sensor_agreement"]:
            device.status = "UNDER_WATCH"
        else:
            device.status = "ONLINE"

        # Determine qualitative data quality label
        if quality_res["trust_score"] >= 75.0:
            data_quality_label = "GOOD"
        elif quality_res["trust_score"] >= 50.0:
            data_quality_label = "SUSPECT"
        else:
            data_quality_label = "INVALID"

        # Save Telemetry
        telemetry = Telemetry(
            device_id=device_id,
            timestamp=datetime.datetime.utcnow(),
            digital_pressure=round(digital_pressure, 3),
            analog_pressure=round(analog_pressure, 3),
            temperature=round(temperature, 2),
            humidity=round(humidity, 2),
            reference_temperature=ref_temp,
            expected_pressure=round(expected_pressure, 3),
            residual=round(residual, 3),
            sensor_agreement=redundancy_res["sensor_agreement"],
            data_quality=data_quality_label,
            health_status="GOOD" if data_quality_label == "GOOD" else "DEGRADED",
            is_simulated=is_simulated
        )
        db.add(telemetry)

        # Residual tracking for CUSUM & EWMA
        residuals = [t["residual"] for t in history_records if t["residual"] is not None]
        residuals.append(residual)

        # CUSUM drift detection
        s_pos, s_neg, cusum_detected = self.drift_analytics.calculate_cusum(residuals)
        cusum_stat = max(s_pos[-1], s_neg[-1]) if s_pos else 0.0

        # Step changepoint
        is_step, _ = self.drift_analytics.detect_changepoint(residuals)

        # Drift rate estimate (kPa / hr)
        drift_rate = (residuals[-1] - residuals[0]) / (len(residuals) * 0.1) if len(residuals) > 1 else 0.0

        # Classify residual behavior
        classification = self.drift_analytics.classify_residual_behavior(
            residual=residual,
            dT=temperature - ref_temp,
            dH=humidity - device.reference_humidity_pct,
            drift_rate=drift_rate,
            is_step_change=is_step
        )

        drift_status = "NORMAL"
        if abs(residual) > device.drift_critical_threshold_kpa:
            drift_status = "CRITICAL_DRIFT"
        elif abs(residual) > device.drift_warn_threshold_kpa or cusum_detected:
            drift_status = "DRIFT_DETECTED"

        # 4. Explainable AI (XAI) Diagnosis & Reasoning Generation
        xai_explanation = ExplainableAIEngine.explain_drift_decision(
            residual=residual,
            cusum_detected=cusum_detected,
            cusum_val=cusum_stat,
            cusum_threshold=1.20,
            ewma_slope=drift_rate,
            dT=temperature - ref_temp,
            dH=humidity - device.reference_humidity_pct,
            confidence=twin_param.model_confidence,
            classification=classification,
            sensor_agreement=redundancy_res["sensor_agreement"]
        )

        # Record Drift Event if drift detected
        if drift_status != "NORMAL":
            drift_ev = DriftEvent(
                device_id=device_id,
                timestamp=datetime.datetime.utcnow(),
                drift_status=drift_status,
                drift_magnitude=round(residual, 3),
                drift_direction="POSITIVE" if residual > 0 else "NEGATIVE",
                drift_rate=round(drift_rate, 4),
                detection_method="CUSUM + EWMA + Digital Twin",
                residual_classification=classification
            )
            db.add(drift_ev)

            # Generate alert if critical or step fault
            if drift_status == "CRITICAL_DRIFT" or classification == "Fault":
                alert = Alert(
                    device_id=device_id,
                    alert_type="Persistent drift" if classification != "Fault" else "Sensor Fault",
                    severity="Critical",
                    description=xai_explanation["detection_reason"],
                    probable_root_cause=f"Residual classification: {classification}. Threshold crossed: {xai_explanation['threshold_crossed']}",
                    recommended_action=xai_explanation["recommended_next_action"]
                )
                db.add(alert)

        # RUL update
        rul_data = PredictiveMaintenanceService.calculate_rul(
            current_drift=residual,
            drift_rate_per_hour=drift_rate,
            critical_threshold=device.drift_critical_threshold_kpa,
            model_confidence=twin_param.model_confidence
        )

        existing_rul = db.query(RulPrediction).filter(RulPrediction.device_id == device_id).first()
        if not existing_rul:
            existing_rul = RulPrediction(
                device_id=device_id,
                remaining_days=rul_data["remaining_days"],
                predicted_calibration_date=rul_data["predicted_calibration_date"],
                drift_rate_daily=rul_data["drift_rate_daily"],
                maintenance_priority=rul_data["maintenance_priority"],
                confidence_score=rul_data["confidence_score"]
            )
            db.add(existing_rul)
        else:
            existing_rul.remaining_days = rul_data["remaining_days"]
            existing_rul.predicted_calibration_date = rul_data["predicted_calibration_date"]
            existing_rul.drift_rate_daily = rul_data["drift_rate_daily"]
            existing_rul.maintenance_priority = rul_data["maintenance_priority"]
            existing_rul.confidence_score = rul_data["confidence_score"]
            existing_rul.timestamp = datetime.datetime.utcnow()

        db.commit()

        # Digital Twin Synchronization Status
        sync_status = "DELAYED" if is_buffered else "SYNCED"

        return {
            "telemetry_id": telemetry.id,
            "device_id": device_id,
            "timestamp": telemetry.timestamp.isoformat(),
            "digital_pressure": digital_pressure,
            "analog_pressure": analog_pressure,
            "expected_pressure": expected_pressure,
            "residual": residual,
            "drift_status": drift_status,
            "classification": classification,
            "sensor_diagnostics": redundancy_res,
            "data_quality_evaluation": quality_res,
            "xai_explanation": xai_explanation,
            "rul_days": rul_data["remaining_days"],
            "model_confidence": twin_param.model_confidence,
            "twin_sync_status": sync_status,
            "is_buffered": is_buffered
        }
