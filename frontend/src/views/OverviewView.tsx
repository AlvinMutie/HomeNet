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
        return <Smartphone className="w-3.5 h-3.5 text-blue-400" />;
      case 'laptop':
        return <Laptop className="w-3.5 h-3.5 text-indigo-400" />;
      case 'router':
        return <RouterIcon className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const recentActiveDevices = devices.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Expo-style Subnet Hero Banner */}
      <div className="relative rounded-2xl border border-[#1e2127] bg-[#111317]/90 p-6 overflow-hidden shadow-sm">
        {/* Subtle radial glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-[#4668f2]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#16181f] border border-[#252832] text-[11px] font-medium text-zinc-300">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Network Console</span>
              <span className="text-zinc-400">•</span>
              <span className="font-mono text-zinc-400">192.168.100.0/24</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Home Network Overview
            </h1>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              Real-time device discovery and telemetry powered by multi-signal fingerprinting and local kernel ARP resolution.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={onNavigateToDevices}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold active:scale-95 transition-all shadow-sm"
            >
              <span>View All Devices</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Devices"
          value={stats ? stats.responding_devices : '...'}
          subtitle={`${stats ? stats.total_devices : 0} total discovered in DB`}
          icon={<Wifi className="w-4 h-4" />}
          badge={{
            text: `${stats ? Math.round((stats.responding_devices / (stats.total_devices || 1)) * 100) : 0}% Online`,
            variant: 'info',
          }}
        />

        <MetricCard
          title="Trusted Devices"
          value={stats ? stats.trusted_devices : '...'}
          subtitle="Known personal & family equipment"
          icon={<ShieldCheck className="w-4 h-4" />}
          badge={{
            text: 'Classified',
            variant: 'success',
          }}
        />

        <MetricCard
          title="Review & Unknown"
          value={stats ? stats.review_devices + stats.untrusted_devices : '...'}
          subtitle={`${stats ? stats.review_devices : 0} unassigned, ${stats ? stats.untrusted_devices : 0} untrusted`}
          icon={<HelpCircle className="w-4 h-4" />}
          badge={{
            text: stats && stats.review_devices > 0 ? 'Pending' : 'Clear',
            variant: stats && stats.review_devices > 0 ? 'warning' : 'neutral',
          }}
        />

        <MetricCard
          title="Last Sweep"
          value={stats?.last_scan ? stats.last_scan.duration_seconds.toFixed(1) + 's' : 'Ready'}
          subtitle={
            stats?.last_scan
              ? `${new Date(stats.last_scan.scan_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Click Scan to probe'
          }
          icon={<Clock className="w-4 h-4" />}
          badge={{
            text: isScanning ? 'Running' : 'Sweep OK',
            variant: isScanning ? 'warning' : 'neutral',
          }}
        />
      </div>

      {/* Router Status Component */}
      <RouterStatusCard
        routerStatus={routerStatus}
        onOpenDiagnostics={onOpenDiagnostics}
      />

      {/* Visual Telemetry Charts */}
      {stats && <NetworkCharts stats={stats} devices={devices} />}

      {/* Recently Discovered / Active Devices Quick List (Expo style) */}
      <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#1c1f25] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Active Devices Feed</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Recently responding equipment on local subnet
            </p>
          </div>
          <button
            onClick={onNavigateToDevices}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#171920] hover:bg-[#20232b] text-zinc-300 border border-[#242832] text-xs font-semibold active:scale-95 transition-all"
          >
            <span>Manage All ({devices.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-[#1b1e24]">
          {recentActiveDevices.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No devices discovered yet. Click <strong className="text-zinc-200">Scan Subnet</strong> in the navigation header to start probing.
            </div>
          ) : (
            recentActiveDevices.map((device) => {
              const displayName = device.custom_name || device.hostname || device.ip_address;
              const isTrusted = device.is_trusted === 1;
              const isUntrusted = device.is_trusted === 0;

              return (
                <div
                  key={device.id}
                  className="p-4 flex items-center justify-between hover:bg-[#16181f]/80 transition-colors gap-3"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#16181f] border border-[#232731] flex items-center justify-center flex-shrink-0">
                      {getDeviceIcon(device)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {displayName}
                        </span>
                        {device.custom_name && device.hostname && (
                          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
                            ({device.hostname})
                          </span>
                        )}
                        {isTrusted && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#122b1c] text-[#46a758] border border-[#1d472c] font-medium">
                            Trusted
                          </span>
                        )}
                        {isUntrusted && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2b1214] text-[#e5484d] border border-[#4a1c20] font-medium">
                            Untrusted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-0.5">
                        <span className="truncate">{device.manufacturer || 'Unknown Vendor'}</span>
                        <span>•</span>
                        <span className="font-mono text-zinc-400">{device.mac_address || 'No MAC'}</span>
                        {device.is_randomized_mac && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#181a20] text-zinc-400 border border-[#242730]">
                            Private MAC
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {/* IP Badge with Copy */}
                    <button
                      onClick={(e) => copyToClipboard(device.ip_address, e)}
                      className="px-2.5 py-1 rounded-lg bg-[#0c0d10] hover:bg-[#16181f] border border-[#1e2127] text-zinc-200 font-mono text-[11px] flex items-center space-x-1.5 transition-colors"
                      title="Copy IP Address"
                    >
                      <span>{device.ip_address}</span>
                      {copiedIp === device.ip_address ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400" />
                      )}
                    </button>

                    {/* Latency */}
                    <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
                      {device.latency_ms !== null ? `${device.latency_ms.toFixed(1)}ms` : '—'}
                    </span>

                    {/* Edit Friendly Name */}
                    <button
                      onClick={() => onEditDevice(device)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#181a20] transition-colors"
                      title="Edit device name & trust level"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
