import random
import math
from typing import Dict, Any

class SensorSimulator:
    """
    Advanced Industrial Simulation Engine supporting all 12 rigorous demonstration scenarios:
    1. Normal sensor operation
    2. Gradual offset drift
    3. Gain drift
    4. Temperature-induced variation
    5. Humidity-induced variation
    6. Sudden sensor fault (step jump)
    7. Sensor noise (high jitter)
    8. Primary and redundant sensor disagreement
    9. Wi-Fi disconnection / offline telemetry buffering
    10. Successful self-calibration
    11. Failed self-calibration (unstable / out-of-tolerance)
    12. Recovery after rollback
    """
    def __init__(self, base_pressure: float = 101.325, base_temp: float = 25.0, base_hum: float = 50.0):
        self.base_pressure = base_pressure
        self.base_temp = base_temp
        self.base_hum = base_hum
        self.step_counter = 0

        # Internal simulation states
        self.offset_drift = 0.0
        self.gain_drift = 0.0
        self.is_disconnected = False
        self.offline_buffer_count = 0
        self.has_rolled_back = False

    def generate_reading(self, mode: str = "normal") -> Dict[str, Any]:
        self.step_counter += 1
        t = self.step_counter

        # Base atmospheric physical pressure oscillation
        true_pressure = self.base_pressure + 0.12 * math.sin(t * 0.1)

        temp = self.base_temp + 2.0 * math.sin(t * 0.05)
        hum = self.base_hum + 4.0 * math.cos(t * 0.04)
        ref_temp = self.base_temp

        noise_std = 0.04
        analog_drift = 0.0
        is_stuck = False
        jump_fault = 0.0

        # Scenario 1: Normal
        if mode == "normal":
            self.offset_drift = max(0.01, self.offset_drift * 0.95)
            self.gain_drift = 0.0

        # Scenario 2: Gradual offset drift
        elif mode == "offset_drift":
            self.offset_drift += 0.09

        # Scenario 3: Gain drift
        elif mode == "gain_drift":
            self.gain_drift += 0.005

        # Scenario 4: Temperature variation
        elif mode == "temperature_variation":
            temp = self.base_temp + 16.0 * math.sin(t * 0.25)

        # Scenario 5: Humidity variation
        elif mode == "humidity_variation":
            hum = self.base_hum + 32.0 * math.sin(t * 0.25)

        # Scenario 6: Sudden sensor fault
        elif mode == "sudden_fault":
            jump_fault = 5.2 # Abrupt diaphragm step fault

        # Scenario 7: Sensor noise
        elif mode == "sensor_noise" or mode == "noisy_sensor":
            noise_std = 0.98

        # Scenario 8: Primary and redundant sensor disagreement
        elif mode == "sensor_disagreement":
            # Digital sensor reads higher while analog transducer reads nominal
            self.offset_drift = 3.2
            analog_drift = -0.1

        # Scenario 9: Wi-Fi disconnection & store-and-forward buffering
        elif mode == "wifi_disconnection":
            self.is_disconnected = True
            self.offline_buffer_count += 1
            return {
                "disconnected": True,
                "offline_buffer_count": self.offline_buffer_count,
                "device_id": "CALIBRA-ESP32-001",
                "message": f"Device offline. Storing reading in local flash ring buffer ({self.offline_buffer_count} readings queued)."
            }

        # Scenario 10: Successful self-calibration
        elif mode == "successful_calibration":
            self.offset_drift = 0.02
            self.gain_drift = 0.0005

        # Scenario 11: Failed self-calibration
        elif mode == "failed_calibration":
            self.offset_drift = 3.95 # Residual after calibration is still unacceptably high

        # Scenario 12: Recovery after rollback
        elif mode == "recovery_after_rollback":
            self.has_rolled_back = True
            self.offset_drift = 0.05
            self.gain_drift = 0.0

        # Physical calculations
        noise = random.gauss(0, noise_std)
        dT = temp - ref_temp
        dH = hum - self.base_hum

        # Primary Digital Sensor calculation
        digital_val = (true_pressure * (1.0 + self.gain_drift)) + self.offset_drift + jump_fault + (0.02 * dT) + (0.005 * dH) + noise

        # Redundant Analog Transducer calculation
        analog_noise = random.gauss(0, 0.06)
        analog_val = (true_pressure + analog_drift) + analog_noise

        return {
            "digital_pressure": round(digital_val, 3),
            "analog_pressure": round(analog_val, 3),
            "temperature": round(temp, 2),
            "humidity": round(hum, 2),
            "reference_temperature": ref_temp,
            "mode": mode,
            "offset_drift": round(self.offset_drift, 3),
            "gain_drift": round(self.gain_drift, 4),
            "offline_buffer_count": self.offline_buffer_count
        }
