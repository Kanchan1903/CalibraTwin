import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Cpu,
  TrendingUp,
  ShieldCheck,
  Radio,
  ArrowRight,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import api from '../services/api';

const SCENARIOS = [
  { id: 1, name: "1. Normal Operation", tag: "Baseline", desc: "Healthy sensor telemetry, stable residuals, verified agreement." },
  { id: 2, name: "2. Gradual Offset Drift", tag: "Aging", desc: "Progressive drift accumulating. CUSUM triggers persistent drift alarm." },
  { id: 3, name: "3. Gain Drift", tag: "Sensitivity", desc: "Slope sensitivity drift across pressure measurement span." },
  { id: 4, name: "4. Temperature Variation", tag: "Environment", desc: "Ambient swing (+16°C) automatically compensated by Digital Twin (kT)." },
  { id: 5, name: "5. Humidity Variation", tag: "Environment", desc: "Moisture swing (+32% RH) compensated by physical twin parameters (kH)." },
  { id: 6, name: "6. Sudden Sensor Fault", tag: "Transient", desc: "Abrupt step jump (+5.2 kPa). Isolation Forest & gradient jump alarm." },
  { id: 7, name: "7. Sensor Noise & Jitter", tag: "Noise", desc: "High Gaussian noise. Trust Score penalizes excessive variance." },
  { id: 8, name: "8. Sensor Disagreement", tag: "Redundancy", desc: "Primary digital vs redundant ADS1115 analog reading divergence." },
  { id: 9, name: "9. Wi-Fi Disconnection", tag: "Offline-First", desc: "ESP32 buffers readings locally into flash memory ring buffer." },
  { id: 10, name: "10. Successful Calibration", tag: "L3 Auto-Correct", desc: "Bounded closed-loop self-calibration with verification pass." },
  { id: 11, name: "11. Failed Calibration", tag: "Rollback", desc: "Verification failure after 2 retries triggers automatic safe rollback." },
  { id: 12, name: "12. Recovery After Rollback", tag: "Restoration", desc: "Device safely restores baseline operating parameters." }
];

