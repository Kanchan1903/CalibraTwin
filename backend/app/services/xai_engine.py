import numpy as np
from typing import Dict, Any, List

class ExplainableAIEngine:
    """
    Explainable AI (XAI) Engine for CalibraTwin:
    Every AI-generated diagnostic or calibration recommendation provides:
    1. Human-interpretable Detection Reason
    2. Primary Algorithm used (CUSUM, EWMA, EKF, IsolationForest, Linear-RUL)
    3. Input measurements & Feature Importance (Shapley-style proxy weights)
    4. Exact Threshold crossed
    5. Quantitative Confidence score
    6. Safe Prescribed Next Action
    """
    @staticmethod
    def explain_drift_decision(
        residual: float,
        cusum_detected: bool,
        cusum_val: float,
        cusum_threshold: float,
        ewma_slope: float,
        dT: float,
        dH: float,
        confidence: float,
        classification: str,
        sensor_agreement: bool
    ) -> Dict[str, Any]:
        # Feature Importance decomposition (proxy SHAP attribution)
        # Total impact sum
        t_impact = abs(dT * 0.02)
        h_impact = abs(dH * 0.005)
        drift_impact = abs(residual) - (t_impact + h_impact)
        drift_impact = max(0.001, drift_impact)

        denom = t_impact + h_impact + drift_impact
        feat_importance = {
            "Residual Shift (Offset/Gain)": round((drift_impact / denom) * 100, 1),
            "Thermal Variation (dT)": round((t_impact / denom) * 100, 1),
            "Humidity Variation (dH)": round((h_impact / denom) * 100, 1)
        }

        # Build natural language narrative explanation
        if classification == "Real Drift":
            narrative = (
                f"Drift detected because residual increased consistently over multiple observations (slope: {ewma_slope:+.3f} kPa/hr), "
                f"exceeded the configured CUSUM threshold ({cusum_val:.2f} > {cusum_threshold:.2f} kPa) and was NOT explained by environmental variations. "
                f"Digital twin EKF isolated physical sensor aging as the primary factor."
            )
            algorithm = "Dual-Sided CUSUM + Extended Kalman Filter (EKF) State Estimator"
            threshold_crossed = f"CUSUM Statistic {cusum_val:.2f} kPa crossed limit of {cusum_threshold:.2f} kPa"
            recommended_action = "Approve L3 Bounded Self-Calibration within +/- 5.0 kPa envelope."
        elif classification == "Fault":
            narrative = (
                f"Sudden abnormal step-change anomaly detected: residual jump of {residual:.2f} kPa violated the gradient safety limit. "
                f"Isolation Forest marked this sample as an out-of-distribution event."
            )
            algorithm = "Change-Point Mean-Difference Detector & Isolation Forest"
            threshold_crossed = f"Absolute gradient |Δ| > 1.8 kPa step fault threshold"
            recommended_action = "Lockout automatic calibration. Dispatch field engineer for physical inspection."
        elif classification == "Environment":
            narrative = (
                f"Transient residual shift ({residual:.2f} kPa) detected, but environmental correlation analysis shows deviation is "
                f"80%+ attributable to ambient temperature ({dT:+.1f}°C) and humidity ({dH:+.1f}%) swings. Digital Twin compensated automatically."
            )
            algorithm = "Physical Digital Twin Environmental Compensation (kT=0.02, kH=0.005)"
            threshold_crossed = "None (Within environmental tolerance envelope)"
            recommended_action = "Maintain continuous monitoring. No physical calibration required."
        else:
            narrative = (
                f"Sensor behavior is nominal. Small residual ({residual:.2f} kPa) represents random Gaussian measurement noise within safety tolerances."
            )
            algorithm = "EWMA Smoothing Baseline"
            threshold_crossed = "None (Residual within +/- 0.6 kPa normal noise band)"
            recommended_action = "No action needed. Sensor operating normally."

        if not sensor_agreement:
            narrative += " [WARNING: Redundant analog sensor disagrees with primary digital channel!]"

        return {
            "detection_reason": narrative,
            "algorithm_used": algorithm,
            "input_measurements": {
                "residual_kpa": round(residual, 3),
                "cusum_statistic": round(cusum_val, 3),
                "ewma_slope_kpa_hr": round(ewma_slope, 4),
                "temperature_delta_c": round(dT, 2),
                "humidity_delta_pct": round(dH, 2)
            },
            "threshold_crossed": threshold_crossed,
            "confidence_score": round(confidence, 3),
            "feature_importance": feat_importance,
            "recommended_next_action": recommended_action
        }
