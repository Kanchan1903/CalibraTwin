from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Telemetry, User
from app.schemas.schemas import TelemetryCreate, TelemetryResponse
from app.services.telemetry_service import TelemetryService

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])
telemetry_service = TelemetryService()

@router.post("", response_model=dict)
def ingest_telemetry(payload: TelemetryCreate, db: Session = Depends(get_db)):
    result = telemetry_service.process_incoming_telemetry(
        db=db,
        device_id=payload.device_id,
        digital_pressure=payload.digital_pressure,
        analog_pressure=payload.analog_pressure,
        temperature=payload.temperature,
        humidity=payload.humidity,
        ref_temp=payload.reference_temperature or 25.0,
        is_simulated=payload.is_simulated or False
    )
    return result

@router.get("/{device_id}", response_model=List[TelemetryResponse])
def get_device_telemetry(
    device_id: str,
    hours: Optional[int] = Query(24, description="Hours of telemetry history"),
    limit: Optional[int] = Query(100, description="Max telemetry records"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    since = datetime.datetime.utcnow() - datetime.timedelta(hours=hours)
    telemetries = db.query(Telemetry).filter(
        Telemetry.device_id == device_id,
        Telemetry.timestamp >= since
    ).order_by(Telemetry.timestamp.desc()).limit(limit).all()
    return list(reversed(telemetries))
