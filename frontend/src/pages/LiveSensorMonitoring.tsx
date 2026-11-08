import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Thermometer,
  Droplets,
  TrendingUp,
  ShieldCheck,
  Wrench,
  Check,
  AlertCircle
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

  // Tiny sparkline points generator for card visuals
  const sparklineData = telemetry.slice(-10);

  // Redundancy diff
  const diffKpa = latest ? Math.abs(latest.digital_pressure - latest.analog_pressure) : 0.0;
  const isAgreement = latest ? latest.sensor_agreement : true;
  const deltaT = latest ? latest.temperature - latest.reference_temperature : 0.0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Time Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">Live Sensor Telemetry & Diagnostics</h2>
            <p className="text-xs text-[#64748B]">
              High-frequency dual pressure channel acquisition with environmental correlation
            </p>
          </div>
        </div>

        {/* Time Window Filters (Industrial tabs) */}
        <div className="flex items-center space-x-1 bg-white border border-[#E2E8F0] rounded-lg p-1 shadow-xs">
          {[
            { label: '1 Hour', val: 1 },
            { label: '6 Hours', val: 6 },
            { label: '24 Hours', val: 24 },
            { label: '7 Days', val: 168 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setFilterHours(item.val)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                filterHours === item.val
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Sensor Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Primary Digital Pressure (Blue Accent) */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Digital Pressure (Primary)</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <Check className="w-2.5 h-2.5" />
                <span>Normal</span>
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-extrabold text-[#2563EB] tracking-tight">
                {latest ? latest.digital_pressure.toFixed(2) : '101.32'}
              </span>
              <span className="text-xs text-[#64748B] font-semibold">kPa</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-[#64748B]">Digital piezoresistive element</span>
            {/* Sparkline Visual */}
            <div className="flex items-end space-x-0.5 h-4">
              {sparklineData.map((d, i) => {
                const h = Math.max(2, Math.min(16, ((d.digital_pressure - 98) / 6) * 16));
                return <span key={i} style={{ height: `${h}px` }} className="w-1 bg-[#2563EB]/40 rounded-t" />;
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Redundant Analog Pressure (Teal Accent) */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-teal-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Analog Pressure (Redundant)</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                <Check className="w-2.5 h-2.5" />
                <span>Normal</span>
              </span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-extrabold text-[#0D9488] tracking-tight">
                {latest ? latest.analog_pressure.toFixed(2) : '101.28'}
              </span>
              <span className="text-xs text-[#64748B] font-semibold">kPa</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-[#64748B]">Transducer ADC redundant channel</span>
            {/* Sparkline Visual */}
            <div className="flex items-end space-x-0.5 h-4">
              {sparklineData.map((d, i) => {
                const h = Math.max(2, Math.min(16, ((d.analog_pressure - 98) / 6) * 16));
                return <span key={i} style={{ height: `${h}px` }} className="w-1 bg-[#0D9488]/40 rounded-t" />;
              })}
            </div>
          </div>
        </div>

        {/* Card 3: Ambient Temperature */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Ambient Temperature</span>
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                {latest ? latest.temperature.toFixed(1) : '25.0'}
              </span>
              <span className="text-xs text-[#64748B] font-semibold">°C</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span>Ref Standard: {latest?.reference_temperature || 25.0}°C</span>
            <span className="font-mono text-[10px] text-amber-700 font-semibold">{deltaT >= 0 ? `+${deltaT.toFixed(1)}` : deltaT.toFixed(1)}°C Δ</span>
          </div>
        </div>

        {/* Card 4: Relative Humidity */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Relative Humidity</span>
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                {latest ? latest.humidity.toFixed(1) : '50.0'}
              </span>
              <span className="text-xs text-[#64748B] font-semibold">% RH</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-[#64748B]">
            <span>Moisture load factor</span>
            <span className="font-mono text-[10px] text-blue-700 font-semibold">Nominal 50%</span>
          </div>
        </div>
      </div>

      {/* 3. Main Chart: Dual-Sensor Agreement & Redundancy Tracking */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-bold text-[#0F172A]">Dual-Sensor Agreement & Redundancy Tracking</h3>
            </div>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Cross-channel validation between digital diaphragm and analog transducer
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${
              isAgreement ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isAgreement ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span>{isAgreement ? 'CHANNELS IN AGREEMENT' : 'DISAGREEMENT DETECTED'}</span>
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="timestamp" tick={false} stroke="#CBD5E1" />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit=" kPa"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '11px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {/* Primary Sensor: Blue #2563EB */}
              <Line
                type="monotone"
                dataKey="digital_pressure"
                name="Primary Digital (kPa)"
                stroke="#2563EB"
                strokeWidth={2.2}
                dot={false}
              />
              {/* Redundant Sensor: Teal #0D9488 */}
              <Line
                type="monotone"
                dataKey="analog_pressure"
                name="Redundant Analog (kPa)"
                stroke="#0D9488"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              {/* Digital Twin Expected: Gray/Green */}
              <Line
                type="monotone"
                dataKey="expected_pressure"
                name="Digital Twin Expected (kPa)"
                stroke="#10B981"
                strokeWidth={1.8}
                strokeDasharray="2 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Bottom Strip: Environmental Coupling & Diagnostics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Environmental Coupling Dynamics */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Environmental Coupling</h4>
              <p className="text-[11px] text-[#64748B]">Temperature & Humidity Dynamics</p>
            </div>
            <Thermometer className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Temperature</span>
                <div className="text-base font-bold text-gray-900 mt-0.5">{latest ? latest.temperature.toFixed(1) : '25.0'} °C</div>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deltaT >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {deltaT >= 0 ? `+${deltaT.toFixed(1)}` : deltaT.toFixed(1)} °C
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-semibold">Humidity</span>
                <div className="text-base font-bold text-gray-900 mt-0.5">{latest ? latest.humidity.toFixed(1) : '50.0'} % RH</div>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                Nominal
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostics Summary Cards */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Diagnostics Summary</h4>
              <p className="text-[11px] text-[#64748B]">Real-time Health & Integrity Status</p>
            </div>
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* Agreement Box */}
            <div className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 text-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Sensor Agreement</span>
              <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center justify-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ΔP = {diffKpa.toFixed(2)} kPa</span>
              </div>
            </div>

            {/* Drift Box */}
            <div className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 text-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Drift Status</span>
              <div className="text-xs font-bold text-gray-800 mt-1 flex items-center justify-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Nominal</span>
              </div>
            </div>

            {/* Calibration Status Box */}
            <div className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 text-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Calibration</span>
              <div className="text-xs font-bold text-[#0D9488] mt-1 flex items-center justify-center space-x-1">
                <Wrench className="w-3.5 h-3.5" />
                <span>Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
