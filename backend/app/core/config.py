from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "CalibraTwin"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "calibratwin-super-secret-production-key-92834710293")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database configuration
    # By default, use sqlite for local/demo if Postgres is not configured, or PostgreSQL url
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./calibratwin.db")

    # MQTT configuration
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "broker.emqx.io")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_USER: Optional[str] = os.getenv("MQTT_USER", None)
    MQTT_PASSWORD: Optional[str] = os.getenv("MQTT_PASSWORD", None)
    MQTT_TLS: bool = os.getenv("MQTT_TLS", "false").lower() == "true"
    MQTT_ENABLED: bool = os.getenv("MQTT_ENABLED", "false").lower() == "true"

    # Calibration safety bounds
    MAX_CALIBRATION_OFFSET_KPA: float = 5.0
    MAX_CALIBRATION_GAIN_DELTA: float = 0.15
    MAX_RETRY_COUNT: int = 2

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
