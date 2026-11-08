import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, ShieldAlert, Filter, Check } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Alert } from '../types';

export const AlertsRecommendationsPage: React.FC = () => {
  const { selectedDevice } = useDevice();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchAlerts = async () => {
    try {
      const url = statusFilter === 'ALL' ? '/alerts' : `/alerts?status=${statusFilter}`;
      const res = await api.get(url);
      setAlerts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const updateAlertStatus = async (alertId: number, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      await api.put(`/alerts/${alertId}`, { resolution_status: newStatus });
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">Centralized Alert & Incident Management</h2>
          <p className="text-xs text-gray-500">
            Categorized notifications, probable root causes and engineering mitigation actions
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-1 bg-white border border-[#E5E7EB] rounded-lg p-1 shadow-xs">
          {['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                statusFilter === st
                  ? 'bg-[#1646E8] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-[#E5E7EB] text-center text-gray-400 text-xs">
            No incidents or active alerts found matching the selected filter.
          </div>
        ) : (
          alerts.map((al) => (
            <div
              key={al.id}
              className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    al.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                    al.severity === 'High' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {al.severity.toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-gray-900">{al.alert_type}</span>
                  <span className="text-xs text-gray-400 font-mono">[{al.device_id}]</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    al.resolution_status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                    al.resolution_status === 'ACKNOWLEDGED' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {al.resolution_status}
                  </span>
                </div>
                <p className="text-xs text-gray-700 font-medium">{al.description}</p>
                
                {al.probable_root_cause && (
                  <p className="text-[11px] text-gray-500">
                    <strong className="text-gray-700">Probable Root Cause:</strong> {al.probable_root_cause}
                  </p>
                )}
                {al.recommended_action && (
                  <p className="text-[11px] text-[#1646E8]">
                    <strong className="text-[#123FD5]">Recommended Action:</strong> {al.recommended_action}
                  </p>
                )}
                <span className="text-[10px] text-gray-400 block pt-1">
                  Raised: {new Date(al.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Action buttons */}
              {user?.role !== 'Viewer' && al.resolution_status !== 'RESOLVED' && (
                <div className="flex items-center space-x-2 shrink-0">
                  {al.resolution_status === 'OPEN' && (
                    <button
                      onClick={() => updateAlertStatus(al.id, 'ACKNOWLEDGED')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded transition"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => updateAlertStatus(al.id, 'RESOLVED')}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-[#1646E8] hover:bg-[#123FD5] text-white text-xs font-semibold rounded transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
