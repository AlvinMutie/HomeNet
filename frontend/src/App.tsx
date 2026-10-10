import { useState, useEffect, useCallback } from 'react';
import type { Device, DashboardStats, RouterStatus } from './types';
import { 
  fetchStats, 
  fetchDevices, 
  fetchRouterStatus, 
  triggerScan, 
  patchDevice, 
  deleteDevice 
} from './services/api';
import { Header } from './components/Header';
import { OverviewView } from './views/OverviewView';
import { DevicesView } from './views/DevicesView';
import { RouterView } from './views/RouterView';
import { SettingsView } from './views/SettingsView';
import { DeviceEditModal } from './components/DeviceEditModal';
import { BlockExplanationModal } from './components/BlockExplanationModal';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'router' | 'settings'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [routerStatus, setRouterStatus] = useState<RouterStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [blockingDevice, setBlockingDevice] = useState<Device | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoadingInitial(true);
    setError(null);
    try {
      const [statsData, devicesData, routerData] = await Promise.all([
        fetchStats().catch((err) => {
          console.warn('Failed to load stats:', err);
          return null;
        }),
        fetchDevices().catch((err) => {
          console.warn('Failed to load devices:', err);
          return [];
        }),
        fetchRouterStatus().catch((err) => {
          console.warn('Failed to load router status:', err);
          return null;
        }),
      ]);

      if (statsData) setStats(statsData);
      setDevices(devicesData);
      if (routerData) setRouterStatus(routerData);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend service');
    } finally {
      if (isInitial) setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    // Poll stats and router health every 30 seconds
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleTriggerScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      showToast('Scanning local network 192.168.100.0/24...', 'info');
      const scanResult = await triggerScan();
      showToast(
        `Scan completed: Found ${scanResult.devices_found} responding devices in ${scanResult.duration_seconds}s`,
        'success'
      );
      await loadData(false);
    } catch (err: any) {
      showToast(`Scan error: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveDevice = async (
    deviceId: string,
    data: { custom_name?: string | null; is_trusted?: number; notes?: string | null }
  ) => {
    try {
      const updated = await patchDevice(deviceId, data);
      setDevices((prev) => prev.map((d) => (d.id === deviceId ? updated : d)));
      showToast(`Device "${updated.custom_name || updated.ip_address}" updated successfully.`, 'success');
      // Refresh stats
      fetchStats().then(setStats).catch(() => {});
    } catch (err: any) {
      showToast(`Failed to update device: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      await deleteDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      showToast('Device record removed.', 'info');
      fetchStats().then(setStats).catch(() => {});
    } catch (err: any) {
      showToast(`Error deleting device: ${err.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        routerStatus={routerStatus}
        isScanning={isScanning}
        onTriggerScan={handleTriggerScan}
        deviceCount={devices.length}
        respondingCount={devices.filter((d) => d.is_active).length}
      />

      {/* Toast Notification Floating Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30 shadow-emerald-950/50'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/30 shadow-rose-950/50'
                : 'bg-slate-900/90 text-sky-200 border-sky-500/30 shadow-black/50'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white ml-2 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingInitial ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-slate-900/70 border border-slate-800" />
              ))}
            </div>
            <div className="h-44 rounded-2xl bg-slate-900/70 border border-slate-800" />
            <div className="h-72 rounded-2xl bg-slate-900/70 border border-slate-800" />
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Backend Connection Error</h3>
            <p className="text-xs text-rose-300/90 mt-1 mb-4 leading-relaxed">{error}</p>
            <p className="text-xs text-slate-400 mb-6">
              Ensure the HomeNet FastAPI backend is running on <code className="text-sky-300 font-mono">http://127.0.0.1:8000</code>.
            </p>
            <button
              onClick={() => loadData(true)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewView
                stats={stats}
                devices={devices}
                routerStatus={routerStatus}
                isScanning={isScanning}
                onTriggerScan={handleTriggerScan}
                onNavigateToDevices={() => setActiveTab('devices')}
                onOpenDiagnostics={() => setActiveTab('router')}
                onEditDevice={(device) => setEditingDevice(device)}
              />
            )}

            {activeTab === 'devices' && (
              <DevicesView
                devices={devices}
                isScanning={isScanning}
                onTriggerScan={handleTriggerScan}
                onEditDevice={(device) => setEditingDevice(device)}
                onBlockDevice={(device) => setBlockingDevice(device)}
                onDeleteDevice={handleDeleteDevice}
              />
            )}

            {activeTab === 'router' && (
              <RouterView initialStatus={routerStatus} />
            )}

            {activeTab === 'settings' && (
              <SettingsView />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            HomeNet Manager • Safaricom Huawei HG8145V6 Fibre Gateway Dashboard
          </p>
          <p className="text-slate-400">
            Kali Linux Environment • Unprivileged ICMP &amp; Kernel ARP Discovery
          </p>
        </div>
      </footer>

      {/* Modals */}
      {editingDevice && (
        <DeviceEditModal
          device={editingDevice}
          isOpen={!!editingDevice}
          onClose={() => setEditingDevice(null)}
          onSave={handleSaveDevice}
        />
      )}

      {blockingDevice && (
        <BlockExplanationModal
          device={blockingDevice}
          isOpen={!!blockingDevice}
          onClose={() => setBlockingDevice(null)}
        />
      )}
    </div>
  );
}

export default App;
