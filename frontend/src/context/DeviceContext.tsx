import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Device } from '../types';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface DeviceContextType {
  devices: Device[];
  selectedDevice: Device | null;
  setSelectedDeviceId: (id: string) => void;
  refetchDevices: () => void;
  isSimulating: boolean;
  setIsSimulating: (val: boolean) => void;
  simulationMode: string;
  setSimulationMode: (mode: string) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('CALIBRA-ESP32-001');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationMode, setSimulationMode] = useState<string>('normal');

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data);
      if (res.data.length > 0 && !res.data.find((d: Device) => d.device_id === selectedDeviceId)) {
        setSelectedDeviceId(res.data[0].device_id);
      }
    } catch {
      // Ignored if not yet authenticated
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDevices();
    }
  }, [isAuthenticated]);

  // Periodic simulation ticker when active
  useEffect(() => {
    if (!isSimulating || !selectedDeviceId) return;

    const interval = setInterval(async () => {
      try {
        await api.post('/simulator/step', {
          device_id: selectedDeviceId,
          mode: simulationMode
        });
      } catch {
        // Handle gracefully
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating, selectedDeviceId, simulationMode]);

  const selectedDevice = devices.find(d => d.device_id === selectedDeviceId) || devices[0] || null;

  return (
    <DeviceContext.Provider
      value={{
        devices,
        selectedDevice,
        setSelectedDeviceId,
        refetchDevices: fetchDevices,
        isSimulating,
        setIsSimulating,
        simulationMode,
        setSimulationMode
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) throw new Error('useDevice must be used within DeviceProvider');
  return context;
};
