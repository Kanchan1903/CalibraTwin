import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Gauge
} from 'lucide-react';
import api from '../services/api';

export const BenchmarkingPage: React.FC = () => {
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/simulator/benchmarks?sample_size=150');
      setBenchmarkData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111827] flex items-center space-x-2">
            <Award className="w-5 h-5 text-[#1646E8]" />
            <span>Empirical Benchmarking & Performance Evaluation</span>
          </h2>
          <p className="text-xs text-gray-500">
            Rigorous experimental comparison: Fixed Threshold vs. ML-Only vs. CalibraTwin Combined Approach across 8 metrics.
          </p>
        </div>
        <button
          onClick={fetchBenchmarks}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1646E8] hover:bg-[#123FD5] text-white text-xs font-semibold rounded shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Rerun Benchmark Suite</span>
        </button>
      </div>

      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-[#1646E8] rounded-xl p-5 text-white shadow-sm">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
            C
          </div>
          <h3 className="text-sm font-bold">Empirical Evaluation Verdict</h3>
        </div>
        <p className="text-xs text-blue-100 max-w-4xl leading-relaxed">
          {benchmarkData?.verdict || "Evaluating 150 reproducible telemetry samples across thermal stress, drift slopes, and transient noise..."}
        </p>
        <div className="mt-3 text-[11px] text-blue-200">
          Evaluated sample size: <span className="font-semibold text-white">{benchmarkData?.test_sample_size || 150} cycles</span> • Data source: <span className="font-semibold text-white">{benchmarkData?.data_source}</span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Comparative Benchmark Matrix (3 Architectural Paradigms)
          </h4>
          <span className="text-[11px] text-gray-500 font-medium">Lower is better for errors & delays</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Evaluation Metric</th>
                <th className="py-3 px-3 text-center">Unit</th>
                <th className="py-3 px-4 text-center bg-gray-100/60 text-gray-700">Approach A: Fixed Threshold</th>
                <th className="py-3 px-4 text-center bg-gray-100/60 text-gray-700">Approach B: ML-Only (Outlier)</th>
                <th className="py-3 px-4 text-center bg-blue-50 text-[#1646E8] font-bold">Approach C: CalibraTwin (Combined)</th>
                <th className="py-3 px-4 text-right">Demonstrated Gain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {benchmarkData?.comparison?.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-gray-900">{row.metric}</td>
                  <td className="py-3 px-3 text-center font-mono text-[11px] text-gray-500">{row.unit}</td>
                  <td className="py-3 px-4 text-center font-mono text-gray-600 bg-gray-50/30">{row.fixed_threshold}</td>
                  <td className="py-3 px-4 text-center font-mono text-gray-600 bg-gray-50/30">{row.ml_only}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-[#1646E8] bg-blue-50/40">
                    {row.calibratwin_combined}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-700">
                    <span className="inline-flex items-center space-x-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{row.improvement}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodological Transparency Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
          <h5 className="text-xs font-bold text-gray-900">Fixed Threshold Flaw</h5>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Static thresholds suffer from frequent false alarms during ambient temperature and humidity excursions, causing unnecessary shutdowns.
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-1">
          <h5 className="text-xs font-bold text-gray-900">Pure ML Deficiency</h5>
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Black-box models detect anomalies without thermodynamic context, confusing environmental variation with physical mechanical degradation.
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-xs space-y-1">
          <h5 className="text-xs font-bold text-[#1646E8]">CalibraTwin Advantage</h5>
          <p className="text-[11px] text-gray-700 leading-relaxed">
            By embedding physics (kT, kH) directly into an Extended Kalman Filter, environmental variations are subtracted, eliminating false alarms.
          </p>
        </div>
      </div>
    </div>
  );
};
