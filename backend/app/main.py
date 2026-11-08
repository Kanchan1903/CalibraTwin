from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.models import User, Device, DigitalTwinParameter
from app.core.ws_manager import ws_manager
from app.services.mqtt_service import mqtt_service

# Import API routers
from app.api.auth import router as auth_router
from app.api.devices import router as devices_router
from app.api.telemetry import router as telemetry_router
from app.api.digital_twin_routes import router as dt_router
from app.api.analytics import router as analytics_router
from app.api.calibration import router as calibration_router
from app.api.alerts import router as alerts_router
from app.api.passport import router as passport_router
from app.api.dashboard import router as dashboard_router
from app.api.reports import router as reports_router
from app.api.simulator_routes import router as simulator_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CalibraTwinApp")

def init_db_and_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default users
        admin = db.query(User).filter(User.email == "admin@calibratwin.io").first()
        if not admin:
            admin = User(
                email="admin@calibratwin.io",
                hashed_password=get_password_hash("Admin@12345"),
                full_name="Lead Systems Architect",
                role="Administrator"
            )
            db.add(admin)

        engineer = db.query(User).filter(User.email == "engineer@calibratwin.io").first()
        if not engineer:
            engineer = User(
                email="engineer@calibratwin.io",
                hashed_password=get_password_hash("Engineer@123"),
                full_name="IoT Field Engineer",
                role="Engineer"
            )
            db.add(engineer)

        viewer = db.query(User).filter(User.email == "viewer@calibratwin.io").first()
        if not viewer:
            viewer = User(
                email="viewer@calibratwin.io",
                hashed_password=get_password_hash("Viewer@123"),
                full_name="Plant Operations Viewer",
                role="Viewer"
            )
            db.add(viewer)

        # Seed default demonstrator devices
        dev1 = db.query(Device).filter(Device.device_id == "CALIBRA-ESP32-001").first()
        if not dev1:
            dev1 = Device(
                device_id="CALIBRA-ESP32-001",
                name="Primary Header Pressure Sensor",
                location="Gas Pipeline Station A",
                sensor_type="Dual Piezoresistive Diaphragm (Digital + Analog)",
                reference_pressure_kpa=101.325,
                reference_temperature_c=25.0,
                reference_humidity_pct=50.0,
                drift_warn_threshold_kpa=1.5,
                drift_critical_threshold_kpa=3.0,
                max_offset_correction_kpa=5.0,
                auto_correct_enabled=True,
                status="ONLINE",
                is_demo=True
            )
            db.add(dev1)
            db.commit()

            dt_param1 = DigitalTwinParameter(
                device_id="CALIBRA-ESP32-001",
                offset=0.0,
                gain=0.0,
                kT=0.02,
                kH=0.005,
                estimated_offset=0.0,
                estimated_gain=0.0,
                model_confidence=0.98
            )
            db.add(dt_param1)

        dev2 = db.query(Device).filter(Device.device_id == "CALIBRA-ESP32-002").first()
        if not dev2:
            dev2 = Device(
                device_id="CALIBRA-ESP32-002",
                name="Secondary Steam Line Sensor",
                location="Boiler Feed Unit 2",
                sensor_type="Ceramic Capacitive Pressure Cell",
                reference_pressure_kpa=100.0,
                reference_temperature_c=28.0,
                reference_humidity_pct=55.0,
                drift_warn_threshold_kpa=1.5,
                drift_critical_threshold_kpa=3.0,
                max_offset_correction_kpa=5.0,
                auto_correct_enabled=False,
                status="ONLINE",
                is_demo=True
            )
            db.add(dev2)
            db.commit()

            dt_param2 = DigitalTwinParameter(
                device_id="CALIBRA-ESP32-002",
                offset=0.0,
                gain=0.0,
                kT=0.02,
                kH=0.005,
                estimated_offset=0.0,
                estimated_gain=0.0,
                model_confidence=0.98
            )
            db.add(dt_param2)

        db.commit()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting CalibraTwin Backend Engine...")
    init_db_and_seed()
    mqtt_service.start()
    yield
    # Shutdown
    logger.info("Shutting down CalibraTwin Backend Engine...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent IoT Sensor Monitoring, Drift Detection and Predictive Self-Calibration Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(devices_router, prefix=settings.API_V1_STR)
app.include_router(telemetry_router, prefix=settings.API_V1_STR)
app.include_router(dt_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(calibration_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(passport_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(simulator_router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
def health_check():
    db_ok = True
    try:
        db = SessionLocal()
        db.execute(Base.metadata.tables["users"].select().limit(1))
        db.close()
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database_connected": db_ok,
        "mqtt_connected": mqtt_service.is_connected,
        "service": "CalibraTwin API v1.0.0"
    }

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
