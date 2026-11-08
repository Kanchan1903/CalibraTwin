import datetime
from typing import Dict, Any

class PredictiveMaintenanceService:
    @staticmethod
    def calculate_rul(
        current_drift: float,
        drift_rate_per_hour: float,
        critical_threshold: float = 3.0,
        model_confidence: float = 0.95
    ) -> Dict[str, Any]:
        """
        Calculates Remaining Useful Life (RUL) before critical calibration limit is breached.
        """
        abs_drift = abs(current_drift)
        margin_remaining = max(0.0, critical_threshold - abs_drift)
        drift_rate_abs = abs(drift_rate_per_hour)

        # Baseline drift rate if currently near-zero (e.g. 0.005 kPa/hr typical aging)
        effective_rate = max(drift_rate_abs, 0.005)
        
        remaining_hours = margin_remaining / effective_rate
        remaining_days = round(remaining_hours / 24.0, 1)

        # Prevent unrealistically large or negative numbers
        remaining_days = min(180.0, max(0.5, remaining_days))

        predicted_date = datetime.datetime.utcnow() + datetime.timedelta(days=remaining_days)

        # Priority calculation
        if remaining_days < 3.0 or abs_drift >= critical_threshold * 0.9:
            priority = "CRITICAL"
        elif remaining_days < 10.0:
            priority = "HIGH"
        elif remaining_days < 25.0:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        confidence = round(max(0.65, min(0.98, model_confidence * 0.95)), 2)

        return {
            "remaining_days": remaining_days,
            "predicted_calibration_date": predicted_date,
            "drift_rate_daily": round(effective_rate * 24.0, 4),
            "maintenance_priority": priority,
            "confidence_score": confidence
        }
