import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.sensor_redundancy import SensorDiagnosticsEngine
from app.services.data_quality import DataQualityEngine
from app.services.xai_engine import ExplainableAIEngine
from app.services.benchmarking import BenchmarkingEngine

client = TestClient(app)

def get_auth_token():
    res = client.post("/api/auth/login", json={"email": "admin@calibratwin.io", "password": "Admin@12345"})
    return res.json()["access_token"]

def test_sensor_redundancy_and_cross_validation():
    # 1. Nominal matching
    nom = SensorDiagnosticsEngine.cross_validate(101.4, 101.35, 25.0, 50.0)
    assert nom["sensor_agreement"] is True
    assert nom["sensor_agreement_score"] >= 95.0

    # 2. Severe discrepancy (> 1.25 kPa)
    diff = SensorDiagnosticsEngine.cross_validate(105.8, 101.2, 25.0, 50.0)
    assert diff["sensor_agreement"] is False
    assert len(diff["unreliable_sensors"]) > 0

    # 3. Stuck-at detection
    history = [{"digital_pressure": 101.325} for _ in range(5)]
    stuck = SensorDiagnosticsEngine.cross_validate(101.325, 101.325, 25.0, 50.0, history=history)
    assert stuck["is_stuck"] is True
    assert "Stuck-at reading" in stuck["cross_validation_diagnosis"]

def test_data_quality_and_trust_score():
    current = {"digital_pressure": 101.4, "residual": 0.05, "is_buffered": False}
    recent = [{"digital_pressure": 101.38 + i * 0.005} for i in range(10)]
    dq = DataQualityEngine.evaluate_quality(current, recent, sensor_agreement_score=98.0)
    assert dq["trust_score"] >= 80.0
    assert dq["data_quality_grade"] in ["GRADE_A_EXCELLENT", "GRADE_B_RELIABLE"]

def test_explainable_ai_reasoning():
    explanation = ExplainableAIEngine.explain_drift_decision(
        residual=1.85,
        cusum_detected=True,
        cusum_val=1.42,
        cusum_threshold=1.20,
        ewma_slope=0.08,
        dT=1.2,
        dH=3.0,
        confidence=0.92,
        classification="Real Drift",
        sensor_agreement=True
    )
    assert "Drift detected because residual increased consistently" in explanation["detection_reason"]
    assert "CUSUM" in explanation["algorithm_used"]
    assert "CUSUM Statistic" in explanation["threshold_crossed"]
    assert explanation["confidence_score"] == 0.92
    assert "Residual Shift (Offset/Gain)" in explanation["feature_importance"]

def test_benchmarking_suite():
    bench = BenchmarkingEngine.run_benchmark_suite(sample_size=100)
    assert "comparison" in bench
    assert len(bench["comparison"]) == 8
    # CalibraTwin combined approach should have 0.0% false alarms on thermal swings
    fa_metric = next(item for item in bench["comparison"] if "False Alarm" in item["metric"])
    assert fa_metric["calibratwin_combined"] == 0.0

def test_end_to_end_12_scenarios():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Test Scenario 1: Normal
    res1 = client.post("/api/simulator/run-scenario", json={"device_id": "CALIBRA-ESP32-001", "scenario_id": 1}, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["scenario_name"] == "Normal Sensor Operation"

    # Test Scenario 6: Sudden Sensor Fault
    res6 = client.post("/api/simulator/run-scenario", json={"device_id": "CALIBRA-ESP32-001", "scenario_id": 6}, headers=headers)
    assert res6.status_code == 200
    assert res6.json()["pipeline_stages"]["5_drift_detection_cusum"]["residual_classification"] == "Fault"

    # Test Scenario 9: Wi-Fi Disconnection & Store-and-forward buffering
    res9 = client.post("/api/simulator/run-scenario", json={"device_id": "CALIBRA-ESP32-001", "scenario_id": 9}, headers=headers)
    assert res9.status_code == 200
    assert res9.json()["pipeline_stages"]["twin_sync"]["status"] == "OFFLINE"
