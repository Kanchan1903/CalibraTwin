from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import DigitalTwinParameter, User
from app.schemas.schemas import DigitalTwinModel, DigitalTwinUpdate

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin"])

@router.get("/{device_id}", response_model=DigitalTwinModel)
def get_digital_twin(device_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dt = db.query(DigitalTwinParameter).filter(DigitalTwinParameter.device_id == device_id).first()
    if not dt:
        raise HTTPException(status_code=404, detail="Digital twin configuration not found for this device")
    return dt

@router.put("/{device_id}", response_model=DigitalTwinModel)
def update_digital_twin(device_id: str, update_in: DigitalTwinUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dt = db.query(DigitalTwinParameter).filter(DigitalTwinParameter.device_id == device_id).first()
    if not dt:
        raise HTTPException(status_code=404, detail="Digital twin configuration not found")
    
    for field, val in update_in.dict(exclude_unset=True).items():
        setattr(dt, field, val)
    db.commit()
    db.refresh(dt)
    return dt
