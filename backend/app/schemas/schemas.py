from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "Engineer"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Device Schemas
class DeviceBase(BaseModel):
    device_id: str
    name: str
    location: Optional[str] = "Industrial Plant Unit 1"
    sensor_type: Optional[str] = "Piezoresistive Digital + Transducer"
    reference_pressure_kpa: float = 101.325
    reference_temperature_c: float = 25.0
    reference_humidity_pct: float = 50.0
    drift_warn_threshold_kpa: float = 1.5
    drift_critical_threshold_kpa: float = 3.0
    max_offset_correction_kpa: float = 5.0
    max_gain_delta: float = 0.15
    auto_correct_enabled: bool = False
    is_demo: bool = True

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    reference_pressure_kpa: Optional[float] = None
    reference_temperature_c: Optional[float] = None
    reference_humidity_pct: Optional[float] = None
    drift_warn_threshold_kpa: Optional[float] = None
    drift_critical_threshold_kpa: Optional[float] = None
    max_offset_correction_kpa: Optional[float] = None
    max_gain_delta: Optional[float] = None
    auto_correct_enabled: Optional[bool] = None
    is_demo: Optional[bool] = None
    status: Optional[str] = None

class DeviceResponse(DeviceBase):
    id: int
    status: str
    created_at: datetime
    last_seen: datetime
    class Config:
        from_attributes = True

# Telemetry Schemas
class TelemetryCreate(BaseModel):
    device_id: str
    timestamp: Optional[datetime] = None
    digital_pressure: float
    analog_pressure: float
    temperature: float
    humidity: float
    reference_temperature: Optional[float] = 25.0
    health_status: Optional[str] = "GOOD"
    is_simulated: Optional[bool] = False

class TelemetryResponse(BaseModel):
    id: int
    device_id: str
    timestamp: datetime
    digital_pressure: float
    analog_pressure: float
    temperature: float
    humidity: float
    reference_temperature: float
    expected_pressure: Optional[float]
    residual: Optional[float]
    sensor_agreement: bool
    data_quality: str
    health_status: str
    is_simulated: bool
    class Config:
        from_attributes = True

# Digital Twin Schemas
class DigitalTwinModel(BaseModel):
    offset: float
    gain: float
    kT: float
    kH: float
    estimated_offset: float
    estimated_gain: float
    model_confidence: float
    updated_at: datetime
    class Config:
        from_attributes = True

class DigitalTwinUpdate(BaseModel):
    offset: Optional[float] = None
    gain: Optional[float] = None
    kT: Optional[float] = None
    kH: Optional[float] = None

# Drift & Anomaly Schemas
class DriftEventResponse(BaseModel):
    id: int
    device_id: str
    timestamp: datetime
    drift_status: str
    drift_magnitude: float
    drift_direction: str
    drift_rate: float
    detection_method: str
    residual_classification: str
    class Config:
        from_attributes = True

class AnomalyEventResponse(BaseModel):
    id: int
    device_id: str
    timestamp: datetime
    anomaly_score: float
    is_anomaly: bool
    method: str
    details: Optional[str]
    class Config:
        from_attributes = True

# RUL Prediction
class RulPredictionResponse(BaseModel):
    device_id: str
    remaining_days: float
    predicted_calibration_date: Optional[datetime]
    drift_rate_daily: float
    maintenance_priority: str
    confidence_score: float
    timestamp: datetime
    class Config:
        from_attributes = True

# Calibration
class CalibrationRequest(BaseModel):
    device_id: str
    level: Optional[str] = "L3 — Bounded Auto-Correct"
    manual_offset_delta: Optional[float] = None
    manual_gain_delta: Optional[float] = None

class CalibrationResponse(BaseModel):
    id: int
    device_id: str
    timestamp: datetime
    level: str
    measured_reading: float
    expected_reading: float
    residual_before: float
    residual_after: Optional[float]
    applied_offset_delta: float
    applied_gain_delta: float
    status: str
    retry_count: int
    responsible_user: str
    remarks: Optional[str]
    class Config:
        from_attributes = True

# Alerts
class AlertResponse(BaseModel):
    id: int
    device_id: str
    alert_type: str
    severity: str
    timestamp: datetime
    description: str
    probable_root_cause: Optional[str]
    recommended_action: Optional[str]
    resolution_status: str
    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    resolution_status: str # OPEN, ACKNOWLEDGED, RESOLVED

# Passport
class PassportEntryResponse(BaseModel):
    id: int
    passport_event_id: str
    device_id: str
    timestamp: datetime
    previous_offset: float
    updated_offset: float
    previous_gain: float
    updated_gain: float
    measured_reading: float
    expected_reading: float
    residual_before: float
    residual_after: float
    verification_result: str
    responsible_user: str
    previous_event_hash: str
    current_event_hash: str
    is_valid_hash: Optional[bool] = True
    class Config:
        from_attributes = True

# Overview Dashboard Stats
class DashboardKPIs(BaseModel):
    total_devices: int
    healthy_devices: int
    devices_under_watch: int
    devices_requiring_maintenance: int
    average_confidence_score: float
    pending_calibration: int
