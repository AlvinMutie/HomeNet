import React, { useState, useMemo } from 'react';
import type { Device } from '../types';
import { 
  Search, 
  RotateCw, 
  ArrowUpDown, 
  ShieldCheck, 
  ShieldAlert, 
  HelpCircle, 
  Edit2, 
  Ban, 
  Copy, 
  Check, 
  Info, 
  Download,
  Trash2,
  Smartphone,
  Laptop,
  Tv,
  Cpu,
  Router,
  Tablet
} from 'lucide-react';

interface DevicesViewProps {
  devices: Device[];
  isScanning: boolean;
  onTriggerScan: () => void;
  onEditDevice: (device: Device) => void;
  onBlockDevice: (device: Device) => void;
  onDeleteDevice: (deviceId: string) => void;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  isScanning,
  onTriggerScan,
  onEditDevice,
  onBlockDevice,
  onDeleteDevice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'responding' | 'offline' | 'trusted' | 'untrusted' | 'review'>('all');
  const [sortBy, setSortBy] = useState<'ip' | 'name' | 'last_seen' | 'latency' | 'trust'>('ip');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filter & Search logic
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Status filter
      if (statusFilter === 'responding' && !device.is_active) return false;
      if (statusFilter === 'offline' && device.is_active) return false;
      if (statusFilter === 'trusted' && device.is_trusted !== 1) return false;
      if (statusFilter === 'untrusted' && device.is_trusted !== 0) return false;
      if (statusFilter === 'review' && device.is_trusted !== 2) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = (device.custom_name || '').toLowerCase().includes(term);
        const matchesHost = (device.hostname || '').toLowerCase().includes(term);
        const matchesIp = device.ip_address.toLowerCase().includes(term);
        const matchesMac = (device.mac_address || '').toLowerCase().includes(term);
        const matchesMfg = device.manufacturer.toLowerCase().includes(term);
        return matchesName || matchesHost || matchesIp || matchesMac || matchesMfg;
      }
      return true;
    });
  }, [devices, statusFilter, searchTerm]);

  // Numeric IP and property sorting
  const sortedDevices = useMemo(() => {
    const list = [...filteredDevices];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'ip') {
        const partsA = a.ip_address.split('.').map(Number);
        const partsB = b.ip_address.split('.').map(Number);
        for (let i = 0; i < 4; i++) {
          if (partsA[i] !== partsB[i]) {
            comparison = partsA[i] - partsB[i];
            break;
          }
        }
      } else if (sortBy === 'name') {
        const nameA = (a.custom_name || a.hostname || a.ip_address).toLowerCase();
        const nameB = (b.custom_name || b.hostname || b.ip_address).toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'last_seen') {
        comparison = new Date(a.last_seen).getTime() - new Date(b.last_seen).getTime();
      } else if (sortBy === 'latency') {
        const latA = a.latency_ms ?? 999999;
        const latB = b.latency_ms ?? 999999;
        comparison = latA - latB;
      } else if (sortBy === 'trust') {
        comparison = a.is_trusted - b.is_trusted;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredDevices, sortBy, sortOrder]);

  const exportToJson = () => {
    const blob = new Blob([JSON.stringify(devices, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homenet-devices-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (device: Device) => {
    switch (device.device_type) {
      case 'smart_tv':
        return <Tv className="w-4 h-4 text-purple-400" />;
      case 'smartphone':
        return <Smartphone className="w-4 h-4 text-blue-400" />;
      case 'tablet':
        return <Tablet className="w-4 h-4 text-violet-400" />;
      case 'laptop':
        return <Laptop className="w-4 h-4 text-indigo-400" />;
      case 'router':
        return <Router className="w-4 h-4 text-emerald-400" />;
      case 'iot':
        return <Cpu className="w-4 h-4 text-amber-400" />;
      default: {
        const name = (device.custom_name || device.hostname || '').toLowerCase();
        if (name.includes('phone') || name.includes('android') || name.includes('iphone')) {
          return <Smartphone className="w-4 h-4 text-blue-400" />;
        }
        if (name.includes('tv') || name.includes('bravia')) {
          return <Tv className="w-4 h-4 text-purple-400" />;
        }
        if (name.includes('laptop') || name.includes('macbook') || name.includes('pc')) {
          return <Laptop className="w-4 h-4 text-indigo-400" />;
        }
        return <Cpu className="w-4 h-4 text-zinc-400" />;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner (Expo card style) */}
      <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-4 flex items-start space-x-3 text-xs shadow-sm">
        <Info className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-zinc-300">
          <p className="font-semibold text-white tracking-tight">
            Device Identity &amp; Randomization Insights
          </p>
          <p className="text-zinc-400 leading-relaxed text-[11px]">
            Trust classifications are stored locally in SQLite to help you organize equipment. Modern iOS and Android phones randomize their MAC addresses by default for privacy; HomeNet uses mDNS hostnames, TTL inspection, and open signature ports to identify them.
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sort, Rescan, Export (Expo style) */}
      <div className="bg-[#111317]/95 border border-[#1e2127] rounded-2xl p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, IP, MAC address, vendor..."
              className="w-full pl-10 pr-12 py-2 rounded-full bg-[#0c0d10] border border-[#1e2127] text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs transition-colors"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs font-medium"
              >
                Clear
              </button>
            ) : (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#16181f] text-zinc-400 border border-[#232731]">
                /
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 self-end lg:self-auto">
            <button
              onClick={exportToJson}
              className="inline-flex items-center space-x-1.5 px-3.5 h-9 text-xs font-semibold rounded-full bg-[#16181f] hover:bg-[#20232b] text-zinc-300 border border-[#242832] active:scale-95 transition-all"
              title="Export device list to JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className={`inline-flex items-center space-x-1.5 px-4 h-9 text-xs font-semibold rounded-full transition-all active:scale-95 shadow-sm ${
                isScanning
                  ? 'bg-[#181a20] text-zinc-400 border border-[#272b35] cursor-not-allowed'
                  : 'bg-white hover:bg-zinc-200 text-black border border-transparent'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Rescan Subnet'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills and Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1c1f25] text-xs">
          {/* Segmented Filter Pills */}
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-[#0c0d10] border border-[#1e2127]">
            {[
              { id: 'all', label: `All (${devices.length})` },
              { id: 'responding', label: `Active (${devices.filter((d) => d.is_active).length})` },
              { id: 'trusted', label: `Trusted (${devices.filter((d) => d.is_trusted === 1).length})` },
              { id: 'review', label: `Review (${devices.filter((d) => d.is_trusted === 2).length})` },
              { id: 'untrusted', label: `Untrusted (${devices.filter((d) => d.is_trusted === 0).length})` },
              { id: 'offline', label: `Offline (${devices.filter((d) => !d.is_active).length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  statusFilter === f.id
                    ? 'bg-[#20232a] text-white shadow-sm border border-[#2c313a]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown & Order Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 text-[11px] flex items-center space-x-1">
              <ArrowUpDown className="w-3 h-3" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0c0d10] border border-[#1e2127] rounded-full px-3 py-1 text-zinc-300 text-[11px] focus:outline-none focus:border-zinc-400 font-medium"
            >
              <option value="ip">IP Address (Numerical)</option>
              <option value="name">Device Name</option>
              <option value="last_seen">Last Seen Time</option>
              <option value="latency">Ping Latency</option>
              <option value="trust">Trust Classification</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 py-1 rounded-full bg-[#0c0d10] border border-[#1e2127] text-zinc-300 hover:text-white text-xs font-mono transition-colors"
              title={`Order: ${sortOrder.toUpperCase()}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Device Management Inventory Table */}
      <div className="bg-[#111317]/95 border border-[#1e2127] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0c0d10] border-b border-[#1c1f25] text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 pl-5">Device Identity</th>
                <th className="py-3.5">IP Address</th>
                <th className="py-3.5">MAC &amp; Vendor</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Trust Classification</th>
                <th className="py-3.5">Last Seen</th>
                <th className="py-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b1e24] text-zinc-300">
              {sortedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 text-xs">
                    No devices match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedDevices.map((device) => {
                  const displayName = device.custom_name || device.hostname || device.ip_address;
                  const isTrusted = device.is_trusted === 1;
                  const isUntrusted = device.is_trusted === 0;

                  const knownMfg = device.manufacturer && device.manufacturer !== 'Unknown' ? device.manufacturer : null;
                  const mfgAlreadyInName = knownMfg && displayName.toLowerCase().includes(knownMfg.toLowerCase());
                  const showMfgHint = knownMfg && !mfgAlreadyInName;

                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-[#16181f]/80 transition-colors group"
                    >
                      {/* Name & Identity */}
                      <td className="py-3.5 pl-5">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-9 h-9 rounded-xl bg-[#16181f] border border-[#232731] flex items-center justify-center flex-shrink-0">
                            {getDeviceIcon(device)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="font-semibold text-white tracking-tight">{displayName}</span>
                              {device.device_type === 'smart_tv' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#24143a] text-[#be93e4] border border-[#3b235e] font-medium">📺 Smart TV</span>
                              )}
                              {device.device_type === 'smartphone' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#101b33] text-[#3e63dd] border border-[#1c305a] font-medium">📱 Phone</span>
                              )}
                              {device.device_type === 'tablet' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#1f1938] text-[#a78bfa] border border-[#372d63] font-medium">📟 Tablet</span>
                              )}
                              {device.device_type === 'laptop' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#131b2e] text-[#60a5fa] border border-[#202f52] font-medium">💻 PC</span>
                              )}
                              {device.device_type === 'router' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#122b1c] text-[#46a758] border border-[#1d472c] font-medium">🌐 Gateway</span>
                              )}
                              {device.device_type === 'iot' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#2a1e0b] text-[#f5a623] border border-[#483413] font-medium">⚙️ IoT</span>
                              )}
                              <button
                                onClick={() => onEditDevice(device)}
                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity p-0.5"
                                title="Edit Name & Trust"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            {/* Secondary info row */}
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                              {showMfgHint && (
                                <span className="text-[11px] text-zinc-400 font-medium">
                                  {knownMfg}
                                </span>
                              )}
                              {device.model_name && (
                                <span className="text-[11px] text-zinc-400 font-mono">
                                  {device.model_name}
                                </span>
                              )}
                            </div>
                            {/* Hostname */}
                            {device.hostname && device.hostname !== displayName && (
                              <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                                {device.hostname}
                              </span>
                            )}
                            {device.notes && (
                              <p className="text-[10px] text-zinc-400 italic line-clamp-1">{device.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* IP Address with copy */}
                      <td className="py-3.5 font-mono text-zinc-200">
                        <div className="flex items-center space-x-1.5">
                          <span>{device.ip_address}</span>
                          <button
                            onClick={(e) => copyToClipboard(device.ip_address, e)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity p-0.5"
                            title="Copy IP"
                          >
                            {copiedText === device.ip_address ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* MAC & Vendor */}
                      <td className="py-3.5">
                        <div>
                          <div className="flex items-center space-x-1.5 font-mono text-zinc-300">
                            <span>{device.mac_address || 'Unavailable'}</span>
                            {device.mac_address && (
                              <button
                                onClick={(e) => copyToClipboard(device.mac_address!, e)}
                                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity p-0.5"
                                title="Copy MAC"
                              >
                                {copiedText === device.mac_address ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-[11px] text-zinc-400 font-medium">
                              {device.manufacturer}
                            </span>
                            {device.is_randomized_mac === 1 && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#181a20] text-zinc-300 border border-[#252832] font-mono">
                                Private MAC
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status & Latency */}
                      <td className="py-3.5">
                        {device.is_active ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#122b1c] text-[#46a758] font-medium border border-[#1d472c] text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Responding</span>
                            </span>
                            {device.latency_ms !== null && (
                              <p className="text-[10px] text-zinc-400 font-mono pl-1">
                                {device.latency_ms.toFixed(1)}ms
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#16181f] text-zinc-400 font-medium border border-[#232731] text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* Trust Classification */}
                      <td className="py-3.5">
                        {isTrusted && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#122b1c] text-[#46a758] border border-[#1d472c] font-semibold text-[11px]">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Trusted</span>
                          </span>
                        )}
                        {isUntrusted && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#2b1214] text-[#e5484d] border border-[#4a1c20] font-semibold text-[11px]">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Untrusted</span>
                          </span>
                        )}
                        {!isTrusted && !isUntrusted && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#2e210e] text-[#f5a623] border border-[#4d3615] font-semibold text-[11px]">
                            <HelpCircle className="w-3 h-3" />
                            <span>Review</span>
                          </span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="py-3.5 text-zinc-400 text-[11px]">
                        <div>Last: {new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-zinc-500 text-[10px]">First: {new Date(device.first_seen).toLocaleDateString()}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onEditDevice(device)}
                            className="p-1.5 rounded-lg hover:bg-[#1f2229] text-zinc-400 hover:text-white transition-colors"
                            title="Edit Friendly Name"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onBlockDevice(device)}
                            className="p-1.5 rounded-lg bg-[#271316] hover:bg-[#381a1f] text-[#e5484d] border border-[#441b21] transition-colors"
                            title="Block Device (Unavailable — Router integration required)"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          {!device.is_active && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete record for ${displayName}?`)) {
                                  onDeleteDevice(device.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#1f2229] text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Delete stale record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
