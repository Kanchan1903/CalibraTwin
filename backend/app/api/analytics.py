from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import DriftEvent, AnomalyEvent, RulPrediction, User
from app.schemas.schemas import DriftEventResponse, AnomalyEventResponse, RulPredictionResponse

router = APIRouter(prefix="/analytics", tags=["AI Analytics & RUL"])

@router.get("/drift/{device_id}", response_model=List[DriftEventResponse])
def get_drift_events(device_id: str, limit: int = Query(50), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    events = db.query(DriftEvent).filter(DriftEvent.device_id == device_id).order_by(DriftEvent.id.desc()).limit(limit).all()
    return events

@router.get("/anomalies/{device_id}", response_model=List[AnomalyEventResponse])
def get_anomaly_events(device_id: str, limit: int = Query(50), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    events = db.query(AnomalyEvent).filter(AnomalyEvent.device_id == device_id).order_by(AnomalyEvent.id.desc()).limit(limit).all()
    return events

@router.get("/rul/{device_id}", response_model=RulPredictionResponse)
def get_device_rul(device_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rul = db.query(RulPrediction).filter(RulPrediction.device_id == device_id).first()
    if not rul:
        return {
            "device_id": device_id,
            "remaining_days": 45.0,
            "predicted_calibration_date": None,
            "drift_rate_daily": 0.05,
            "maintenance_priority": "LOW",
            "confidence_score": 0.95,
            "timestamp": None
        }
    return rul
