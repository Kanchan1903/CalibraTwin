import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Cpu,
  TrendingUp,
  Clock,
  Wrench,
  Bell,
  ShieldCheck,
  Server,
  FileBarChart,
  FlaskConical,
  Award,
  Play,
  Pause,
  LogOut,
  Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const {
    devices,
    selectedDevice,
    setSelectedDeviceId,
    isSimulating,
    setIsSimulating,
    simulationMode,
    setSimulationMode
  } = useDevice();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Live Sensor Monitoring', path: '/monitoring', icon: Activity },
    { name: 'Digital Twin Engine', path: '/digital-twin', icon: Cpu },
    { name: 'AI Drift Analytics', path: '/drift-analytics', icon: TrendingUp },
    { name: 'Predictive RUL', path: '/predictive-rul', icon: Clock },
    { name: 'Self-Calibration', path: '/calibration', icon: Wrench },
    { name: 'Simulation Lab', path: '/simulation-lab', icon: FlaskConical },
    { name: 'Benchmarking', path: '/benchmarking', icon: Award },
    { name: 'Alerts & Incidents', path: '/alerts', icon: Bell },
    { name: 'Calibration Passport', path: '/passport', icon: ShieldCheck },
    { name: 'Device Management', path: '/devices', icon: Server },
    { name: 'Reports & Exports', path: '/reports', icon: FileBarChart },
  ];

  return (
    <div className="flex h-screen bg-[#F7F9FC] text-[#111827] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col justify-between shadow-sm">
        <div>
          {/* Brand header */}
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-[#1646E8] flex items-center justify-center text-white font-bold text-lg">
                C
              </div>
              <div>
                <h1 className="font-bold text-base tracking-tight text-[#111827]">CalibraTwin</h1>
                <p className="text-[10px] uppercase font-semibold text-[#1646E8] tracking-wider">Industrial IoT & Twin</p>
              </div>
            </div>
          </div>

          {/* Device Selector */}
          <div className="p-3 bg-[#EAF0FF] border-b border-[#CBD5E1]">
            <label className="text-[11px] font-semibold text-[#123FD5] uppercase tracking-wider block mb-1">
              Active Sensor Node
            </label>
            <select
              value={selectedDevice?.device_id || ''}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-[#94A3B8] rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1646E8]"
            >
              {devices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_id} ({d.name})
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-[#1646E8] text-white shadow-sm font-semibold'
                        : 'text-gray-600 hover:bg-[#EAF0FF] hover:text-[#1646E8]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User badge & logout */}
        <div className="p-3 border-t border-[#E5E7EB] bg-white">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-[#111827]">{user?.full_name || 'Operator'}</p>
              <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#EAF0FF] text-[#1646E8]">
                {user?.role || 'Engineer'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 z-10 shadow-xs">
          <div className="flex items-center space-x-3">
            {selectedDevice?.is_demo ? (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#FFF4CC] text-[#B45309] border border-[#FFB900]">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#FFB900]" />
                <span>DEMO SIMULATION MODE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#EAF8DC] text-[#2E7D32] border border-[#55B927]">
                <Radio className="w-3.5 h-3.5 text-[#55B927]" />
                <span>ESP32 HARDWARE LIVE</span>
              </span>
            )}
            <span className="text-xs text-gray-500 font-mono">
              Node: <strong className="text-gray-800">{selectedDevice?.device_id}</strong> | Status: <strong className={selectedDevice?.status === 'ONLINE' ? 'text-green-600' : 'text-amber-600'}>{selectedDevice?.status}</strong>
            </span>
          </div>

          {/* Simulator Bar Controls */}
          {selectedDevice?.is_demo && (
            <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1">
              <label className="text-[11px] font-medium text-gray-500">Inject Fault/Behavior:</label>
              <select
                value={simulationMode}
                onChange={(e) => setSimulationMode(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-0.5 bg-white text-gray-800 font-medium focus:outline-none"
              >
                <option value="normal">1. Normal Operation</option>
                <option value="offset_drift">2. Gradual Offset Drift (+)</option>
                <option value="gain_drift">3. Gain Drift Multiplier</option>
                <option value="temperature_variation">4. Temperature Shock Cycle</option>
                <option value="humidity_variation">5. Humidity Deviation Cycle</option>
                <option value="sudden_fault">6. Sudden Diaphragm Fault</option>
                <option value="noisy_sensor">7. High Noise / Jitter</option>
                <option value="wifi_disconnection">8. Wi-Fi Disconnection</option>
                <option value="successful_calibration">9. Successful Calibration State</option>
                <option value="failed_calibration">10. Failed / Unstable Calibration</option>
              </select>

              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded ${
                  isSimulating
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-[#1646E8] text-white hover:bg-[#123FD5]'
                }`}
              >
                {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isSimulating ? 'Pause Sim' : 'Start Sim'}</span>
              </button>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F7F9FC]">
          {children}
        </main>
      </div>
    </div>
  );
};
