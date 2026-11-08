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
  Radio,
  Menu,
  ChevronDown
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
    { name: 'System Observability', path: '/observability', icon: Activity },
    { name: 'Reports & Exports', path: '/reports', icon: FileBarChart },
  ];

  return (
    <div className="flex h-screen bg-[#F4F7FB] text-[#0F172A] overflow-hidden antialiased">
      {/* Dark Navy Professional SCADA Sidebar */}
      <aside className="w-64 bg-[#101B35] flex flex-col justify-between shrink-0 shadow-lg border-r border-[#1E293B]">
        <div>
          {/* Logo Brand Header */}
          <div className="px-5 py-4 border-b border-[#1E293B]/70 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#0D9488] flex items-center justify-center text-white font-bold shadow-md">
                {/* Clean industrial pulse icon */}
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-white leading-tight">CalibraTwin</h1>
                <p className="text-[10px] uppercase font-semibold text-[#0D9488] tracking-widest">Industrial IoT & Twin</p>
              </div>
            </div>
          </div>

          {/* Device Selector on Dark Navy */}
          <div className="p-3 mx-3 my-2 bg-[#1A284D]/70 rounded-lg border border-[#273B66]">
            <label className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider block mb-1.5">
              Active Sensor Node
            </label>
            <div className="relative">
              <select
                value={selectedDevice?.device_id || ''}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full text-xs font-medium bg-[#101B35] text-white border border-[#334D80] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB] cursor-pointer"
              >
                {devices.map((d) => (
                  <option key={d.device_id} value={d.device_id}>
                    {d.device_id} ({d.name})
                  </option>
                ))}
              </select>
            </div>
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
                    `flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-sm font-semibold'
                        : 'text-[#94A3B8] hover:bg-[#1A284D] hover:text-white'
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

        {/* Compact User Designation / Role Section (RBAC Designation Only — No Name) */}
        <div className="p-3 border-t border-[#1E293B] bg-[#0C152B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-md bg-[#2563EB]/20 border border-[#2563EB]/50 flex items-center justify-center text-white text-[11px] font-bold">
                {(user?.role || 'OP').slice(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-semibold text-white block truncate leading-tight">
                  {user?.role || 'Operator'}
                </span>
                <span className="text-[10px] text-[#0D9488] font-mono tracking-wide">
                  RBAC AUTH
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#1E293B] rounded-md transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F7FB]">
        {/* Compact Top Toolbar */}
        <header className="h-13 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 z-10 shadow-xs">
          {/* Node and Hardware / Simulation Status */}
          <div className="flex items-center space-x-3 text-xs">
            <button className="text-gray-500 hover:text-gray-700 md:hidden">
              <Menu className="w-4 h-4" />
            </button>

            {selectedDevice?.is_demo ? (
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>DEMO SIMULATION MODE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span>ESP32 HARDWARE LIVE</span>
              </span>
            )}

            <div className="h-4 w-px bg-gray-200 hidden sm:block" />

            <span className="text-gray-500 hidden sm:inline text-xs font-mono">
              Node: <strong className="text-gray-900 font-semibold">{selectedDevice?.device_id || 'CALIBRA-ESP32-001'}</strong>
            </span>

            <div className="h-4 w-px bg-gray-200 hidden sm:block" />

            <span className="text-xs text-gray-500 hidden sm:flex items-center space-x-1.5">
              <span>Status:</span>
              <span className="inline-flex items-center space-x-1 font-semibold text-xs text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{selectedDevice?.status || 'ONLINE'}</span>
              </span>
            </span>
          </div>

          {/* Simulator Bar Controls (Aligned & Responsive) */}
          {selectedDevice?.is_demo && (
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                <label className="text-[11px] font-medium text-gray-500 hidden md:inline">Inject Fault/Behavior:</label>
                <select
                  value={simulationMode}
                  onChange={(e) => setSimulationMode(e.target.value)}
                  className="text-xs border-0 bg-transparent text-gray-800 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="normal">1. Normal Operation</option>
                  <option value="offset_drift">2. Gradual Offset Drift (+)</option>
                  <option value="gain_drift">3. Gain Drift Multiplier</option>
                  <option value="temperature_variation">4. Temperature Shock Cycle</option>
                  <option value="humidity_variation">5. Humidity Deviation Cycle</option>
                  <option value="sudden_fault">6. Sudden Diaphragm Fault</option>
                  <option value="sensor_noise">7. High Noise / Jitter</option>
                  <option value="sensor_disagreement">8. Sensor Disagreement</option>
                  <option value="wifi_disconnection">9. Wi-Fi Disconnection</option>
                  <option value="successful_calibration">10. Successful Calibration</option>
                  <option value="failed_calibration">11. Failed / Unstable Calibration</option>
                  <option value="recovery_after_rollback">12. Recovery After Rollback</option>
                </select>
              </div>

              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
                  isSimulating
                    ? 'bg-[#2563EB] text-white hover:bg-blue-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isSimulating ? 'Pause Sim' : 'Resume Sim'}</span>
              </button>
            </div>
          )}
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F4F7FB]">
          {children}
        </main>
      </div>
    </div>
  );
};
