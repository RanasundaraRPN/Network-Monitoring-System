import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Login } from './components/Login.tsx';
import { Header } from './components/Header.tsx';
import { DeviceGrid } from './components/DeviceGrid.tsx';
import { DeviceDetail } from './components/DeviceDetail.tsx';
import { AddEditDeviceModal } from './components/AddEditDeviceModal.tsx';
import { Device, Alert, DashboardSummary } from './types.ts';
import { Activity, RefreshCw, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MainContent: React.FC = () => {
  const { user, token, loading } = useAuth();
  
  // Dashboard states
  const [devices, setDevices] = useState<(Device & { latestCheck: any | null })[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalDevices: 0,
    activeDevices: 0,
    warningDevices: 0,
    downDevices: 0,
    avgLatency: 0,
  });
  
  // Navigation / Modal States
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null);
  
  // Statuses
  const [dataLoading, setDataLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criticalBanner, setCriticalBanner] = useState<string | null>(null);

  // Fetch all dashboard data
  const fetchDashboardData = async (silent = false) => {
    if (!token) return;
    if (!silent) setDataLoading(true);
    setError(null);
    try {
      // Parallel fetch for devices, alerts, and summary stats
      const [devicesRes, alertsRes, summaryRes] = await Promise.all([
        fetch('/api/devices', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/alerts', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/dashboard/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      if (devicesRes.ok && alertsRes.ok && summaryRes.ok) {
        const devicesData = await devicesRes.json();
        const alertsData = await alertsRes.json();
        const summaryData = await summaryRes.json();

        setDevices(devicesData);
        setAlerts(alertsData);
        setSummary(summaryData);

        // Update selected device with fresh details if open
        if (selectedDevice) {
          const fresh = devicesData.find((d: Device) => d.id === selectedDevice.id);
          if (fresh) setSelectedDevice(fresh);
        }

        // Handle offline critical banners
        const activeDownAlerts = alertsData.filter((a: Alert) => !a.resolvedAt && a.severity === 'CRITICAL');
        if (activeDownAlerts.length > 0) {
          const deviceNames = activeDownAlerts.map((a: Alert) => a.deviceName).join(', ');
          setCriticalBanner(`CRITICAL ALARM: Monitored system offline. Down hosts: [${deviceNames}]`);
        } else {
          setCriticalBanner(null);
        }
      } else {
        setError('Failed to load real-time network states. Retrying...');
      }
    } catch (err) {
      console.error('Failed to sync dashboard data:', err);
      setError('Connection to operations server interrupted.');
    } finally {
      if (!silent) setDataLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      
      // Real-time synchronization: Poll every 10 seconds
      const interval = setInterval(() => {
        fetchDashboardData(true);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [token]);

  // Handle Manual Refresh
  const handleManualRefresh = async () => {
    if (!token || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/devices/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchDashboardData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Save Device (Add or Edit)
  const handleSaveDevice = async (deviceData: any) => {
    if (!token) return;
    const url = deviceToEdit ? `/api/devices/${deviceToEdit.id}` : '/api/devices';
    const method = deviceToEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(deviceData),
    });

    if (res.ok) {
      setDeviceToEdit(null);
      await fetchDashboardData();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save device configurations.');
    }
  };

  // Handle Delete Device
  const handleDeleteDevice = async (id: number) => {
    if (!token) return;
    const res = await fetch(`/api/devices/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.ok) {
      if (selectedDevice?.id === id) {
        setSelectedDevice(null);
      }
      await fetchDashboardData();
    } else {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete device.');
    }
  };

  // Auth Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-4">
        <Activity className="w-12 h-12 text-indigo-400 animate-pulse mb-4" />
        <p className="text-slate-500 text-sm font-sans tracking-wide">Syncing Security Credentials...</p>
      </div>
    );
  }

  // Not Logged In
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-300">
      {/* Header with real-time stats */}
      <Header
        summary={summary}
        alerts={alerts}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Critical Alerts Banner */}
        <AnimatePresence>
          {criticalBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 text-red-400 text-sm font-semibold select-none shadow-lg shadow-red-500/5 relative overflow-hidden"
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-red-500" />
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 animate-bounce" />
                <span>{criticalBanner}</span>
              </div>
              <button
                onClick={() => setCriticalBanner(null)}
                className="text-red-400/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3 text-yellow-400 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Route View (Grid vs Detail) */}
        {dataLoading && devices.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-500 text-xs gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Retrieving operations dashboard...</span>
          </div>
        ) : selectedDevice ? (
          <DeviceDetail
            device={selectedDevice}
            onBack={() => setSelectedDevice(null)}
            onEdit={(dev) => {
              setDeviceToEdit(dev);
              setIsAddEditModalOpen(true);
            }}
            onDelete={handleDeleteDevice}
            token={token}
          />
        ) : (
          <DeviceGrid
            devices={devices}
            onSelectDevice={setSelectedDevice}
            onAddDevice={() => {
              setDeviceToEdit(null);
              setIsAddEditModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Add / Edit Device Overlay Modal */}
      <AddEditDeviceModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setDeviceToEdit(null);
        }}
        onSave={handleSaveDevice}
        deviceToEdit={deviceToEdit}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
