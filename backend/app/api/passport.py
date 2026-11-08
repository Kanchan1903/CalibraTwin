from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import CalibrationPassport, User
from app.schemas.schemas import PassportEntryResponse
from app.services.passport_service import PassportSecurityService

router = APIRouter(prefix="/passport", tags=["Calibration Passport"])

@router.get("/{device_id}", response_model=List[PassportEntryResponse])
def get_passport_entries(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entries = db.query(CalibrationPassport).filter(
        CalibrationPassport.device_id == device_id
    ).order_by(CalibrationPassport.id.asc()).all()
    return entries

@router.get("/verify/{device_id}")
def verify_passport_integrity(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    entries = db.query(CalibrationPassport).filter(
        CalibrationPassport.device_id == device_id
    ).order_by(CalibrationPassport.id.asc()).all()
    
    if not entries:
        return {
            "device_id": device_id,
            "status": "EMPTY",
            "message": "No calibration events recorded yet in passport.",
            "is_valid": True,
            "total_blocks": 0
        }

    is_valid = PassportSecurityService.verify_chain(entries)
    return {
        "device_id": device_id,
        "is_valid": is_valid,
        "total_blocks": len(entries),
        "latest_hash": entries[-1].current_event_hash if entries else None,
        "message": "Cryptographic SHA-256 chain verified intact without tampering." if is_valid else "ALERT: Hash chain mismatch or data modification detected!"
    }
