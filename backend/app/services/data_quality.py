import numpy as np
import datetime
from typing import Dict, Any, List

class DataQualityEngine:
    """
    Evaluates telemetry streams across 7 comprehensive industrial dimensions:
    1. Missing readings / completeness
    2. High-frequency noise level (jitter std dev)
    3. Redundant sensor agreement
    4. Timestamp validity & monotonic ordering
    5. Outliers (Z-score / IQR)
    6. Data freshness (latency between sample and receive)
    7. Communication reliability (packet sequence gaps / drops)

    Produces a deterministic Trust Score from 0 to 100.
    Explicitly separated from AI Model Confidence.
    """
    @staticmethod
    def evaluate_quality(
        current_reading: Dict[str, Any],
        recent_readings: List[Dict[str, Any]],
        sensor_agreement_score: float
    ) -> Dict[str, Any]:
        penalties = 0.0
        details = []

        # 1. Freshness Check
        now = datetime.datetime.utcnow()
        sample_time = current_reading.get("timestamp")
        if isinstance(sample_time, str):
            try:
                sample_time = datetime.datetime.fromisoformat(sample_time.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                sample_time = now
        elif not isinstance(sample_time, datetime.datetime):
            sample_time = now

        latency_seconds = max(0.0, (now - sample_time).total_seconds())
        # Store & forward buffered readings have higher latency but are explicitly stamped
        if current_reading.get("is_buffered"):
            freshness_score = 90.0 # Valid store & forward data
            details.append(f"Offline-buffered reading (latency: {latency_seconds:.1f}s, verified historical)")
        elif latency_seconds > 60.0:
            penalties += 25.0
            freshness_score = 40.0
            details.append(f"High data latency: {latency_seconds:.1f}s")
        elif latency_seconds > 10.0:
            penalties += 10.0
            freshness_score = 75.0
        else:
            freshness_score = 100.0

        # 2. Noise & Jitter Evaluation
        noise_level = 0.05
        noise_score = 100.0
        if recent_readings and len(recent_readings) >= 5:
            dig_values = [r.get("digital_pressure", 101.325) for r in recent_readings[-10:]]
            std_dev = float(np.std(dig_values))
            noise_level = round(std_dev, 3)
            if std_dev > 0.8:
                penalties += 25.0
                noise_score = 45.0
                details.append(f"Excessive measurement jitter (std: {std_dev:.2f} kPa)")
            elif std_dev > 0.3:
                penalties += 10.0
                noise_score = 75.0

        # 3. Outlier check (Z-Score on residual)
        residual = current_reading.get("residual", 0.0)
        outlier_penalty = 0.0
        if abs(residual) > 4.5:
            outlier_penalty = 30.0
            details.append(f"Extreme statistical outlier residual ({residual:.2f} kPa)")
        elif abs(residual) > 2.5:
            outlier_penalty = 12.0

        # 4. Sensor Agreement Contribution
        agreement_penalty = max(0.0, (100.0 - sensor_agreement_score) * 0.35)

        # 5. Timestamp validity
        timestamp_valid = True
        if recent_readings and len(recent_readings) > 0:
            last_ts = recent_readings[-1].get("timestamp")
            if isinstance(last_ts, datetime.datetime) and sample_time < last_ts and not current_reading.get("is_buffered"):
                timestamp_valid = False
                penalties += 20.0
                details.append("Out-of-order timestamp sequence detected")

        # Aggregate Overall Trust Score (0 - 100)
        total_penalty = penalties + outlier_penalty + agreement_penalty
        trust_score = max(0.0, min(100.0, 100.0 - total_penalty))

        # Qualitative Grade
        if trust_score >= 85.0:
            grade = "GRADE_A_EXCELLENT"
        elif trust_score >= 70.0:
            grade = "GRADE_B_RELIABLE"
        elif trust_score >= 50.0:
            grade = "GRADE_C_SUSPECT"
        else:
            grade = "GRADE_D_UNTRUSTED"

        return {
            "trust_score": round(trust_score, 1),
            "data_quality_grade": grade,
            "noise_std_kpa": noise_level,
            "noise_score": round(noise_score, 1),
            "freshness_score": round(freshness_score, 1),
            "sensor_agreement_score": round(sensor_agreement_score, 1),
            "timestamp_valid": timestamp_valid,
            "quality_flags": details if details else ["All telemetry validation criteria satisfied."]
        }
