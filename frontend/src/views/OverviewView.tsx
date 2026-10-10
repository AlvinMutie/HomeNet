import React from 'react';
import type { Device, DashboardStats, RouterStatus } from '../types';
import { MetricCard } from '../components/MetricCard';
import { RouterStatusCard } from '../components/RouterStatusCard';
import { NetworkCharts } from '../components/NetworkCharts';
import { 
  Wifi, 
  ShieldCheck, 
  HelpCircle, 
  Clock, 
  ArrowRight,
  Edit2,
  Copy,
  Check,
  Smartphone,
  Laptop,
  Tv,
  Router as RouterIcon,
  Cpu
} from 'lucide-react';

interface OverviewViewProps {
  stats: DashboardStats | null;
  devices: Device[];
  routerStatus: RouterStatus | null;
  isScanning: boolean;
  onTriggerScan: () => void;
  onNavigateToDevices: () => void;
  onOpenDiagnostics: () => void;
  onEditDevice: (device: Device) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  devices,
  routerStatus,
  isScanning,
  onTriggerScan,
  onNavigateToDevices,
  onOpenDiagnostics,
  onEditDevice,
}) => {
  const [copiedIp, setCopiedIp] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const getDeviceIcon = (device: Device) => {
    switch (device.device_type) {
      case 'smart_tv':
        return <Tv className="w-3.5 h-3.5 text-purple-400" />;
      case 'smartphone':
        return <Smartphone className="w-3.5 h-3.5 text-sky-400" />;
      case 'laptop':
        return <Laptop className="w-3.5 h-3.5 text-indigo-400" />;
      case 'router':
        return <RouterIcon className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const recentActiveDevices = devices.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Devices"
          value={stats ? stats.responding_devices : '...'}
          subtitle={`${stats ? stats.total_devices : 0} total discovered in DB`}
          icon={<Wifi className="w-5 h-5" />}
          iconBgColor="bg-sky-500/10 text-sky-400 border-sky-500/20"
          badge={{
            text: `${stats ? Math.round((stats.responding_devices / (stats.total_devices || 1)) * 100) : 0}% Active`,
            variant: 'info',
          }}
        />

        <MetricCard
          title="Trusted Devices"
          value={stats ? stats.trusted_devices : '...'}
          subtitle="Known personal & family equipment"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          badge={{
            text: 'Classified',
            variant: 'success',
          }}
        />

        <MetricCard
          title="Needs Review / Unknown"
          value={stats ? stats.review_devices + stats.untrusted_devices : '...'}
          subtitle={`${stats ? stats.review_devices : 0} unassigned, ${stats ? stats.untrusted_devices : 0} untrusted`}
          icon={<HelpCircle className="w-5 h-5" />}
          iconBgColor="bg-amber-500/10 text-amber-400 border-amber-500/20"
          badge={{
            text: 'Needs Review',
            variant: 'warning',
          }}
        />

        <MetricCard
          title="Last Network Scan"
          value={
            stats?.last_scan
              ? `${stats.last_scan.duration_seconds}s`
              : 'Standby'
          }
          subtitle={
            stats?.last_scan?.scan_time
              ? new Date(stats.last_scan.scan_time).toLocaleTimeString()
              : 'Scan to refresh'
          }
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          badge={{
            text: stats?.last_scan?.subnet || '192.168.100.0/24',
            variant: 'neutral',
          }}
        />
      </div>

      {/* Router Gateway Hardware & Internet Telemetry */}
      <RouterStatusCard
        routerStatus={routerStatus}
        onOpenDiagnostics={onOpenDiagnostics}
      />

      {/* Scan Status Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>Local subnet discovery:</span>
          <code className="text-sky-300 bg-slate-950 px-2 py-0.5 rounded font-mono">
            {stats?.last_scan?.subnet || '192.168.100.0/24'} (wlan0)
          </code>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">
            {stats?.last_scan?.devices_found ?? devices.length} responding devices found
          </span>
        </div>
        <button
          onClick={onTriggerScan}
          disabled={isScanning}
          className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center space-x-1 transition-colors self-start sm:self-auto"
        >
          <span>{isScanning ? 'Scan in progress...' : 'Trigger rescan now'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Network Analytics Visualizations */}
      {stats && <NetworkCharts stats={stats} devices={devices} />}

      {/* Recently Discovered / Active Devices Quick Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Recently Active Devices</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Discovered via ARP sweep on your Safaricom home network
            </p>
          </div>
          <button
            onClick={onNavigateToDevices}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span>View All Devices ({devices.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-3 pl-2">Device Name / Host</th>
                <th className="pb-3">IP Address</th>
                <th className="pb-3">MAC Address</th>
                <th className="pb-3">Manufacturer</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Trust</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {recentActiveDevices.map((device) => {
                const displayName = device.custom_name || device.hostname || device.ip_address;
                const isTrusted = device.is_trusted === 1;
                const isUntrusted = device.is_trusted === 0;

                return (
                  <tr key={device.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3 pl-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0">
                          {getDeviceIcon(device)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white">{displayName}</span>
                            {device.custom_name && device.hostname && (
                              <span className="text-[10px] text-slate-500 font-mono">({device.hostname})</span>
                            )}
                          </div>
                          {device.model_name && (
                            <span className="text-[10px] text-sky-400 font-mono block">
                              {device.model_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-sky-300">
                      <div className="flex items-center space-x-1.5">
                        <span>{device.ip_address}</span>
                        <button
                          onClick={(e) => copyToClipboard(device.ip_address, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5"
                          title="Copy IP"
                        >
                          {copiedIp === device.ip_address ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {device.mac_address || <span className="text-slate-600">N/A</span>}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {device.manufacturer}
                      </span>
                    </td>
                    <td className="py-3">
                      {device.is_active ? (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Responding {device.latency_ms ? `(${device.latency_ms.toFixed(1)}ms)` : ''}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          <span>Offline</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {isTrusted && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          Trusted
                        </span>
                      )}
                      {isUntrusted && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                          Untrusted
                        </span>
                      )}
                      {!isTrusted && !isUntrusted && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          Review
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => onEditDevice(device)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Edit Friendly Name & Trust"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
