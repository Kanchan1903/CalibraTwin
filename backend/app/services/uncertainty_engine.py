import numpy as np
import scipy.stats as stats
from typing import Dict, Any, List

class UncertaintyEstimationEngine:
    """
    GUM (Guide to the Expression of Uncertainty in Measurement) compliant engine:
    1. Type A uncertainty: Evaluated by statistical analysis of series of observations (sample variance/SEM).
    2. Type B uncertainty: Evaluated by sensor specifications (resolution, repeatability, temperature hysteresis).
    3. Combined Expanded Uncertainty (U = k * u_c, where k=2 for ~95% confidence level).
    4. Guardband check: Prevents automatic correction when expanded uncertainty exceeds allowable limit (U > U_max).
    """
    # Typical sensor specification uncertainties (Type B, standard values in kPa)
    TYPE_B_DIGITAL_ACCURACY = 0.12  # BMP280 factory accuracy
    TYPE_B_ANALOG_ACCURACY  = 0.25  # Piezoresistive bridge + ADS1115 ADC quantization
    TYPE_B_THERMAL_DRIFT    = 0.08  # Temperature hysteresis effect

    @staticmethod
    def calculate_measurement_uncertainty(
        recent_residuals: List[float],
        coverage_factor_k: float = 2.0
    ) -> Dict[str, Any]:
        """
        Calculates Type A, Type B and Combined Expanded Uncertainty for sensor readings.
        """
        if not recent_residuals or len(recent_residuals) < 3:
            # Fallback prior
            u_A = 0.15
            dof = 2
        else:
            u_A = float(np.std(recent_residuals, ddof=1) / np.sqrt(len(recent_residuals)))
            dof = len(recent_residuals) - 1

        # Type B combined
        u_B = np.sqrt(
            UncertaintyEstimationEngine.TYPE_B_DIGITAL_ACCURACY**2 +
            UncertaintyEstimationEngine.TYPE_B_THERMAL_DRIFT**2
        )

        # Combined Standard Uncertainty u_c = sqrt(u_A^2 + u_B^2)
        u_c = float(np.sqrt(u_A**2 + u_B**2))

        # Expanded Uncertainty U = k * u_c (k=2 represents approx 95.45% coverage)
        expanded_U = float(coverage_factor_k * u_c)

        # Guardband safety check: Max permissible calibration uncertainty is 0.50 kPa
        MAX_PERMISSIBLE_UNCERTAINTY = 0.50
        is_safe_for_calibration = expanded_U <= MAX_PERMISSIBLE_UNCERTAINTY

        return {
            "type_A_uncertainty_kpa": round(u_A, 4),
            "type_B_uncertainty_kpa": round(u_B, 4),
            "combined_standard_uncertainty_uc": round(u_c, 4),
            "coverage_factor_k": coverage_factor_k,
            "expanded_uncertainty_U": round(expanded_U, 4),
            "confidence_interval_95pct": f"± {expanded_U:.3f} kPa",
            "is_safe_for_calibration": is_safe_for_calibration,
            "max_permissible_uncertainty_limit": MAX_PERMISSIBLE_UNCERTAINTY,
            "degrees_of_freedom": dof
        }

    @staticmethod
    def calculate_parameter_uncertainty(
        estimated_offset: float,
        estimated_gain: float,
        ekf_covariance_P: List[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Extracts parameter estimation uncertainty from Extended Kalman Filter (EKF) covariance matrix P.
        """
        if ekf_covariance_P and len(ekf_covariance_P) >= 2:
            sigma_offset = np.sqrt(max(0.0001, ekf_covariance_P[0][0]))
            sigma_gain = np.sqrt(max(0.00001, ekf_covariance_P[1][1]))
        else:
            sigma_offset = 0.08
            sigma_gain = 0.002

        U_offset = 2.0 * sigma_offset
        U_gain = 2.0 * sigma_gain

        return {
            "offset_estimate_kpa": round(estimated_offset, 3),
            "offset_uncertainty_U": round(U_offset, 4),
            "offset_95ci": [round(estimated_offset - U_offset, 3), round(estimated_offset + U_offset, 3)],
            "gain_estimate": round(estimated_gain, 4),
            "gain_uncertainty_U": round(U_gain, 5),
            "gain_95ci": [round(estimated_gain - U_gain, 4), round(estimated_gain + U_gain, 4)]
        }
