import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.uncertainty_engine import UncertaintyEstimationEngine
from app.services.hil_testing_engine import HILTestingEngine
from app.services.ota_service import FirmwareOTAManager
from app.services.time_sync import TimeSyncManager
from app.services.traceability_matrix import TraceabilityMatrix
from app.services.observability_service import ObservabilityService

client = TestClient(app)

def get_auth_token():
    res = client.post("/api/auth/login", json={"email": "admin@calibratwin.io", "password": "Admin@12345"})
    return res.json()["access_token"]

def test_uncertainty_estimation():
    residuals = [0.05, 0.08, -0.02, 0.09, 0.04, 0.06]
    unc = UncertaintyEstimationEngine.calculate_measurement_uncertainty(residuals)
    assert "combined_standard_uncertainty_uc" in unc
    assert "expanded_uncertainty_U" in unc
    assert unc["coverage_factor_k"] == 2.0
    assert unc["is_safe_for_calibration"] is True

def test_hil_testing_pipeline():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "device_id": "CALIBRA-ESP32-001",
        "physical_reading": {"digital_pressure": 101.40, "analog_pressure": 101.35, "temperature": 25.1, "humidity": 50.0},
        "simulated_reading": {"digital_pressure": 101.38},
        "test_condition": "Atmospheric Chamber Test"
    }
    res = client.post("/api/engineering/hil/run-test", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["validation_tier"] == "HARDWARE_VERIFIED"
    assert data["test_outcome"] == "PASS"
    assert "processing_and_transport_latency_ms" in data["performance_metrics"]

def test_ota_management():
    # Deploy version
    dep = FirmwareOTAManager.trigger_ota_update("CALIBRA-ESP32-001", "v2.4.0")
    assert dep["success"] is True
    assert dep["installed_version"] == "v2.4.0"

    # Rollback version
    rb = FirmwareOTAManager.rollback_firmware("CALIBRA-ESP32-001")
    assert rb["success"] is True
    assert rb["active_version"] == "v2.3.1"

def test_time_sync():
    sync = TimeSyncManager.inspect_and_sync(
        device_timestamp="2026-11-08T22:00:00Z",
        is_buffered=True
    )
    assert sync["is_buffered"] is True
    assert sync["sync_verdict"] == "PRESERVED_HISTORICAL_STORE_AND_FORWARD"

def test_production_observability():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/engineering/observability/health", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["backend_status"] == "HEALTHY"
    assert data["database"]["connected"] is True
    assert data["mqtt_broker"]["status"] == "OPERATIONAL"

def test_techgium_traceability():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/engineering/traceability", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["matrix"]) == 12
    # Verify all requirements are completed
    for item in data["matrix"]:
        assert item["status"] == "COMPLETED"
        assert item["validation_tier"] in ["HARDWARE_VERIFIED", "HARDWARE_AND_SIMULATION", "SIMULATION_VERIFIED", "EMPIRICAL_BENCHMARK", "PRODUCTION_VERIFIED"]