export const SimulationLabPage: React.FC = () => {
  const { selectedDevice, refetchDevices } = useDevice();
  const [activeScenarioId, setActiveScenarioId] = useState<number>(1);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runScenario = async (scenarioId: number) => {
    if (!selectedDevice) return;
    setActiveScenarioId(scenarioId);
    setLoading(true);
    try {
      const res = await api.post('/simulator/run-scenario', {
        device_id: selectedDevice.device_id,
        scenario_id: scenarioId
      });
      setPipelineData(res.data);
      refetchDevices();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stages = pipelineData?.pipeline_stages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-[#1646E8]" />
            <span>Simulation & Testing Lab</span>
          </h2>
          <p className="text-xs text-gray-500">
            Interactive test bench for evaluating 12 real-world sensor fault, drift, and calibration pipelines.
          </p>
        </div>
      </div>

      {/* Scenario Selector Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {SCENARIOS.map((sc) => {
          const isSelected = activeScenarioId === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => runScenario(sc.id)}
              disabled={loading}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#1646E8] bg-[#EAF0FF] shadow-xs'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  sc.tag === 'Baseline' || sc.tag === 'L3 Auto-Correct' ? 'bg-green-100 text-green-700' :
                  sc.tag === 'Environment' ? 'bg-blue-100 text-blue-700' :
                  sc.tag === 'Offline-First' ? 'bg-purple-100 text-purple-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {sc.tag}
                </span>
                {isSelected && <Play className="w-3 h-3 text-[#1646E8] fill-[#1646E8]" />}
              </div>
              <h4 className="text-xs font-semibold text-gray-900 leading-tight">{sc.name}</h4>
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{sc.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Complete Processing Pipeline Visualization */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
              <span>Complete Processing Pipeline Execution:</span>
              <span className="text-[#1646E8]">{pipelineData?.scenario_name || "Select a scenario above"}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{pipelineData?.scenario_description}</p>
          </div>
          <button
            onClick={() => runScenario(activeScenarioId)}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1646E8] hover:bg-[#123FD5] text-white text-xs font-semibold rounded shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{loading ? "Processing Pipeline..." : "Execute Step"}</span>
          </button>
        </div>

        {stages ? (
          <div className="space-y-4">
            {/* Visual Pipeline Flow Sequence */}
            <div className="flex flex-wrap items-center justify-between text-xs gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-semibold text-gray-700">1. Raw Input</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">2. Filtering & Redundancy</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">3. Trust Assessment</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">4. Digital Twin EKF</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">5. CUSUM Detection</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">6. Explainable AI (XAI)</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">7. Safe Governance</span>
            </div>

            {/* Pipeline Stage Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Stage 1 & 2 */}
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">1. Sensor Acquisition</span>
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                {stages["1_sensor_input"] ? (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Digital Pressure:</span>
                      <span className="font-bold">{stages["1_sensor_input"].digital_reading_kpa} kPa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Analog Transducer:</span>
                      <span className="font-bold">{stages["1_sensor_input"].analog_reading_kpa} kPa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Temp / Hum:</span>
                      <span>{stages["1_sensor_input"].temperature_c}°C / {stages["1_sensor_input"].humidity_pct}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-purple-700 font-semibold">{stages.system_response}</p>
                )}
              </div>

              {/* Stage 2: Redundancy & Validation */}
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">2. Cross-Validation</span>
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                </div>
                {stages["2_filtering_and_validation"] && (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Agreement Score:</span>
                      <span className="font-bold">{stages["2_filtering_and_validation"].sensor_agreement_score}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delta (|Dig - An|):</span>
                      <span>{stages["2_filtering_and_validation"].difference_kpa} kPa</span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1">
                      {stages["2_filtering_and_validation"].cross_validation_diagnosis}
                    </div>
                  </div>
                )}
              </div>

              {/* Stage 3: Data Quality & Trust Score */}
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">3. Data Trust Score</span>
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                </div>
                {stages["3_data_quality_assessment"] && (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Trust Score (0–100):</span>
                      <span className="font-bold text-blue-700">{stages["3_data_quality_assessment"].trust_score}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Quality Grade:</span>
                      <span className="font-semibold">{stages["3_data_quality_assessment"].data_quality_grade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Noise Level (Std):</span>
                      <span>{stages["3_data_quality_assessment"].noise_std_kpa} kPa</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stage 4: Digital Twin EKF */}
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">4. Digital Twin State</span>
                  <Cpu className="w-4 h-4 text-[#1646E8]" />
                </div>
                {stages["4_digital_twin_state"] && (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expected Reading:</span>
                      <span className="font-bold">{stages["4_digital_twin_state"].expected_pressure_kpa} kPa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Residual Δ:</span>
                      <span className="font-bold">{stages["4_digital_twin_state"].residual_kpa} kPa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Sync Status:</span>
                      <span className="font-semibold text-green-700">{stages["4_digital_twin_state"].twin_sync_status}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stage 5: Drift Detection */}
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">5. CUSUM Drift Engine</span>
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                {stages["5_drift_detection_cusum"] && (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Drift Classification:</span>
                      <span className="font-bold text-amber-700">{stages["5_drift_detection_cusum"].residual_classification}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status Flag:</span>
                      <span className="font-semibold">{stages["5_drift_detection_cusum"].drift_status}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stage 7: Governance Action */}
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">7. Safe Governance</span>
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xs space-y-1">
                  {stages["7_calibration_governance"] ? (
                    <div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Action:</span>
                        <span className="font-bold text-green-700">{stages["7_calibration_governance"].status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Applied Offset Δ:</span>
                        <span>{stages["7_calibration_governance"].applied_offset_delta} kPa</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Passport Event:</span>
                        <span className="font-mono text-[10px]">{stages["7_calibration_governance"].passport_event_id?.slice(0, 16)}...</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No calibration required for this scenario.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stage 6: Explainable AI (XAI) Expanded Card */}
            {stages["6_explainable_ai_decision"] && (
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-[#1646E8]" />
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Explainable AI (XAI) Diagnostic Attribution
                  </span>
                </div>
                <p className="text-xs text-gray-800 leading-relaxed font-medium">
                  "{stages["6_explainable_ai_decision"].detection_reason}"
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2 border-t border-blue-100">
                  <div>
                    <span className="text-gray-500 block">Algorithm Used:</span>
                    <span className="font-semibold text-gray-800">{stages["6_explainable_ai_decision"].algorithm_used}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Threshold Crossed:</span>
                    <span className="font-semibold text-gray-800">{stages["6_explainable_ai_decision"].threshold_crossed}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Recommended Action:</span>
                    <span className="font-semibold text-[#1646E8]">{stages["6_explainable_ai_decision"].recommended_next_action}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Click any scenario above or click "Execute Step" to run the complete pipeline.</p>
          </div>
        )}
      </div>
    </div>
  );
};
