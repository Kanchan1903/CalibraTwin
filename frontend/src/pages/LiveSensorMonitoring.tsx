import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  AlertOctagon,
  Clock,
  Filter,
  Layers,
  Thermometer,
  Droplets
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
import type { Telemetry } from '../types';

export const LiveSensorMonitoring: React.FC = () => {
  const { selectedDevice } = useDevice();
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [filterHours, setFilterHours] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTelemetry = async () => {
    if (!selectedDevice) return;
    try {
      const res = await api.get(`/telemetry/${selectedDevice.device_id}?hours=${filterHours}&limit=60`);
      setTelemetry(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [selectedDevice, filterHours]);

  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">Live Sensor Telemetry & Diagnostics</h2>
          <p className="text-xs text-gray-500">
            High-frequency dual pressure channel acquisition with environmental correlation
          </p>
        </div>

        {/* Time Window Filters (Requirement: 1h, 6h, 24h, 7d) */}
        <div className="flex items-center space-x-1 bg-white border border-[#E5E7EB] rounded-lg p-1 shadow-xs">
          {[
            { label: '1 Hour', val: 1 },
            { label: '6 Hours', val: 6 },
            { label: '24 Hours', val: 24 },
            { label: '7 Days', val: 168 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setFilterHours(item.val)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                filterHours === item.val
                  ? 'bg-[#1646E8] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Reading Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Digital Pressure (Primary)</span>
            <Activity className="w-4 h-4 text-[#1646E8]" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#111827]">
              {latest ? latest.digital_pressure.toFixed(2) : '--'}
            </span>
            <span className="text-xs text-gray-500 font-semibold">kPa</span>
          </div>
          <span className="text-[10px] text-gray-400">Digital piezoresistive element</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Analog Pressure (Redundant)</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-purple-700">
              {latest ? latest.analog_pressure.toFixed(2) : '--'}
            </span>
            <span className="text-xs text-gray-500 font-semibold">kPa</span>
          </div>
          <span className="text-[10px] text-gray-400">Transducer ADC redundant channel</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Ambient Temperature</span>
            <Thermometer className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#111827]">
              {latest ? `${latest.temperature.toFixed(1)}` : '--'}
            </span>
            <span className="text-xs text-gray-500 font-semibold">°C (Ref: {latest?.reference_temperature}°C)</span>
          </div>
          <span className="text-[10px] text-gray-400">Thermal compensation sensor</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Relative Humidity</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[#111827]">
              {latest ? `${latest.humidity.toFixed(1)}` : '--'}
            </span>
            <span className="text-xs text-gray-500 font-semibold">% RH</span>
          </div>
          <span className="text-[10px] text-gray-400">Moisture & diaphragm load factor</span>
        </div>
      </div>

      {/* Dual Channel Comparison Chart */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Dual-Sensor Agreement & Redundancy Tracking</h3>
            <p className="text-[11px] text-gray-500">Cross-channel validation between digital diaphragm and analog transducer</p>
          </div>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${latest?.sensor_agreement ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {latest?.sensor_agreement ? 'CHANNELS IN AGREEMENT' : 'CHANNELS DISAGREE'}
          </span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="timestamp" tick={false} stroke="#94A3B8" />
              <YAxis domain={['auto', 'auto']} stroke="#94A3B8" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="digital_pressure" name="Primary Digital (kPa)" stroke="#1646E8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="analog_pressure" name="Redundant Analog (kPa)" stroke="#8D32E8" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              <Line type="monotone" dataKey="expected_pressure" name="Digital Twin Expected (kPa)" stroke="#55B927" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Environmental Thermal & Humidity Influence Chart */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Environmental Coupling: Temperature & Humidity Dynamics</h3>
            <p className="text-[11px] text-gray-500">Monitored ambient fluctuations feeding into the Digital Twin compensation model</p>
          </div>
          <Thermometer className="w-4 h-4 text-amber-500" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="timestamp" tick={false} stroke="#94A3B8" />
              <YAxis yAxisId="left" stroke="#D97706" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke="#2563EB" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#D97706" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (% RH)" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
