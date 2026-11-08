from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Device, User
from app.services.simulator import SensorSimulator
from app.services.telemetry_service import TelemetryService

router = APIRouter(prefix="/simulator", tags=["Demo Sensor Simulator"])

class SimulationStepRequest(BaseModel):
    device_id: str
    mode: str = "normal" # normal, offset_drift, gain_drift, temperature_variation, humidity_variation, sudden_fault, noisy_sensor, wifi_disconnection, successful_calibration, failed_calibration

# Keep in-memory simulator instances per device
simulators = {}
telemetry_service = TelemetryService()

@router.post("/step")
def run_simulation_step(
    req: SimulationStepRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
    reading = sim.generate_reading(mode=req.mode)

    if reading.get("disconnected"):
        device.status = "OFFLINE"
        db.commit()
        return {"status": "DISCONNECTED", "device_id": req.device_id}

    # Ingest directly through the full pipeline
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

    return {
        "device_id": req.device_id,
        "mode": req.mode,
        "raw_generated": reading,
        "processed_result": processed
    }

@router.post("/reset/{device_id}")
def reset_simulation(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if device_id in simulators:
        del simulators[device_id]
    return {"status": "RESET", "device_id": device_id}
