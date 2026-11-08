export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'Administrator' | 'Engineer' | 'Viewer';
  is_active: boolean;
  created_at: string;
}

export interface Device {
  id: number;
  device_id: string;
  name: string;
  location: string;
  sensor_type: string;
  reference_pressure_kpa: number;
  reference_temperature_c: number;
  reference_humidity_pct: number;
  drift_warn_threshold_kpa: number;
  drift_critical_threshold_kpa: number;
  max_offset_correction_kpa: number;
  max_gain_delta: number;
  auto_correct_enabled: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR';
  is_demo: boolean;
  created_at: string;
  last_seen: string;
}

export interface Telemetry {
  id: number;
  device_id: string;
  timestamp: string;
  digital_pressure: number;
  analog_pressure: number;
  temperature: number;
  humidity: number;
  reference_temperature: number;
  expected_pressure?: number;
  residual?: number;
  sensor_agreement: boolean;
  data_quality: string;
  health_status: string;
  is_simulated: boolean;
}

export interface DigitalTwin {
  offset: number;
  gain: number;
  kT: number;
  kH: number;
  estimated_offset: number;
  estimated_gain: number;
  model_confidence: number;
  updated_at: string;
}

export interface DriftEvent {
  id: number;
  device_id: string;
  timestamp: string;
  drift_status: string;
  drift_magnitude: number;
  drift_direction: string;
  drift_rate: number;
  detection_method: string;
  residual_classification: string;
}

export interface AnomalyEvent {
  id: number;
  device_id: string;
  timestamp: string;
  anomaly_score: number;
  is_anomaly: boolean;
  method: string;
  details?: string;
}

export interface RulPrediction {
  device_id: string;
  remaining_days: number;
  predicted_calibration_date: string | null;
  drift_rate_daily: number;
  maintenance_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence_score: number;
  timestamp: string;
}

export interface CalibrationEvent {
  id: number;
  device_id: string;
  timestamp: string;
  level: string;
  measured_reading: number;
  expected_reading: number;
  residual_before: number;
  residual_after: number | null;
  applied_offset_delta: number;
  applied_gain_delta: number;
  status: string;
  retry_count: number;
  responsible_user: string;
  remarks?: string;
}

export interface Alert {
  id: number;
  device_id: string;
  alert_type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  timestamp: string;
  description: string;
  probable_root_cause?: string;
  recommended_action?: string;
  resolution_status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface PassportEntry {
  id: number;
  passport_event_id: string;
  device_id: string;
  timestamp: string;
  previous_offset: number;
  updated_offset: number;
  previous_gain: number;
  updated_gain: number;
  measured_reading: number;
  expected_reading: number;
  residual_before: number;
  residual_after: number;
  verification_result: string;
  responsible_user: string;
  previous_event_hash: string;
  current_event_hash: string;
}

export interface DashboardKPIs {
  total_devices: number;
  healthy_devices: number;
  devices_under_watch: number;
  devices_requiring_maintenance: number;
  average_confidence_score: number;
  pending_calibration: number;
}
