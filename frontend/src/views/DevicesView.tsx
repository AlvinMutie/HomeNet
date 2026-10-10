import React, { useState, useMemo } from 'react';
import type { Device } from '../types';
import { 
  Search, 
  RotateCw, 
  Filter, 
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
  Router
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
        return <Smartphone className="w-4 h-4 text-sky-400" />;
      case 'laptop':
        return <Laptop className="w-4 h-4 text-indigo-400" />;
      case 'router':
        return <Router className="w-4 h-4 text-emerald-400" />;
      case 'iot':
        return <Cpu className="w-4 h-4 text-amber-400" />;
      default: {
        const name = (device.custom_name || device.hostname || '').toLowerCase();
        if (name.includes('phone') || name.includes('android') || name.includes('iphone')) {
          return <Smartphone className="w-4 h-4 text-sky-400" />;
        }
        if (name.includes('tv') || name.includes('bravia')) {
          return <Tv className="w-4 h-4 text-purple-400" />;
        }
        if (name.includes('laptop') || name.includes('macbook') || name.includes('pc')) {
          return <Laptop className="w-4 h-4 text-indigo-400" />;
        }
        return <Cpu className="w-4 h-4 text-slate-400" />;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner: MAC Randomization & Trust classification context */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-start space-x-3 text-xs">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-300">
          <p className="font-semibold text-white">
            Home Network Device Identity &amp; Privacy Notes:
          </p>
          <p className="text-slate-400 leading-relaxed">
            Trust labels are organizational markers to help you distinguish known personal devices from guests. 
            A randomized/private MAC address is standard behavior on modern iOS and Android Wi-Fi privacy settings and is <strong className="text-slate-200">not</strong> inherently malicious.
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sort, Rescan, Export */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, IP, MAC address, vendor..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5 self-end lg:self-auto">
            <button
              onClick={exportToJson}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Export device list to JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shadow-sm ${
                isScanning
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Rescan Subnet'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills and Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 mr-1 flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>Filter:</span>
            </span>

            {[
              { id: 'all', label: `All (${devices.length})` },
              { id: 'responding', label: `Responding (${devices.filter((d) => d.is_active).length})` },
              { id: 'trusted', label: `Trusted (${devices.filter((d) => d.is_trusted === 1).length})` },
              { id: 'review', label: `Review (${devices.filter((d) => d.is_trusted === 2).length})` },
              { id: 'untrusted', label: `Untrusted (${devices.filter((d) => d.is_trusted === 0).length})` },
              { id: 'offline', label: `Offline (${devices.filter((d) => !d.is_active).length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === f.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown & Order Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 flex items-center space-x-1">
              <ArrowUpDown className="w-3 h-3" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:outline-none focus:border-sky-500"
            >
              <option value="ip">IP Address (Numerical)</option>
              <option value="name">Device Name</option>
              <option value="last_seen">Last Seen Time</option>
              <option value="latency">Ping Latency</option>
              <option value="trust">Trust Classification</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              title={`Order: ${sortOrder.toUpperCase()}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Device Management Inventory Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 pl-4">Device Identity</th>
                <th className="py-3.5">IP Address</th>
                <th className="py-3.5">MAC &amp; Vendor</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Trust Classification</th>
                <th className="py-3.5">First Seen / Last Seen</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {sortedDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    No devices match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedDevices.map((device) => {
                  const displayName = device.custom_name || device.hostname || device.ip_address;
                  const isTrusted = device.is_trusted === 1;
                  const isUntrusted = device.is_trusted === 0;

                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & Identity */}
                      <td className="py-3.5 pl-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                            {getDeviceIcon(device)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              <span className="font-semibold text-white">{displayName}</span>
                              {device.device_type === 'smart_tv' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">Smart TV</span>
                              )}
                              {device.device_type === 'smartphone' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 font-medium">Phone</span>
                              )}
                              {device.device_type === 'laptop' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">Laptop / PC</span>
                              )}
                              {device.device_type === 'router' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">Gateway</span>
                              )}
                              {device.device_type === 'iot' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">IoT</span>
                              )}
                              <button
                                onClick={() => onEditDevice(device)}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-sky-400 transition-opacity p-0.5"
                                title="Edit Friendly Name"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            {device.model_name && (
                              <p className="text-[11px] text-sky-300/80 font-mono mt-0.5">
                                Model: {device.model_name}
                              </p>
                            )}
                            {device.custom_name && device.hostname && (
                              <span className="text-[10px] text-slate-500 font-mono block">
                                Hostname: {device.hostname}
                              </span>
                            )}
                            {device.notes && (
                              <p className="text-[10px] text-slate-400 italic line-clamp-1">{device.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* IP Address with copy */}
                      <td className="py-3.5 font-mono text-sky-300">
                        <div className="flex items-center space-x-1.5">
                          <span>{device.ip_address}</span>
                          <button
                            onClick={(e) => copyToClipboard(device.ip_address, e)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5"
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
                          <div className="flex items-center space-x-1.5 font-mono text-slate-400">
                            <span>{device.mac_address || 'Unavailable'}</span>
                            {device.mac_address && (
                              <button
                                onClick={(e) => copyToClipboard(device.mac_address!, e)}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity p-0.5"
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
                            <span className="text-[11px] text-slate-300 font-medium">
                              {device.manufacturer}
                            </span>
                            {device.is_randomized_mac === 1 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
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
                            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Responding</span>
                            </span>
                            {device.latency_ms !== null && (
                              <p className="text-[10px] text-slate-400 font-mono pl-1">
                                {device.latency_ms.toFixed(1)} ms
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* Trust Classification */}
                      <td className="py-3.5">
                        {isTrusted && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Trusted</span>
                          </span>
                        )}
                        {isUntrusted && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Untrusted</span>
                          </span>
                        )}
                        {!isTrusted && !isUntrusted && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                            <HelpCircle className="w-3 h-3" />
                            <span>Needs Review</span>
                          </span>
                        )}
                      </td>

                      {/* Timestamps */}
                      <td className="py-3.5 text-slate-400 text-[11px]">
                        <div>Last: {new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-slate-500 text-[10px]">First: {new Date(device.first_seen).toLocaleDateString()}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onEditDevice(device)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Edit Name & Trust"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Block device action: Disabled with security explanation modal */}
                          <button
                            onClick={() => onBlockDevice(device)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors"
                            title="Block Device (Unavailable — Router integration required)"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete record if offline */}
                          {!device.is_active && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete record for ${displayName}?`)) {
                                  onDeleteDevice(device.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
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
