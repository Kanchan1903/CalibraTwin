import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.ensemble import IsolationForest

class DriftAnalyticsService:
    def __init__(self):
        self.iso_forest = IsolationForest(contamination=0.05, random_state=42)

    @staticmethod
    def calculate_ewma(series: List[float], alpha: float = 0.2) -> List[float]:
        """Calculates Exponentially Weighted Moving Average for trend smoothing."""
        if not series:
            return []
        ewma_vals = [series[0]]
        for val in series[1:]:
            ewma_vals.append(alpha * val + (1 - alpha) * ewma_vals[-1])
        return ewma_vals

    @staticmethod
    def calculate_cusum(
        residuals: List[float],
        target: float = 0.0,
        threshold: float = 1.2,
        slack: float = 0.3
    ) -> Tuple[List[float], List[float], bool]:
        """
        Two-sided Cumulative Sum (CUSUM) test for persistent shift / drift.
        S_pos[i] = max(0, S_pos[i-1] + (res[i] - target) - slack)
        S_neg[i] = max(0, S_neg[i-1] - (res[i] - target) - slack)
        """
        if not residuals:
            return [], [], False

        s_pos = [0.0]
        s_neg = [0.0]
        drift_detected = False

        for r in residuals:
            sp = max(0.0, s_pos[-1] + (r - target) - slack)
            sn = max(0.0, s_neg[-1] - (r - target) - slack)
            s_pos.append(sp)
            s_neg.append(sn)
            if sp > threshold or sn > threshold:
                drift_detected = True

        return s_pos[1:], s_neg[1:], drift_detected

    @staticmethod
    def detect_changepoint(residuals: List[float], min_window: int = 5) -> Tuple[bool, int]:
        """
        Detects sudden jump / changepoint using max difference in windowed means.
        """
        if len(residuals) < min_window * 2:
            return False, -1

        max_diff = 0.0
        best_idx = -1
        for i in range(min_window, len(residuals) - min_window):
            left_mean = np.mean(residuals[:i])
            right_mean = np.mean(residuals[i:])
            diff = abs(right_mean - left_mean)
            if diff > max_diff:
                max_diff = diff
                best_idx = i

        # Threshold for abrupt step fault
        if max_diff > 1.8:
            return True, best_idx
        return False, -1

    def detect_anomalies(self, features: List[List[float]]) -> List[int]:
        """
        Features: [[measured_reading, temp, humidity, residual], ...]
        Returns array of 1 (normal) or -1 (anomaly).
        """
        if len(features) < 10:
            return [1] * len(features)
        
        X = np.array(features)
        self.iso_forest.fit(X)
        preds = self.iso_forest.predict(X)
        return preds.tolist()

    @staticmethod
    def classify_residual_behavior(
        residual: float,
        dT: float,
        dH: float,
        drift_rate: float,
        is_step_change: bool
    ) -> str:
        """
        Classifies into:
        A. Noise — small random variations (|residual| <= 0.6)
        B. Environment — variations correlated with dT or dH
        C. Real Drift — persistent slope / drift_rate > 0.05 kPa/hr
        D. Fault — sudden jump / step change
        """
        abs_res = abs(residual)
        if is_step_change or abs_res > 4.0:
            return "Fault"
        
        # Check if temperature or humidity explains the deviation
        env_impact = abs(dT * 0.02) + abs(dH * 0.005)
        if abs_res > 0.8 and env_impact > 0.5 * abs_res:
            return "Environment"

        if abs_res > 1.0 or abs(drift_rate) > 0.03:
            return "Real Drift"

        return "Noise"
