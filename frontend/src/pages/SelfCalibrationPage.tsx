import React, { useState, useEffect } from 'react';
import {
  Wrench,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { CalibrationEvent, DigitalTwin } from '../types';

export const SelfCalibrationPage: React.FC = () => {
  const { selectedDevice } = useDevice();
  const { user } = useAuth();
  const [history, setHistory] = useState<CalibrationEvent[]>([]);
  const [twin, setTwin] = useState<DigitalTwin | null>(null);
  const [level, setLevel] = useState<string>('L3 — Bounded Auto-Correct');
  const [manualOffset, setManualOffset] = useState<number>(0.0);
  const [calibrating, setCalibrating] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const fetchData = async () => {
    if (!selectedDevice) return;
    try {
      const [histRes, twinRes] = await Promise.all([
        api.get(`/calibration/history/${selectedDevice.device_id}`),
        api.get(`/digital-twin/${selectedDevice.device_id}`)
      ]);
      setHistory(histRes.data);
      setTwin(twinRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDevice]);

  const handleExecuteCalibration = async (useManualDelta: boolean = false) => {
    if (!selectedDevice) return;
    setCalibrating(true);
    setResult(null);
    try {
      const res = await api.post('/calibration/execute', {
        device_id: selectedDevice.device_id,
        level: level,
        manual_offset_delta: useManualDelta ? manualOffset : null,
      });
      setResult(res.data);
      fetchData();
    } catch (err: any) {
      setResult({
        success: false,
        status: 'FAILED',
        message: err.response?.data?.detail || 'Calibration failed.'
      });
    } finally {
      setCalibrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#111827]">Bounded Self-Calibration Engine & Safety Interlocks</h2>
        <p className="text-xs text-gray-500">
          Controlled 10-step self-calibration with verification retries and automated rollback safeguards
        </p>
      </div>

      {/* Operational Levels Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { id: 'L0', title: 'L0 — Monitor', desc: 'Passive observation & logging only. No action taken.' },
          { id: 'L1', title: 'L1 — Warn', desc: 'Flags persistent drift warnings for operator review.' },
          { id: 'L2', title: 'L2 — Recommend', desc: 'Calculates recommended offset & schedules time window.' },
          { id: 'L3', title: 'L3 — Bounded Auto-Correct', desc: 'Applies verified, bounded corrections to sensor node.' },
        ].map((lvl) => (
          <div
            key={lvl.id}
            onClick={() => setLevel(lvl.title)}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              level === lvl.title
                ? 'bg-[#EAF0FF] border-[#1646E8] ring-1 ring-[#1646E8]'
                : 'bg-white border-[#E5E7EB] hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#1646E8]">{lvl.id}</span>
              {level === lvl.title && <CheckCircle2 className="w-4 h-4 text-[#1646E8]" />}
            </div>
            <h4 className="text-xs font-bold text-gray-900">{lvl.title}</h4>
            <p className="text-[11px] text-gray-500 mt-1">{lvl.desc}</p>
          </div>
        ))}
      </div>

      {/* Safety Interlocks Checklist Strip */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <h3 className="text-sm font-bold text-[#111827] mb-3">10-Step Safety & Calibration Workflow Interlocks</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase font-semibold">1. Drift Status</span>
            <span className="text-xs font-bold text-gray-800">CUSUM Confirmed</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase font-semibold">2. Reference Avail.</span>
            <span className="text-xs font-bold text-green-700">Stable Baseline</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase font-semibold">3. Model Confidence</span>
            <span className="text-xs font-bold text-gray-800">
              {twin ? `${(twin.model_confidence * 100).toFixed(0)}% (Req > 70%)` : '--'}
            </span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase font-semibold">4. Safety Boundary</span>
            <span className="text-xs font-bold text-gray-800">±{selectedDevice?.max_offset_correction_kpa} kPa Max</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-[10px] text-gray-400 block uppercase font-semibold">5. Verification Retries</span>
            <span className="text-xs font-bold text-gray-800">Max 2 → Rollback</span>
          </div>
        </div>

        {/* Execution Result Banner */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg border text-xs ${
            result.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="font-bold text-sm mb-1">
              {result.success ? 'Calibration Applied & Verified Successfully' : `Calibration Interlock: ${result.status}`}
            </div>
            <p>{result.message || (result.success ? `Offset delta applied: ${result.offset_applied?.toFixed(3)} kPa. New baseline: ${result.new_offset?.toFixed(3)} kPa. Passport ID: ${result.passport_id}` : '')}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Operator authorization: <strong className="text-gray-800">{user?.full_name} ({user?.role})</strong>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleExecuteCalibration(false)}
              disabled={calibrating || user?.role === 'Viewer'}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#1646E8] hover:bg-[#123FD5] text-white text-xs font-semibold rounded-md shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{calibrating ? 'Executing 10-Step Workflow...' : 'Execute Auto-Calibration'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical Calibration Table */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <h3 className="text-sm font-bold text-[#111827] mb-3">Calibration Event Log & Verification Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F9FC] text-gray-600 border-b border-gray-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Level</th>
                <th className="py-2.5 px-3">Measured</th>
                <th className="py-2.5 px-3">Expected</th>
                <th className="py-2.5 px-3">Residual Before</th>
                <th className="py-2.5 px-3">Offset Applied</th>
                <th className="py-2.5 px-3">Verification</th>
                <th className="py-2.5 px-3">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-gray-400">
                    No calibrations executed yet for this node.
                  </td>
                </tr>
              ) : (
                history.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-500">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-medium">{ev.level}</td>
                    <td className="py-2.5 px-3">{ev.measured_reading.toFixed(2)} kPa</td>
                    <td className="py-2.5 px-3">{ev.expected_reading.toFixed(2)} kPa</td>
                    <td className="py-2.5 px-3 font-semibold">{ev.residual_before > 0 ? '+' : ''}{ev.residual_before.toFixed(2)} kPa</td>
                    <td className="py-2.5 px-3 font-bold text-[#1646E8]">{ev.applied_offset_delta > 0 ? '+' : ''}{ev.applied_offset_delta.toFixed(2)} kPa</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{ev.responsible_user}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
