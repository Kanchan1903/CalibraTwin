from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Alert, User
from app.schemas.schemas import AlertResponse, AlertUpdate

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    device_id: str = Query(None),
    status: str = Query(None),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Alert)
    if device_id:
        q = q.filter(Alert.device_id == device_id)
    if status:
        q = q.filter(Alert.resolution_status == status)
    return q.order_by(Alert.id.desc()).limit(limit).all()

@router.put("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: int,
    upd: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolution_status = upd.resolution_status
    db.commit()
    db.refresh(alert)
    return alert
