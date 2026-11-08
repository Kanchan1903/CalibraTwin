import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldCheck, Calendar, ArrowRight, Activity } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import api from '../services/api';
import type { RulPrediction } from '../types';

export const PredictiveRULPage: React.FC = () => {
  const { selectedDevice } = useDevice();
  const [rul, setRul] = useState<RulPrediction | null>(null);

  const fetchRul = async () => {
    if (!selectedDevice) return;
    try {
      const res = await api.get(`/analytics/rul/${selectedDevice.device_id}`);
      setRul(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRul();
    const interval = setInterval(fetchRul, 5000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#111827]">Predictive Maintenance & Remaining Useful Life (RUL)</h2>
        <p className="text-xs text-gray-500">
          Physics-informed regression forecasting sensor lifetime before critical drift threshold violation
        </p>
      </div>

      {/* Model disclaimer note */}
      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center space-x-2">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
        <span>
          <strong>Note:</strong> RUL calculations are statistical predictive maintenance models based on current drift rates and historical trends. They represent an anticipated calibration window rather than a deterministic physical failure date.
        </span>
      </div>

      {/* RUL Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">
            Remaining Calibration Life
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold text-[#1646E8]">
              {rul ? rul.remaining_days : '--'}
            </span>
            <span className="text-sm font-semibold text-gray-600">days</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-2 block">
            Time until ±{selectedDevice?.drift_critical_threshold_kpa} kPa breach
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">
            Predicted Calibration Date
          </span>
          <div className="flex items-center space-x-2 my-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-lg font-bold text-gray-800">
              {rul?.predicted_calibration_date ? new Date(rul.predicted_calibration_date).toLocaleDateString() : 'Nominal (>90d)'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block">
            Scheduled maintenance target
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">
            Maintenance Priority
          </span>
          <div className="my-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-md ${
              rul?.maintenance_priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
              rul?.maintenance_priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
              'bg-green-100 text-green-800'
            }`}>
              {rul?.maintenance_priority || 'LOW'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block">
            Based on remaining margin
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase block mb-1">
            Model Confidence Score
          </span>
          <div className="flex items-baseline space-x-1 my-1">
            <span className="text-3xl font-extrabold text-[#55B927]">
              {rul ? `${(rul.confidence_score * 100).toFixed(0)}%` : '--'}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 block">
            Statistical regression certainty
          </span>
        </div>
      </div>

      {/* Degradation Progression Bar */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs">
        <h3 className="text-sm font-bold text-[#111827] mb-2">Sensor Health & Degradation Lifecycle</h3>
        <p className="text-xs text-gray-500 mb-4">
          Graphical representation of remaining sensor margin before recalibration is mandatory
        </p>

        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden flex">
          <div
            className="bg-[#1646E8] h-full"
            style={{ width: `${Math.min(100, Math.max(5, ((rul?.remaining_days || 30) / 60) * 100))}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-gray-500 mt-2">
          <span>0 Days (Action Required)</span>
          <span>30 Days (Warning Window)</span>
          <span>60+ Days (Optimal Margin)</span>
        </div>
      </div>
    </div>
  );
};
