import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.digital_twin import DigitalTwinEngine
from app.services.drift_analytics import DriftAnalyticsService
from app.services.rul_engine import PredictiveMaintenanceService
from app.services.passport_service import PassportSecurityService

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_login_demo():
    res = client.post("/api/auth/login", json={
        "email": "admin@calibratwin.io",
        "password": "Admin@12345"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "Administrator"

def test_digital_twin_formula_and_ekf():
    dt = DigitalTwinEngine(offset=0.5, gain=0.01, kT=0.02, kH=0.005)
    # Expected reading = 100 * (1 + 0.01) + 0.5 + 0.02 * (30-25) + 0.005 * (60-50)
    # = 101.0 + 0.5 + 0.10 + 0.05 = 101.65
    val = dt.calculate_expected(true_value=100.0, temperature=30.0, humidity=60.0)
    assert pytest.approx(val, 0.01) == 101.65

    # Test EKF state update
    res = dt.ekf_update(measured=102.5, true_value=100.0, temperature=30.0, humidity=60.0)
    assert "estimated_offset" in res
    assert "model_confidence" in res
    assert res["model_confidence"] > 0.5

def test_drift_analytics_ewma_cusum():
    analytics = DriftAnalyticsService()
    # Residuals with an upward drift
    residuals = [0.1, 0.15, 0.2, 0.4, 0.8, 1.2, 1.8, 2.3, 2.9]
    ewma = analytics.calculate_ewma(residuals)
    assert len(ewma) == len(residuals)
    assert ewma[-1] > ewma[0]

    s_pos, s_neg, drift_flag = analytics.calculate_cusum(residuals, threshold=1.0)
    assert drift_flag is True

def test_rul_prediction():
    rul = PredictiveMaintenanceService.calculate_rul(
        current_drift=1.5,
        drift_rate_per_hour=0.02,
        critical_threshold=3.0
    )
    assert rul["remaining_days"] > 0
    assert rul["maintenance_priority"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def test_passport_sha256_verification():
    h1 = PassportSecurityService.compute_event_hash(
        previous_hash=PassportSecurityService.GENESIS_HASH,
        device_id="CALIBRA-ESP32-001",
        timestamp_iso="2026-11-08T12:00:00",
        previous_offset=0.0,
        updated_offset=-1.2,
        previous_gain=0.0,
        updated_gain=0.0,
        residual_before=1.2,
        residual_after=0.0,
        responsible_user="Lead Engineer"
    )
    assert len(h1) == 64 # SHA-256 hex length
