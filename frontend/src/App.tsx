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
    data: { custom_name?: string | null; is_trusted?: number; notes?: string | null; device_type?: string }
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
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col font-sans selection:bg-[#4668f2]/30 selection:text-white expo-glow-bg">
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

      {/* Floating Toast Notification (Expo style) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-medium backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-[#111317]/95 text-emerald-300 border-[#1d472c] shadow-black/60'
                : toast.type === 'error'
                ? 'bg-[#111317]/95 text-rose-300 border-[#4a1c20] shadow-black/60'
                : 'bg-[#111317]/95 text-zinc-200 border-[#232731] shadow-black/60'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-zinc-300 flex-shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-zinc-400 hover:text-white ml-2 p-0.5 rounded-md hover:bg-[#181a20]"
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
                <div key={i} className="h-28 rounded-2xl bg-[#111317] border border-[#1e2127]" />
              ))}
            </div>
            <div className="h-44 rounded-2xl bg-[#111317] border border-[#1e2127]" />
            <div className="h-72 rounded-2xl bg-[#111317] border border-[#1e2127]" />
          </div>
        ) : error ? (
          <div className="bg-[#111317] border border-[#3b171c] rounded-2xl p-8 text-center max-w-lg mx-auto my-12 shadow-sm">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white tracking-tight">Backend Connection Error</h3>
            <p className="text-xs text-rose-300/90 mt-1 mb-4 leading-relaxed">{error}</p>
            <p className="text-xs text-zinc-400 mb-6">
              Ensure the HomeNet FastAPI backend is running on <code className="text-zinc-200 font-mono bg-[#0c0d10] px-1.5 py-0.5 rounded border border-[#1e2127]">http://127.0.0.1:8000</code>.
            </p>
            <button
              onClick={() => loadData(true)}
              className="px-4 py-2 text-xs font-semibold rounded-full bg-white hover:bg-zinc-200 text-black active:scale-95 transition-all shadow-sm"
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

      {/* Expo-style Minimalist Footer */}
      <footer className="border-t border-[#181a20] py-6 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-300">HomeNet Manager</span>
            <span>•</span>
            <span>Huawei HG8145V6 Fibre Gateway Dashboard</span>
          </div>
          <div className="flex items-center space-x-3 text-zinc-400 font-mono text-[11px]">
            <span>Kali Linux</span>
            <span>•</span>
            <span>Kernel ARP &amp; ICMP Engine</span>
          </div>
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
