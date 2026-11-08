import random
import math
from typing import Dict, Any

class SensorSimulator:
    """
    Realistic pressure sensor simulation engine:
    Supports 10 fault & behavior modes:
    1. Normal operation
    2. Gradual offset drift
    3. Gain drift
    4. Temperature variation
    5. Humidity variation
    6. Sudden sensor fault (spike / step change)
    7. Noisy sensor
    8. Wi-Fi disconnection / missing data
    9. Successful calibration state
    10. Failed calibration / unstable sensor
    """
    def __init__(self, base_pressure: float = 101.325, base_temp: float = 25.0, base_hum: float = 50.0):
        self.base_pressure = base_pressure
        self.base_temp = base_temp
        self.base_hum = base_hum
        self.step_counter = 0

        # Injected states
        self.offset_drift = 0.0
        self.gain_drift = 0.0
        self.is_disconnected = False

    def generate_reading(self, mode: str = "normal") -> Dict[str, Any]:
        self.step_counter += 1
        t = self.step_counter

        # Base physical pressure oscillation (atmospheric micro-fluctuations)
        true_pressure = self.base_pressure + 0.15 * math.sin(t * 0.1)

        # Ambient temperature & humidity cycles
        temp = self.base_temp + 2.0 * math.sin(t * 0.05)
        hum = self.base_hum + 5.0 * math.cos(t * 0.04)
        ref_temp = self.base_temp

        noise_std = 0.05

        if mode == "normal":
            # Very small natural aging
            self.offset_drift += 0.001
        elif mode == "offset_drift":
            # Gradual positive drift accumulating
            self.offset_drift += 0.08
        elif mode == "gain_drift":
            self.gain_drift += 0.004
        elif mode == "temperature_variation":
            temp = self.base_temp + 15.0 * math.sin(t * 0.2)
        elif mode == "humidity_variation":
            hum = self.base_hum + 30.0 * math.sin(t * 0.2)
        elif mode == "sudden_fault":
            true_pressure += 4.5 # Step jump fault
        elif mode == "noisy_sensor":
            noise_std = 0.95 # High jitter
        elif mode == "wifi_disconnection":
            self.is_disconnected = True
            return {"disconnected": True}
        elif mode == "successful_calibration":
            self.offset_drift = 0.02
            self.gain_drift = 0.0
        elif mode == "failed_calibration":
            self.offset_drift = 3.8 # Unstable residual

        # Calculate digital sensor reading
        noise = random.gauss(0, noise_std)
        dT = temp - ref_temp
        dH = hum - self.base_hum

        # Sensor physical physics response
        digital_val = (true_pressure * (1.0 + self.gain_drift)) + self.offset_drift + (0.02 * dT) + (0.005 * dH) + noise

        # Analog redundant sensor: reads true pressure independently with standard analog noise
        analog_noise = random.gauss(0, 0.08)
        analog_val = true_pressure + analog_noise

        return {
            "digital_pressure": round(digital_val, 3),
            "analog_pressure": round(analog_val, 3),
            "temperature": round(temp, 2),
            "humidity": round(hum, 2),
            "reference_temperature": ref_temp,
            "mode": mode,
            "offset_drift": round(self.offset_drift, 3),
            "gain_drift": round(self.gain_drift, 4)
        }
