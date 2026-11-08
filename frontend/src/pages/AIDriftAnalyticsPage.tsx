import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Activity, Search, ShieldAlert, Cpu } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { useDevice } from '../context/DeviceContext';
import api from '../services/api';
import type { DriftEvent, Telemetry } from '../types';

export const AIDriftAnalyticsPage: React.FC = () => {
  const { selectedDevice } = useDevice();
  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);

  const fetchDriftData = async () => {
    if (!selectedDevice) return;
    try {
      const [driftRes, telemRes] = await Promise.all([
        api.get(`/analytics/drift/${selectedDevice.device_id}?limit=20`),
        api.get(`/telemetry/${selectedDevice.device_id}?hours=6&limit=30`)
      ]);
      setDriftEvents(driftRes.data);
      setTelemetry(telemRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDriftData();
    const interval = setInterval(fetchDriftData, 4000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const latestDrift = driftEvents.length > 0 ? driftEvents[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#111827]">AI Drift Detection & Residual Classification</h2>
        <p className="text-xs text-gray-500">
          Multivariate algorithmic drift identification via EWMA, two-sided CUSUM, and Change-Point Analysis
        </p>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Drift Status</span>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
              latestDrift?.drift_status === 'CRITICAL_DRIFT'
                ? 'bg-red-100 text-red-800'
                : latestDrift?.drift_status === 'DRIFT_DETECTED'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {latestDrift ? latestDrift.drift_status : 'NORMAL'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block">
            Method: {latestDrift ? latestDrift.detection_method : 'CUSUM + EWMA'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Residual Classification</span>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-[#1646E8]">
              {latestDrift ? latestDrift.residual_classification : 'Noise'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block">
            Classified: Noise / Environment / Drift / Fault
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Drift Rate</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-[#111827]">
              {latestDrift ? `${latestDrift.drift_rate.toFixed(4)}` : '0.0000'}
            </span>
            <span className="text-xs text-gray-500">kPa / hr</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block">
            Direction: {latestDrift ? latestDrift.drift_direction : 'STABLE'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Drift Magnitude</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-[#FFB900]">
              {latestDrift ? `${latestDrift.drift_magnitude > 0 ? '+' : ''}${latestDrift.drift_magnitude.toFixed(2)}` : '0.00'}
            </span>
            <span className="text-xs text-gray-500">kPa</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block">
            Threshold: ±{selectedDevice?.drift_warn_threshold_kpa} kPa
          </span>
        </div>
      </div>

      {/* Residual Drift Progression Chart */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Continuous Residual Error & EWMA Trend Curve</h3>
            <p className="text-[11px] text-gray-500">Separating random thermal noise from true mechanical diaphragm creep</p>
          </div>
          <TrendingUp className="w-4 h-4 text-[#1646E8]" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="timestamp" tick={false} stroke="#94A3B8" />
              <YAxis domain={[-4, 4]} stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="residual" name="Raw Residual (kPa)" stroke="#94A3B8" strokeWidth={1} dot={true} />
              <Line type="monotone" dataKey="residual" name="EWMA Smoothed Trend" stroke="#1646E8" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Drift Event Log Table */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <h3 className="text-sm font-bold text-[#111827] mb-3">Historical Drift & Changepoint Detections</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F9FC] text-gray-600 border-b border-gray-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Magnitude</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Rate (kPa/hr)</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Algorithm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {driftEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-400">
                    No persistent drift events registered. Sensor is currently within nominal limits.
                  </td>
                </tr>
              ) : (
                driftEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-500">{new Date(ev.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.drift_status === 'CRITICAL_DRIFT' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ev.drift_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{ev.drift_magnitude > 0 ? '+' : ''}{ev.drift_magnitude.toFixed(2)} kPa</td>
                    <td className="py-2.5 px-3">{ev.drift_direction}</td>
                    <td className="py-2.5 px-3">{ev.drift_rate.toFixed(4)}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[#1646E8]">{ev.residual_classification}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{ev.detection_method}</td>
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
