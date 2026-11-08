from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import CalibrationEvent, User
from app.schemas.schemas import CalibrationRequest, CalibrationResponse
from app.services.calibration_service import CalibrationEngine

router = APIRouter(prefix="/calibration", tags=["Self-Calibration Engine"])

@router.post("/execute", response_model=dict)
def trigger_calibration(
    req: CalibrationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        res = CalibrationEngine.execute_calibration(
            db=db,
            device_id=req.device_id,
            user_name=current_user.full_name,
            level=req.level or "L3 — Bounded Auto-Correct",
            manual_offset_delta=req.manual_offset_delta,
            manual_gain_delta=req.manual_gain_delta
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history/{device_id}", response_model=List[CalibrationResponse])
def get_calibration_history(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(CalibrationEvent).filter(
        CalibrationEvent.device_id == device_id
    ).order_by(CalibrationEvent.id.desc()).all()
