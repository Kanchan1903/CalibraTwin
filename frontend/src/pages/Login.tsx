import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@calibratwin.io');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.access_token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (role: string) => {
    if (role === 'admin') {
      setEmail('admin@calibratwin.io');
      setPassword('Admin@12345');
    } else if (role === 'engineer') {
      setEmail('engineer@calibratwin.io');
      setPassword('Engineer@123');
    } else {
      setEmail('viewer@calibratwin.io');
      setPassword('Viewer@123');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-[#E5E7EB] p-8">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#1646E8] flex items-center justify-center text-white font-bold text-2xl shadow-sm mb-3">
            C
          </div>
          <h2 className="text-xl font-bold text-[#111827]">CalibraTwin Platform</h2>
          <p className="text-xs text-gray-500 mt-1 text-center">
            Intelligent Sensor Monitoring, Drift Analytics & Self-Calibration
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1646E8] focus:border-[#1646E8]"
                placeholder="operator@plant.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#1646E8] focus:border-[#1646E8]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#1646E8] hover:bg-[#123FD5] text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to CalibraTwin'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Accounts Quick-Select */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
            Demo Credentials
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setDemoRole('admin')}
              className="py-1.5 px-2 bg-gray-50 hover:bg-[#EAF0FF] hover:text-[#1646E8] border border-gray-200 text-[11px] font-medium rounded text-center transition"
            >
              Administrator
            </button>
            <button
              onClick={() => setDemoRole('engineer')}
              className="py-1.5 px-2 bg-gray-50 hover:bg-[#EAF0FF] hover:text-[#1646E8] border border-gray-200 text-[11px] font-medium rounded text-center transition"
            >
              Engineer
            </button>
            <button
              onClick={() => setDemoRole('viewer')}
              className="py-1.5 px-2 bg-gray-50 hover:bg-[#EAF0FF] hover:text-[#1646E8] border border-gray-200 text-[11px] font-medium rounded text-center transition"
            >
              Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
