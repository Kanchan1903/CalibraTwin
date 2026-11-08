from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Device, DigitalTwinParameter, User
from app.schemas.schemas import DeviceCreate, DeviceUpdate, DeviceResponse

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("", response_model=List[DeviceResponse])
def list_devices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Device).all()

@router.post("", response_model=DeviceResponse)
def create_device(device_in: DeviceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Device).filter(Device.device_id == device_in.device_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device with this ID already exists")
    
    device = Device(**device_in.dict())
    db.add(device)
    db.commit()
    db.refresh(device)

    # Initialize Digital Twin parameter record
    dt_param = DigitalTwinParameter(
        device_id=device.device_id,
        offset=0.0,
        gain=0.0,
        kT=0.02,
        kH=0.005,
        estimated_offset=0.0,
        estimated_gain=0.0,
        model_confidence=0.98
    )
    db.add(dt_param)
    db.commit()

    return device

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(device_id: str, update_in: DeviceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.device_id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = update_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(device, field, val)
    
    db.commit()
    db.refresh(device)
    return device
