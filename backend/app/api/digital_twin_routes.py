from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Device, DigitalTwinParameter, User
from app.schemas.schemas import DigitalTwinModel, DigitalTwinUpdate
from app.services.digital_twin import DigitalTwinEngine
import datetime

router = APIRouter(prefix="/twin", tags=["Digital Twin State & Synchronization"])

@router.get("/{device_id}")
def get_digital_twin_state(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns complete synchronized Digital Twin state:
    - Actual sensor readings
    - Expected readings
    - Estimated offset & gain
    - Environmental compensation (kT, kH)
    - Calibration parameters
    - Device health
    - Last synchronization timestamp
    - Synchronization status: SYNCED / DELAYED / OFFLINE
    """
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

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

    # Calculate sync status
    now = datetime.datetime.utcnow()
    diff_sec = (now - device.last_seen).total_seconds() if device.last_seen else 999999
    if diff_sec > 60:
        sync_status = "OFFLINE"
    elif diff_sec > 15:
        sync_status = "DELAYED"
    else:
        sync_status = "SYNCED"

    return {
        "device_id": device_id,
        "name": device.name,
        "sync_status": sync_status,
        "device_status": device.status,
        "last_sync_timestamp": device.last_seen.isoformat() if device.last_seen else None,
        "actual_reference_pressure": device.reference_pressure_kpa,
        "parameters": {
            "active_offset": twin_param.offset,
            "active_gain": twin_param.gain,
            "thermal_coeff_kT": twin_param.kT,
            "humidity_coeff_kH": twin_param.kH
        },
        "estimated_states": {
            "estimated_offset": twin_param.estimated_offset,
            "estimated_gain": twin_param.estimated_gain,
            "model_confidence": twin_param.model_confidence,
            "updated_at": twin_param.updated_at.isoformat() if twin_param.updated_at else None
        },
        "environmental_compensation_formula": "Expected = Ref * (1 + Gain) + Offset + kT * (T - T_ref) + kH * (H - H_ref)"
    }
