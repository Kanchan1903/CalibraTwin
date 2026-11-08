import React, { useState } from 'react';
import { Server, Plus, Settings, Radio, CheckCircle, Shield } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Device } from '../types';

export const DeviceManagementPage: React.FC = () => {
  const { devices, selectedDevice, setSelectedDeviceId, refetchDevices } = useDevice();
  const { user } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('Process Plant Header 3');
  const [newRefPressure, setNewRefPressure] = useState(101.325);
  const [newDriftWarn, setNewDriftWarn] = useState(1.5);
  const [newDriftCrit, setNewDriftCrit] = useState(3.0);
  const [newMaxOffset, setNewMaxOffset] = useState(5.0);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceId || !newName) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/devices', {
        device_id: newDeviceId,
        name: newName,
        location: newLocation,
        reference_pressure_kpa: newRefPressure,
        drift_warn_threshold_kpa: newDriftWarn,
        drift_critical_threshold_kpa: newDriftCrit,
        max_offset_correction_kpa: newMaxOffset,
        is_demo: isDemoMode,
        auto_correct_enabled: true
      });
      refetchDevices();
      setShowAddModal(false);
      setSelectedDeviceId(newDeviceId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">Device Fleet & Sensor Node Provisioning</h2>
          <p className="text-xs text-gray-500">
            Register hardware ESP32 controllers, set safety thresholds and toggle operating modes
          </p>
        </div>

        {user?.role === 'Administrator' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#1646E8] hover:bg-[#123FD5] text-white text-xs font-semibold rounded-md shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Sensor Node</span>
          </button>
        )}
      </div>

      {/* Device List Table */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#F7F9FC] text-gray-600 border-b border-gray-200 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Device ID</th>
              <th className="py-3 px-4">Node Name</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Baseline Reference</th>
              <th className="py-3 px-4">Drift Thresholds</th>
              <th className="py-3 px-4">Mode</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {devices.map((d) => (
              <tr key={d.device_id} className={`hover:bg-gray-50 ${selectedDevice?.device_id === d.device_id ? 'bg-[#EAF0FF]/50 font-medium' : ''}`}>
                <td className="py-3 px-4 font-mono font-bold text-gray-800">{d.device_id}</td>
                <td className="py-3 px-4">{d.name}</td>
                <td className="py-3 px-4 text-gray-500">{d.location}</td>
                <td className="py-3 px-4 font-semibold">{d.reference_pressure_kpa} kPa</td>
                <td className="py-3 px-4 text-gray-600">
                  Warn: ±{d.drift_warn_threshold_kpa} | Crit: ±{d.drift_critical_threshold_kpa} kPa
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    d.is_demo ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {d.is_demo ? 'DEMO SIMULATION' : 'HARDWARE ESP32'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    d.status === 'ONLINE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {d.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => setSelectedDeviceId(d.device_id)}
                    className="px-2.5 py-1 text-xs text-[#1646E8] hover:bg-[#EAF0FF] rounded font-semibold transition"
                  >
                    Select Active
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Device Registration */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-lg w-full">
            <h3 className="text-base font-bold text-gray-900 mb-1">Provision New IoT Node</h3>
            <p className="text-xs text-gray-500 mb-4">Assign hardware ID, reference conditions and bounded safety envelope.</p>

            {error && <div className="p-2 mb-3 bg-red-50 text-red-700 text-xs rounded">{error}</div>}

            <form onSubmit={handleRegisterDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Unique Device ID (Hardware Topic Identifier)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CALIBRA-ESP32-003"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-[#1646E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sensor Node Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Turbine Fuel Pressure Transducer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1646E8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nominal Pressure (kPa)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRefPressure}
                    onChange={(e) => setNewRefPressure(parseFloat(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1646E8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Safety Bound Limit (kPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMaxOffset}
                    onChange={(e) => setNewMaxOffset(parseFloat(e.target.value))}
                    className="w-full text-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1646E8]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isDemo"
                  checked={isDemoMode}
                  onChange={(e) => setIsDemoMode(e.target.checked)}
                  className="rounded text-[#1646E8] focus:ring-[#1646E8]"
                />
                <label htmlFor="isDemo" className="text-xs font-semibold text-gray-700">
                  Enable Simulation Mode (Disable when streaming physical ESP32 MQTT)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#1646E8] text-white rounded text-xs font-semibold hover:bg-[#123FD5]"
                >
                  {loading ? 'Registering...' : 'Complete Provisioning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
