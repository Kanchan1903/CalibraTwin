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
        is_simulated: bool = False
    ) -> Dict[str, Any]:
        device = db.query(Device).filter(Device.device_id == device_id).first()
        if not device:
            # Auto-register device if unknown
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

        # Run Digital Twin calculation & EKF
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

        # Check sensor agreement: digital vs analog redundant sensor
        # Allow +/- 1.2 kPa variance between redundant channels
        sensor_agreement = abs(digital_pressure - analog_pressure) <= 1.2

        # Data quality
        if not sensor_agreement and abs(residual) > 3.0:
            data_quality = "SUSPECT"
        elif abs(residual) > 6.0:
            data_quality = "INVALID"
        else:
            data_quality = "GOOD"

        # Update twin param estimates
        twin_param.estimated_offset = ekf_res["estimated_offset"]
        twin_param.estimated_gain = ekf_res["estimated_gain"]
        twin_param.model_confidence = ekf_res["model_confidence"]
        twin_param.updated_at = datetime.datetime.utcnow()

        # Update device status
        device.last_seen = datetime.datetime.utcnow()
        if abs(residual) > device.drift_critical_threshold_kpa:
            device.status = "WARNING"
        else:
            device.status = "ONLINE"

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
            sensor_agreement=sensor_agreement,
            data_quality=data_quality,
            health_status="GOOD" if data_quality == "GOOD" else "DEGRADED",
            is_simulated=is_simulated
        )
        db.add(telemetry)

        # Fetch recent 20 residuals for EWMA, CUSUM and Isolation Forest
        recent_telemetries = db.query(Telemetry).filter(
            Telemetry.device_id == device_id
        ).order_by(Telemetry.id.desc()).limit(20).all()

        residuals = [t.residual for t in reversed(recent_telemetries)] if recent_telemetries else [residual]
        residuals.append(residual)

        # CUSUM drift detection
        _, _, cusum_detected = self.drift_analytics.calculate_cusum(residuals)
        
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

        # Record Drift Event if drift detected
        if drift_status != "NORMAL":
            drift_ev = DriftEvent(
                device_id=device_id,
                timestamp=datetime.datetime.utcnow(),
                drift_status=drift_status,
                drift_magnitude=round(residual, 3),
                drift_direction="POSITIVE" if residual > 0 else "NEGATIVE",
                drift_rate=round(drift_rate, 4),
                detection_method="CUSUM + EWMA",
                residual_classification=classification
            )
            db.add(drift_ev)

            # Generate alert if critical or not logged recently
            if drift_status == "CRITICAL_DRIFT":
                alert = Alert(
                    device_id=device_id,
                    alert_type="Persistent drift",
                    severity="Critical",
                    description=f"Critical sensor drift of {residual:.2f} kPa detected via CUSUM.",
                    probable_root_cause=f"Sensor diaphragm degradation or thermal drift ({classification}).",
                    recommended_action="Execute self-calibration or replace sensor."
                )
                db.add(alert)

        # RUL update
        rul_data = PredictiveMaintenanceService.calculate_rul(
            current_drift=residual,
            drift_rate_per_hour=drift_rate,
            critical_threshold=device.drift_critical_threshold_kpa,
            model_confidence=twin_param.model_confidence
        )

        # Check existing RUL
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

        return {
            "telemetry_id": telemetry.id,
            "digital_pressure": digital_pressure,
            "expected_pressure": expected_pressure,
            "residual": residual,
            "drift_status": drift_status,
            "classification": classification,
            "rul_days": rul_data["remaining_days"],
            "model_confidence": twin_param.model_confidence
        }
