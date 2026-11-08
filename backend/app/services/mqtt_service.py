import json
import logging
import ssl
from typing import Optional
import paho.mqtt.client as mqtt
from app.core.config import settings
from app.core.database import SessionLocal
from app.services.telemetry_service import TelemetryService

logger = logging.getLogger("CalibraTwinMQTT")

class MQTTService:
    def __init__(self):
        self.client: Optional[mqtt.Client] = None
        self.is_connected = False
        self.telemetry_service = TelemetryService()

    def on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.is_connected = True
            logger.info("Connected to MQTT Broker!")
            # Subscribe to all device telemetry and status topics
            client.subscribe("calibratwin/devices/+/telemetry")
            client.subscribe("calibratwin/devices/+/status")
        else:
            logger.error(f"MQTT Connection failed with return code {rc}")

    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            topic = msg.topic
            logger.info(f"Received MQTT topic {topic}: {payload}")

            # Topic pattern: calibratwin/devices/{device_id}/telemetry
            parts = topic.split("/")
            if len(parts) >= 4 and parts[3] == "telemetry":
                device_id = parts[2]
                db = SessionLocal()
                try:
                    self.telemetry_service.process_incoming_telemetry(
                        db=db,
                        device_id=device_id,
                        digital_pressure=float(payload.get("digital_pressure", 101.325)),
                        analog_pressure=float(payload.get("analog_pressure", 101.325)),
                        temperature=float(payload.get("temperature", 25.0)),
                        humidity=float(payload.get("humidity", 50.0)),
                        ref_temp=float(payload.get("reference_temperature", 25.0)),
                        is_simulated=False
                    )
                finally:
                    db.close()
        except Exception as e:
            logger.error(f"Error handling MQTT message: {str(e)}")

    def start(self):
        if not settings.MQTT_ENABLED:
            logger.info("MQTT disabled via configuration.")
            return

        try:
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="CalibraTwinBackend")
            if settings.MQTT_USER and settings.MQTT_PASSWORD:
                self.client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASSWORD)
            
            if settings.MQTT_TLS:
                self.client.tls_set(cert_reqs=ssl.CERT_REQUIRED)

            self.client.on_connect = self.on_connect
            self.client.on_message = self.on_message

            self.client.connect_async(settings.MQTT_BROKER, settings.MQTT_PORT, 60)
            self.client.loop_start()
            logger.info(f"MQTT client started pointing to {settings.MQTT_BROKER}:{settings.MQTT_PORT}")
        except Exception as e:
            logger.error(f"Failed to start MQTT service: {str(e)}")

    def publish_calibration_command(self, device_id: str, offset: float, gain: float):
        if not self.client or not self.is_connected:
            return False
        topic = f"calibratwin/devices/{device_id}/calibration"
        payload = json.dumps({"offset_correction": offset, "gain_multiplier": 1.0 + gain})
        self.client.publish(topic, payload)
        return True

mqtt_service = MQTTService()
