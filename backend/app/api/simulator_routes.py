from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Device, User, DigitalTwinParameter
from app.services.simulator import SensorSimulator
from app.services.telemetry_service import TelemetryService
from app.services.calibration_service import CalibrationEngine
from app.services.benchmarking import BenchmarkingEngine

router = APIRouter(prefix="/simulator", tags=["Advanced Demonstration Lab & Benchmarking"])

class ScenarioStepRequest(BaseModel):
    device_id: str
    scenario_id: Optional[int] = 1 # default to 1 (normal)
    mode: Optional[str] = None     # support top toolbar 'mode'
    scenario_mode: Optional[str] = None
    engineer_approved: Optional[bool] = False

simulators: Dict[str, SensorSimulator] = {}
telemetry_service = TelemetryService()

SCENARIO_MAP = {
    1: {"name": "Normal Sensor Operation", "mode": "normal", "desc": "Healthy state, stable residuals, zero false alarms."},
    2: {"name": "Gradual Offset Drift", "mode": "offset_drift", "desc": "Continuous aging offset accumulating. CUSUM triggers drift alert."},
    3: {"name": "Gain Drift", "mode": "gain_drift", "desc": "Sensitivity slope change across full-scale reading range."},
    4: {"name": "Temperature-Induced Variation", "mode": "temperature_variation", "desc": "Ambient thermal swing (+16°C) compensated by Digital Twin physics."},
    5: {"name": "Humidity-Induced Variation", "mode": "humidity_variation", "desc": "Moisture swings (+32% RH) compensated by twin kH model."},
    6: {"name": "Sudden Sensor Fault", "mode": "sudden_fault", "desc": "Abrupt step jump (+5.2 kPa). Isolation Forest & gradient jump alarm."},
    7: {"name": "Sensor Noise & Jitter", "mode": "sensor_noise", "desc": "High Gaussian noise standard deviation. Trust score penalizes jitter."},
    8: {"name": "Primary & Redundant Disagreement", "mode": "sensor_disagreement", "desc": "Digital vs ADS1115 analog reading divergence detected."},
    9: {"name": "Wi-Fi Disconnection & Buffer", "mode": "wifi_disconnection", "desc": "Offline ring buffer accumulates readings for store-and-forward."},
    10: {"name": "Successful Self-Calibration", "mode": "successful_calibration", "desc": "Closed-loop L3 bounded correction with verification pass."},
    11: {"name": "Failed Self-Calibration & Rollback", "mode": "failed_calibration", "desc": "Unstable residual after 2 retries triggers automatic rollback."},
    12: {"name": "Recovery After Rollback", "mode": "recovery_after_rollback", "desc": "Device restores verified baseline parameters safely."}
}

@router.get("/scenarios")
def get_available_scenarios():
    return SCENARIO_MAP

@router.post("/run-scenario")
def run_scenario_pipeline(
    req: ScenarioStepRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes the Complete Processing Pipeline for any of the 12 Demonstration Scenarios:
    Sensor input -> Filtering -> Validation -> Digital Twin -> Drift Detection -> Decision Engine -> Calibration / Alert -> Dashboard.
    """
    device = db.query(Device).filter(Device.device_id == req.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if req.device_id not in simulators:
        simulators[req.device_id] = SensorSimulator(
            base_pressure=device.reference_pressure_kpa,
            base_temp=device.reference_temperature_c,
            base_hum=device.reference_humidity_pct
        )

    sim = simulators[req.device_id]
    scenario_info = SCENARIO_MAP.get(req.scenario_id or 1, SCENARIO_MAP[1])
    mode = req.mode or req.scenario_mode or scenario_info["mode"]

    # 1. Pipeline Stage: Sensor Input Generation
    reading = sim.generate_reading(mode=mode)

    # Special handling for Offline Wi-Fi Disconnection
    if reading.get("disconnected"):
        device.status = "OFFLINE"
        db.commit()
        return {
            "scenario_id": req.scenario_id,
            "scenario_name": scenario_info["name"],
            "pipeline_stages": {
                "sensor_input": {"status": "DISCONNECTED", "buffered_in_flash": reading["offline_buffer_count"]},
                "edge_filtering": {"action": "Buffering locally in ESP32 ring buffer"},
                "twin_sync": {"status": "OFFLINE", "queued": reading["offline_buffer_count"]},
                "system_response": f"Wi-Fi down: ESP32 offline-first engine activated. {reading['offline_buffer_count']} telemetry packets preserved."
            }
        }

    # 2. Pipeline Stage: Ingest through Telemetry & Twin Pipeline
    processed = telemetry_service.process_incoming_telemetry(
        db=db,
        device_id=req.device_id,
        digital_pressure=reading["digital_pressure"],
        analog_pressure=reading["analog_pressure"],
        temperature=reading["temperature"],
        humidity=reading["humidity"],
        ref_temp=reading["reference_temperature"],
        is_simulated=True
    )

    # 3. Pipeline Stage: Decision Engine & Safe Calibration
    calibration_action = None
    if req.scenario_id == 10: # Successful Calibration
        calibration_action = CalibrationEngine.execute_calibration(
            db=db,
            device_id=req.device_id,
            user_name=current_user.full_name,
            user_role=current_user.role,
            level="L3 — Bounded Auto-Correct"
        )
    elif req.scenario_id == 11: # Failed Calibration & Rollback
        # Simulate an excessive offset that forces verification retry & rollback
        twin_p = db.query(DigitalTwinParameter).filter(DigitalTwinParameter.device_id == req.device_id).first()
        if twin_p:
            twin_p.estimated_offset = 3.8
            db.commit()
        calibration_action = CalibrationEngine.execute_calibration(
            db=db,
            device_id=req.device_id,
            user_name=current_user.full_name,
            user_role=current_user.role,
            level="L3 — Safe Verification Test"
        )

    return {
        "scenario_id": req.scenario_id,
        "scenario_name": scenario_info["name"],
        "scenario_description": scenario_info["desc"],
        "pipeline_stages": {
            "1_sensor_input": {
                "digital_reading_kpa": reading["digital_pressure"],
                "analog_reading_kpa": reading["analog_pressure"],
                "temperature_c": reading["temperature"],
                "humidity_pct": reading["humidity"]
            },
            "2_filtering_and_validation": processed["sensor_diagnostics"],
            "3_data_quality_assessment": processed["data_quality_evaluation"],
            "4_digital_twin_state": {
                "expected_pressure_kpa": processed["expected_pressure"],
                "residual_kpa": processed["residual"],
                "model_confidence": processed["model_confidence"],
                "twin_sync_status": processed["twin_sync_status"]
            },
            "5_drift_detection_cusum": {
                "drift_status": processed["drift_status"],
                "residual_classification": processed["classification"]
            },
            "6_explainable_ai_decision": processed["xai_explanation"],
            "7_calibration_governance": calibration_action,
            "8_predictive_rul": {
                "estimated_remaining_days": processed["rul_days"]
            }
        }
    }

@router.post("/step")
def run_simulation_step(
    req: ScenarioStepRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Backwards-compatible simulator step endpoint."""
    return run_scenario_pipeline(req=req, db=db, current_user=current_user)

@router.get("/benchmarks")
def get_benchmarks(sample_size: int = Query(150, ge=50, le=500)):
    """Runs empirical benchmark suite comparing Fixed vs ML-only vs CalibraTwin Combined."""
    return BenchmarkingEngine.run_benchmark_suite(sample_size=sample_size)
