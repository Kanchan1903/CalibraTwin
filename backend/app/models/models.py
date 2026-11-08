import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="Engineer") # Administrator, Engineer, Viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255), default="Industrial Plant Unit 1")
    sensor_type = Column(String(100), default="Piezoresistive Digital + Transducer")
    reference_pressure_kpa = Column(Float, default=101.325)
    reference_temperature_c = Column(Float, default=25.0)
    reference_humidity_pct = Column(Float, default=50.0)
    
    # Drift thresholds
    drift_warn_threshold_kpa = Column(Float, default=1.5)
    drift_critical_threshold_kpa = Column(Float, default=3.0)
    
    # Safety Limits
    max_offset_correction_kpa = Column(Float, default=5.0)
    max_gain_delta = Column(Float, default=0.15)
    auto_correct_enabled = Column(Boolean, default=False)
    
    # Status
    status = Column(String(50), default="ONLINE") # ONLINE, OFFLINE, WARNING, ERROR
    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    telemetries = relationship("Telemetry", back_populates="device", cascade="all, delete-orphan")
    digital_twin_param = relationship("DigitalTwinParameter", back_populates="device", uselist=False, cascade="all, delete-orphan")
    drift_events = relationship("DriftEvent", back_populates="device", cascade="all, delete-orphan")
    anomaly_events = relationship("AnomalyEvent", back_populates="device", cascade="all, delete-orphan")
    calibrations = relationship("CalibrationEvent", back_populates="device", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")
    passport_entries = relationship("CalibrationPassport", back_populates="device", cascade="all, delete-orphan")

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), ForeignKey("devices.device_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    digital_pressure = Column(Float, nullable=False)
    analog_pressure = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    reference_temperature = Column(Float, default=25.0)
    
    expected_pressure = Column(Float, nullable=True)
    residual = Column(Float, nullable=True) # digital_pressure - expected_pressure
    sensor_agreement = Column(Boolean, default=True)
    data_quality = Column(String(50), default="GOOD") # GOOD, SUSPECT, INVALID
    health_status = Column(String(50), default="GOOD")
    is_simulated = Column(Boolean, default=False)

    device = relationship("Device", back_populates="telemetries")

    __table_args__ = (
        Index("idx_device_timestamp", "device_id", "timestamp"),
    )

class DigitalTwinParameter(Base):
    __tablename__ = "digital_twin_parameters"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), ForeignKey("devices.device_id"), unique=True, nullable=False)
    
    # Model: Expected = True_value * (1 + gain) + offset + kT * dT + kH * dH
    offset = Column(Float, default=0.0)
    gain = Column(Float, default=0.0)
    kT = Column(Float, default=0.02) # Temperature coefficient (kPa / °C)
    kH = Column(Float, default=0.005) # Humidity coefficient (kPa / %RH)
    
    # EKF estimated state
    estimated_offset = Column(Float, default=0.0)
    estimated_gain = Column(Float, default=0.0)
    model_confidence = Column(Float, default=0.98) # 0.0 - 1.0
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    device = relationship("Device", back_populates="digital_twin_param")

class DriftEvent(Base):
    __tablename__ = "drift_events"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), ForeignKey("devices.device_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    drift_status = Column(String(50), nullable=False) # NORMAL, DRIFT_DETECTED, CRITICAL_DRIFT
    drift_magnitude = Column(Float, nullable=False) # In kPa
    drift_direction = Column(String(20), default="POSITIVE") # POSITIVE, NEGATIVE, STABLE
    drift_rate = Column(Float, default=0.0) # kPa per hour
    detection_method = Column(String(50), default="CUSUM + EWMA") # EWMA, CUSUM, ChangePoint
    residual_classification = Column(String(50), default="Noise") # Noise, Environment, Real Drift, Fault
    
    device = relationship("Device", back_populates="drift_events")

class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), ForeignKey("devices.device_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    anomaly_score = Column(Float, nullable=False) # e.g. from Isolation Forest
    is_anomaly = Column(Boolean, default=True)
    method = Column(String(50), default="Isolation Forest")
    details = Column(Text, nullable=True)

    device = relationship("Device", back_populates="anomaly_events")

class RulPrediction(Base):
    __tablename__ = "rul_predictions"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), ForeignKey("devices.device_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    remaining_days = Column(Float, nullable=False)
    predicted_calibration_date = Column(DateTime, nullable=True)
    drift_rate_daily = Column(Float, default=0.0)
    maintenance_priority = Column(String(50), default="NORMAL") # LOW, MEDIUM, HIGH, CRITICAL
    confidence_score = Column(Float, default=0.90)

class CalibrationEvent(Base):
    __tablename__ = "calibration_events"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), ForeignKey("devices.device_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    level = Column(String(50), default="L3 — Bounded Auto-Correct") # L0, L1, L2, L3
    measured_reading = Column(Float, nullable=False)
    expected_reading = Column(Float, nullable=False)
    residual_before = Column(Float, nullable=False)
    residual_after = Column(Float, nullable=True)
    
    applied_offset_delta = Column(Float, default=0.0)
    applied_gain_delta = Column(Float, default=0.0)
    
    status = Column(String(50), default="SUCCESS") # SUCCESS, ROLLED_BACK, FAILED
    retry_count = Column(Integer, default=0)
    responsible_user = Column(String(100), default="System Auto-Engine")
    remarks = Column(Text, nullable=True)

    device = relationship("Device", back_populates="calibrations")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), ForeignKey("devices.device_id"), index=True, nullable=False)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(50), default="Medium") # Low, Medium, High, Critical
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    description = Column(Text, nullable=False)
    probable_root_cause = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    resolution_status = Column(String(50), default="OPEN") # OPEN, ACKNOWLEDGED, RESOLVED

    device = relationship("Device", back_populates="alerts")

class CalibrationPassport(Base):
    __tablename__ = "calibration_passport"

    id = Column(Integer, primary_key=True, index=True)
    passport_event_id = Column(String(64), unique=True, index=True, nullable=False)
    device_id = Column(String(100), ForeignKey("devices.device_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    previous_offset = Column(Float, nullable=False)
    updated_offset = Column(Float, nullable=False)
    previous_gain = Column(Float, nullable=False)
    updated_gain = Column(Float, nullable=False)
    
    measured_reading = Column(Float, nullable=False)
    expected_reading = Column(Float, nullable=False)
    residual_before = Column(Float, nullable=False)
    residual_after = Column(Float, nullable=False)
    
    verification_result = Column(String(50), default="VERIFIED_PASS") # VERIFIED_PASS, VERIFIED_FAIL
    responsible_user = Column(String(100), nullable=False)
    
    previous_event_hash = Column(String(64), nullable=False)
    current_event_hash = Column(String(64), nullable=False)

    device = relationship("Device", back_populates="passport_entries")
