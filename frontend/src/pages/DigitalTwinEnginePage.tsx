import React, { useState, useEffect } from 'react';
import { Cpu, Sliders, ShieldCheck, RefreshCw, Save } from 'lucide-react';
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
import type { DigitalTwin, Telemetry } from '../types';

export const DigitalTwinEnginePage: React.FC = () => {
  const { selectedDevice } = useDevice();
  const [twin, setTwin] = useState<DigitalTwin | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [editOffset, setEditOffset] = useState<number>(0.0);
  const [editGain, setEditGain] = useState<number>(0.0);
  const [editKT, setEditKT] = useState<number>(0.02);
  const [editKH, setEditKH] = useState<number>(0.005);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const fetchTwinData = async () => {
    if (!selectedDevice) return;
    try {
      const [twinRes, telemRes] = await Promise.all([
        api.get(`/digital-twin/${selectedDevice.device_id}`),
        api.get(`/telemetry/${selectedDevice.device_id}?hours=6&limit=30`)
      ]);
      setTwin(twinRes.data);
      setEditOffset(twinRes.data.offset);
      setEditGain(twinRes.data.gain);
      setEditKT(twinRes.data.kT);
      setEditKH(twinRes.data.kH);
      setTelemetry(telemRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTwinData();
    const interval = setInterval(fetchTwinData, 4000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const handleSaveParams = async () => {
    if (!selectedDevice) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await api.put(`/digital-twin/${selectedDevice.device_id}`, {
        offset: editOffset,
        gain: editGain,
        kT: editKT,
        kH: editKH
      });
      setTwin(res.data);
      setMessage('Digital Twin parameters updated successfully.');
    } catch (e) {
      setMessage('Failed to update twin parameters.');
    } finally {
      setSaving(false);
    }
  };

  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">Digital Twin Sensor Modelling & EKF Estimator</h2>
          <p className="text-xs text-gray-500">
            Real-time theoretical state estimation using Extended Kalman Filter physics model
          </p>
        </div>
      </div>

      {/* Mathematical Sensor Model Documentation Alert Box */}
      <div className="p-4 bg-[#EAF0FF] border border-[#CBD5E1] rounded-xl text-xs space-y-1">
        <div className="flex items-center space-x-2 text-[#1646E8] font-bold">
          <Cpu className="w-4 h-4" />
          <span>Configured Digital Twin Sensor Formulation</span>
        </div>
        <p className="font-mono text-gray-800 bg-white p-2 rounded border border-blue-200">
          Expected Reading = True Value × (1 + gain) + offset + kT × (T − T_ref) + kH × (H − H_ref)
        </p>
        <p className="text-gray-600 text-[11px]">
          Where: <strong>kT</strong> represents temperature coefficient (+0.02 kPa/°C), <strong>kH</strong> represents relative humidity coefficient (+0.005 kPa/%RH), and state covariance is updated via continuous EKF innovation.
        </p>
      </div>

      {/* Model State Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">EKF Offset Estimate</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-[#1646E8]">
              {twin ? `${twin.estimated_offset > 0 ? '+' : ''}${twin.estimated_offset.toFixed(3)}` : '--'}
            </span>
            <span className="text-xs font-semibold text-gray-500">kPa</span>
          </div>
          <span className="text-[10px] text-gray-400">Base offset: {twin?.offset.toFixed(2)} kPa</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">EKF Gain Estimate</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-[#111827]">
              {twin ? `${(twin.estimated_gain * 100).toFixed(2)}%` : '--'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400">Scale sensitivity factor</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Model Confidence</span>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-[#55B927]">
              {twin ? `${(twin.model_confidence * 100).toFixed(1)}%` : '--'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400">Derived from EKF covariance P</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">Current Residual</span>
          <div className="flex items-baseline space-x-1">
            <span className={`text-3xl font-extrabold ${latest && Math.abs(latest.residual || 0) > 1.5 ? 'text-amber-600' : 'text-gray-900'}`}>
              {latest?.residual !== undefined ? `${latest.residual > 0 ? '+' : ''}${latest.residual.toFixed(2)}` : '--'}
            </span>
            <span className="text-xs font-semibold text-gray-500">kPa</span>
          </div>
          <span className="text-[10px] text-gray-400">Measured − Model Expected</span>
        </div>
      </div>

      {/* Real-Time Comparison Chart */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#111827]">Digital Twin Real-Time Tracking & Dynamic Innovation</h3>
          <Cpu className="w-4 h-4 text-[#1646E8]" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="timestamp" tick={false} stroke="#94A3B8" />
              <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="digital_pressure" name="Sensor Physical Reading (kPa)" stroke="#111827" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expected_pressure" name="Digital Twin Expected (kPa)" stroke="#1646E8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Parameter Calibration Form */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Configurable Twin Model Calibration Coefficients</h3>
            <p className="text-[11px] text-gray-500">Tune physics coefficients or manual baseline values</p>
          </div>
          <Sliders className="w-4 h-4 text-gray-400" />
        </div>

        {message && (
          <div className="mb-4 p-2.5 bg-blue-50 border border-blue-200 text-[#1646E8] text-xs rounded-md">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Baseline Offset (kPa)</label>
            <input
              type="number"
              step="0.01"
              value={editOffset}
              onChange={(e) => setEditOffset(parseFloat(e.target.value))}
              className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-[#1646E8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Gain Error Multiplier</label>
            <input
              type="number"
              step="0.001"
              value={editGain}
              onChange={(e) => setEditGain(parseFloat(e.target.value))}
              className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-[#1646E8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Temp Coeff kT (kPa / °C)</label>
            <input
              type="number"
              step="0.001"
              value={editKT}
              onChange={(e) => setEditKT(parseFloat(e.target.value))}
              className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-[#1646E8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Humidity Coeff kH (kPa / %)</label>
            <input
              type="number"
              step="0.001"
              value={editKH}
              onChange={(e) => setEditKH(parseFloat(e.target.value))}
              className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:ring-1 focus:ring-[#1646E8] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveParams}
            disabled={saving}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#1646E8] hover:bg-[#123FD5] text-white text-xs font-semibold rounded-md shadow-sm transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Updating Model...' : 'Apply Model Parameters'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
