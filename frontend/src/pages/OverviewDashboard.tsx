import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';
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
import type { DashboardKPIs, Telemetry, Alert, CalibrationEvent } from '../types';

export const OverviewDashboard: React.FC = () => {
  const { selectedDevice } = useDevice();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentCalibrations, setRecentCalibrations] = useState<CalibrationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!selectedDevice) return;
    try {
      const [kpiRes, telemRes, alertRes, calRes] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get(`/telemetry/${selectedDevice.device_id}?hours=24&limit=30`),
        api.get(`/alerts?device_id=${selectedDevice.device_id}&limit=5`),
        api.get(`/calibration/history/${selectedDevice.device_id}`)
      ]);
      setKpis(kpiRes.data);
      setTelemetry(telemRes.data);
      setAlerts(alertRes.data);
      setRecentCalibrations(calRes.data.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">Industrial Monitoring & Twin Overview</h2>
          <p className="text-xs text-gray-500">
            Real-time pressure sensor analytics, digital twin residuals and health status
          </p>
        </div>
      </div>

      {/* Top KPI Cards (Requirement: 6 KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Devices</span>
            <Layers className="w-4 h-4 text-[#1646E8]" />
          </div>
          <p className="text-2xl font-bold text-[#111827]">{kpis?.total_devices ?? '-'}</p>
          <span className="text-[10px] text-gray-400">Registered nodes</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Healthy Devices</span>
            <CheckCircle2 className="w-4 h-4 text-[#55B927]" />
          </div>
          <p className="text-2xl font-bold text-[#55B927]">{kpis?.healthy_devices ?? '-'}</p>
          <span className="text-[10px] text-gray-400">Nominal residuals</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Under Watch</span>
            <AlertTriangle className="w-4 h-4 text-[#FFB900]" />
          </div>
          <p className="text-2xl font-bold text-[#FFB900]">{kpis?.devices_under_watch ?? '-'}</p>
          <span className="text-[10px] text-gray-400">Drift warning active</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Maintenance Req.</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{kpis?.devices_requiring_maintenance ?? '-'}</p>
          <span className="text-[10px] text-gray-400">Critical threshold</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Avg Confidence</span>
            <ShieldCheck className="w-4 h-4 text-[#1646E8]" />
          </div>
          <p className="text-2xl font-bold text-[#1646E8]">
            {kpis ? `${(kpis.average_confidence_score * 100).toFixed(1)}%` : '-'}
          </p>
          <span className="text-[10px] text-gray-400">EKF model confidence</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Pending Calib.</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{kpis?.pending_calibration ?? '-'}</p>
          <span className="text-[10px] text-gray-400">Awaiting correction</span>
        </div>
      </div>

      {/* Primary Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-medium text-gray-500 block mb-1">Measured Digital Pressure</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#111827]">
              {latest ? latest.digital_pressure.toFixed(2) : '--'}
            </span>
            <span className="text-xs font-semibold text-gray-500">kPa</span>
          </div>
          <span className="text-[11px] text-gray-500">
            Redundant Analog: <strong>{latest ? `${latest.analog_pressure.toFixed(2)} kPa` : '--'}</strong>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-medium text-gray-500 block mb-1">Digital Twin Expected</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#1646E8]">
              {latest?.expected_pressure ? latest.expected_pressure.toFixed(2) : '--'}
            </span>
            <span className="text-xs font-semibold text-gray-500">kPa</span>
          </div>
          <span className="text-[11px] text-gray-500">
            Residual Δ: <strong className={latest && Math.abs(latest.residual || 0) > 1.5 ? 'text-amber-600' : 'text-green-600'}>
              {latest?.residual !== undefined ? `${latest.residual > 0 ? '+' : ''}${latest.residual.toFixed(2)} kPa` : '--'}
            </strong>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-medium text-gray-500 block mb-1">Environmental Conditions</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#111827]">
              {latest ? `${latest.temperature.toFixed(1)}°C` : '--'}
            </span>
            <span className="text-sm font-semibold text-gray-500">| {latest ? `${latest.humidity.toFixed(0)}%` : '--'}</span>
          </div>
          <span className="text-[11px] text-gray-500">
            Reference Temp: <strong>{latest ? `${latest.reference_temperature}°C` : '--'}</strong>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-medium text-gray-500 block mb-1">Sensor Quality & Agreement</span>
          <div className="flex items-center space-x-2 my-1">
            <span className={`px-2 py-0.5 text-xs font-bold rounded ${latest?.sensor_agreement ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {latest?.sensor_agreement ? 'AGREEMENT: PASS' : 'DISAGREEMENT: FAIL'}
            </span>
          </div>
          <span className="text-[11px] text-gray-500">
            Signal Quality: <strong className="text-gray-800">{latest?.data_quality || 'UNKNOWN'}</strong>
          </span>
        </div>
      </div>

      {/* Main Charts: Measured vs Expected & Drift Residual Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Measured vs. Digital Twin Expected Reading</h3>
              <p className="text-[11px] text-gray-500">Live dynamic comparison tracking physical vs theoretical model</p>
            </div>
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
                <Line type="monotone" dataKey="digital_pressure" name="Measured (Digital)" stroke="#111827" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expected_pressure" name="Twin Expected" stroke="#1646E8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="analog_pressure" name="Redundant Analog" stroke="#8D32E8" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Sensor Drift Trend & Tolerance Bounds</h3>
              <p className="text-[11px] text-gray-500">Residual Δ (Measured − Expected) vs configured safety limits</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#FFB900]" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="timestamp" tick={false} stroke="#94A3B8" />
                <YAxis domain={[-4, 4]} stroke="#94A3B8" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="residual" name="Residual Δ (kPa)" stroke="#DC2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Alerts & Calibration History Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#111827]">Active Maintenance Alerts</h3>
            <span className="text-[11px] text-[#1646E8] font-semibold">{alerts.length} Records</span>
          </div>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No active alerts for this sensor node.</p>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        a.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a.severity.toUpperCase()}
                      </span>
                      <strong className="text-xs text-gray-900">{a.alert_type}</strong>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1">{a.description}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Calibrations */}
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#111827]">Recent Calibration Operations</h3>
            <span className="text-[11px] text-[#1646E8] font-semibold">{recentCalibrations.length} Events</span>
          </div>
          <div className="space-y-2">
            {recentCalibrations.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No calibration events performed yet.</p>
            ) : (
              recentCalibrations.map((c) => (
                <div key={c.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        c.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.status}
                      </span>
                      <strong className="text-xs text-gray-900">{c.level}</strong>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Offset applied: <strong>{c.applied_offset_delta > 0 ? '+' : ''}{c.applied_offset_delta.toFixed(2)} kPa</strong> | By: {c.responsible_user}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {new Date(c.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
