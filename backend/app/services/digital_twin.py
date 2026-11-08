import numpy as np
from datetime import datetime

class DigitalTwinEngine:
    """
    Sensor Model:
    Expected reading = True_value * (1 + gain) + offset + kT * dT + kH * dH
    
    where:
    - True_value = baseline reference pressure (e.g. 101.325 kPa or redundant sensor)
    - gain = sensor gain error
    - offset = sensor offset error
    - kT = temperature compensation coefficient (kPa / °C)
    - kH = humidity compensation coefficient (kPa / %RH)
    - dT = temperature - reference_temperature
    - dH = humidity - reference_humidity
    """
    def __init__(self, offset: float = 0.0, gain: float = 0.0, kT: float = 0.02, kH: float = 0.005):
        self.offset = offset
        self.gain = gain
        self.kT = kT
        self.kH = kH

        # State vector: [offset, gain]
        self.x = np.array([[offset], [gain]])
        # State covariance P
        self.P = np.eye(2) * 0.1
        # Process noise Q
        self.Q = np.eye(2) * 1e-5
        # Measurement noise R
        self.R = np.array([[0.05]])

    def calculate_expected(
        self,
        true_value: float,
        temperature: float,
        humidity: float,
        ref_temp: float = 25.0,
        ref_hum: float = 50.0
    ) -> float:
        dT = temperature - ref_temp
        dH = humidity - ref_hum
        expected = true_value * (1.0 + self.gain) + self.offset + (self.kT * dT) + (self.kH * dH)
        return float(expected)

    def ekf_update(
        self,
        measured: float,
        true_value: float,
        temperature: float,
        humidity: float,
        ref_temp: float = 25.0,
        ref_hum: float = 50.0
    ):
        """
        EKF estimating offset and gain errors.
        Measurement model: h(x) = true_value * (1 + gain) + offset + kT * dT + kH * dH
        Jacobian H = [dh/doffset, dh/dgain] = [1.0, true_value]
        """
        dT = temperature - ref_temp
        dH = humidity - ref_hum
        
        # 1. Prediction step
        # Random walk for state: x_k|k-1 = x_k-1
        P_pred = self.P + self.Q

        # 2. Measurement prediction
        h_x = true_value * (1.0 + self.x[1, 0]) + self.x[0, 0] + (self.kT * dT) + (self.kH * dH)
        residual = measured - h_x

        # 3. Measurement Jacobian H
        H = np.array([[1.0, true_value]])

        # 4. Innovation covariance S
        S = H @ P_pred @ H.T + self.R

        # 5. Kalman Gain K
        K = P_pred @ H.T @ np.linalg.inv(S)

        # 6. State update
        self.x = self.x + K * residual
        self.P = (np.eye(2) - K @ H) @ P_pred

        estimated_offset = float(self.x[0, 0])
        estimated_gain = float(self.x[1, 0])

        # Confidence metric derived from covariance trace
        trace_p = float(np.trace(self.P))
        confidence = max(0.5, min(0.99, 1.0 - (trace_p * 2.0)))

        return {
            "expected_reading": float(h_x),
            "residual": float(residual),
            "estimated_offset": estimated_offset,
            "estimated_gain": estimated_gain,
            "model_confidence": round(confidence, 4)
        }
