import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeviceProvider } from './context/DeviceContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { LiveSensorMonitoring } from './pages/LiveSensorMonitoring';
import { DigitalTwinEnginePage } from './pages/DigitalTwinEnginePage';
import { AIDriftAnalyticsPage } from './pages/AIDriftAnalyticsPage';
import { PredictiveRULPage } from './pages/PredictiveRULPage';
import { SelfCalibrationPage } from './pages/SelfCalibrationPage';
import { AlertsRecommendationsPage } from './pages/AlertsRecommendationsPage';
import { CalibrationPassportPage } from './pages/CalibrationPassportPage';
import { DeviceManagementPage } from './pages/DeviceManagementPage';
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage';
import { SimulationLabPage } from './pages/SimulationLabPage';
import { BenchmarkingPage } from './pages/BenchmarkingPage';
import { ProductionObservabilityPage } from './pages/ProductionObservabilityPage';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DeviceProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><OverviewDashboard /></ProtectedRoute>} />
              <Route path="/monitoring" element={<ProtectedRoute><LiveSensorMonitoring /></ProtectedRoute>} />
              <Route path="/digital-twin" element={<ProtectedRoute><DigitalTwinEnginePage /></ProtectedRoute>} />
              <Route path="/drift-analytics" element={<ProtectedRoute><AIDriftAnalyticsPage /></ProtectedRoute>} />
              <Route path="/predictive-rul" element={<ProtectedRoute><PredictiveRULPage /></ProtectedRoute>} />
              <Route path="/calibration" element={<ProtectedRoute><SelfCalibrationPage /></ProtectedRoute>} />
              <Route path="/simulation-lab" element={<ProtectedRoute><SimulationLabPage /></ProtectedRoute>} />
              <Route path="/benchmarking" element={<ProtectedRoute><BenchmarkingPage /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><AlertsRecommendationsPage /></ProtectedRoute>} />
              <Route path="/passport" element={<ProtectedRoute><CalibrationPassportPage /></ProtectedRoute>} />
              <Route path="/devices" element={<ProtectedRoute><DeviceManagementPage /></ProtectedRoute>} />
              <Route path="/observability" element={<ProtectedRoute><ProductionObservabilityPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsAnalyticsPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </DeviceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
