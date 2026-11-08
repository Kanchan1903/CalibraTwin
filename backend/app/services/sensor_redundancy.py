import numpy as np
import datetime
from typing import Dict, Any, List, Optional

class SensorDiagnosticsEngine:
    """
    Sensor Redundancy & Cross-Validation Engine:
    - Primary digital pressure (BMP280/BME280)
    - Redundant analog pressure transducer (ADS1115 / ADC)
    - Reference temperature (TMP117)
    - Environmental sensor (BME280)
    
    Detects:
    1. Sensor disagreement (|digital - analog| > tolerance)
    2. Stuck-at readings (identical values over window)
    3. Out-of-range physical values
    4. Sudden measurement jumps (gradient violation)
    5. Missing / corrupted readings
    6. Sensor degradation
    """
    @staticmethod
    def cross_validate(
        digital_p: float,
        analog_p: float,
        temp_c: float,
        hum_pct: float,
        history: List[Dict[str, Any]] = None,
        pressure_range: tuple = (80.0, 125.0),
        temp_range: tuple = (-20.0, 85.0),
        hum_range: tuple = (5.0, 98.0)
    ) -> Dict[str, Any]:
        faults = []
        unreliable_sensors = []
        
        # 1. Physical Out-of-Range Checks
        if not (pressure_range[0] <= digital_p <= pressure_range[1]):
            faults.append(f"Digital pressure {digital_p:.2f} kPa is physically out-of-range [{pressure_range[0]}, {pressure_range[1]}]")
            unreliable_sensors.append("Primary Digital Sensor (BMP280)")

        if not (pressure_range[0] <= analog_p <= pressure_range[1]):
            faults.append(f"Analog pressure {analog_p:.2f} kPa is physically out-of-range [{pressure_range[0]}, {pressure_range[1]}]")
            unreliable_sensors.append("Redundant Analog Transducer (ADS1115)")

        if not (temp_range[0] <= temp_c <= temp_range[1]):
            faults.append(f"Temperature {temp_c:.1f}°C is out-of-bounds")
            unreliable_sensors.append("Reference Temperature Sensor (TMP117)")

        if not (hum_range[0] <= hum_pct <= hum_range[1]):
            faults.append(f"Humidity {hum_pct:.1f}% is out-of-bounds")
            unreliable_sensors.append("Environmental Humidity Sensor (BME280)")

        # 2. Sensor Redundancy Disagreement
        diff_p = abs(digital_p - analog_p)
        is_agreement = (diff_p <= 1.25) # 1.25 kPa nominal agreement band
        if not is_agreement:
            faults.append(f"Sensor redundancy mismatch: Digital ({digital_p:.2f} kPa) vs Analog ({analog_p:.2f} kPa) Δ={diff_p:.2f} kPa")
            # If digital is outside normal atmospheric window while analog is nominal, pin digital
            if abs(digital_p - 101.325) > abs(analog_p - 101.325) + 1.0:
                unreliable_sensors.append("Primary Digital Sensor (Potential Drift/Leak)")
            else:
                unreliable_sensors.append("Redundant Analog Transducer (Drift or Calibration needed)")

        # 3. History-based checks (Stuck-at, sudden jumps)
        is_stuck = False
        is_jump = False
        if history and len(history) >= 4:
            recent_dig = [h.get("digital_pressure", digital_p) for h in history[-4:]]
            if max(recent_dig) - min(recent_dig) < 0.0001:
                is_stuck = True
                faults.append("Stuck-at reading detected on digital sensor: 4+ identical readings")
                unreliable_sensors.append("Primary Digital Sensor (Frozen ADC/I2C)")

            last_reading = history[-1].get("digital_pressure", digital_p)
            if abs(digital_p - last_reading) > 5.0:
                is_jump = True
                faults.append(f"Sudden gradient jump detected: {last_reading:.2f} kPa -> {digital_p:.2f} kPa")
                unreliable_sensors.append("Primary Digital Sensor (Step Transient)")

        # Deduplicate unreliable sensors
        unreliable_sensors = list(dict.fromkeys(unreliable_sensors))

        # Sensor Agreement Score (0 - 100%)
        # Base 100, drops smoothly with difference
        agreement_score = max(0.0, min(100.0, 100.0 - (diff_p * 28.0)))
        if faults:
            agreement_score = min(agreement_score, 60.0 if not is_stuck else 20.0)

        diagnosis = "Nominal redundant agreement between digital and analog channels."
        if faults:
            diagnosis = " ; ".join(faults)

        return {
            "sensor_agreement": is_agreement,
            "sensor_agreement_score": round(agreement_score, 1),
            "difference_kpa": round(diff_p, 3),
            "is_stuck": is_stuck,
            "is_jump": is_jump,
            "faults": faults,
            "unreliable_sensors": unreliable_sensors,
            "cross_validation_diagnosis": diagnosis
        }
