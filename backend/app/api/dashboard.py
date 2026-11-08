from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Device, Alert, CalibrationEvent, DigitalTwinParameter, User
from app.schemas.schemas import DashboardKPIs

router = APIRouter(prefix="/dashboard", tags=["Main Overview Dashboard"])

@router.get("/kpis", response_model=DashboardKPIs)
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total = db.query(Device).count()
    healthy = db.query(Device).filter(Device.status == "ONLINE").count()
    under_watch = db.query(Device).filter(Device.status == "WARNING").count()
    requiring_maint = db.query(Device).filter(Device.status.in_(["ERROR", "MAINTENANCE"])).count()

    # Average confidence score across all twins
    avg_conf = db.query(func.avg(DigitalTwinParameter.model_confidence)).scalar() or 0.95

    # Pending calibration: open alerts of type 'Calibration required' or 'Persistent drift'
    pending_cal = db.query(Alert).filter(
        Alert.resolution_status == "OPEN",
        Alert.alert_type.in_(["Calibration required", "Persistent drift", "Unsafe correction attempt"])
    ).count()

    return {
        "total_devices": total,
        "healthy_devices": healthy,
        "devices_under_watch": under_watch,
        "devices_requiring_maintenance": requiring_maint,
        "average_confidence_score": round(float(avg_conf), 3),
        "pending_calibration": pending_cal
    }
