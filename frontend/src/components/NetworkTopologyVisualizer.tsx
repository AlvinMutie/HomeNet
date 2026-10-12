import React, { useState, useId } from 'react';
import type { Device, RouterStatus } from '../types';
import { 
  Globe, 
  Router as RouterIcon, 
  Smartphone, 
  Laptop, 
  Tv, 
  Cpu, 
  Zap, 
  Activity, 
  Check, 
  Copy, 
  ShieldCheck, 
  HelpCircle,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface NetworkTopologyVisualizerProps {
  devices: Device[];
  routerStatus: RouterStatus | null;
  isScanning: boolean;
  onTriggerScan?: () => void;
  onEditDevice?: (device: Device) => void;
}

export const NetworkTopologyVisualizer: React.FC<NetworkTopologyVisualizerProps> = ({
  devices,
  routerStatus,
  isScanning,
  onTriggerScan,
  onEditDevice,
}) => {
  const componentId = useId().replace(/:/g, '');
  const [speedMultiplier, setSpeedMultiplier] = useState<'1x' | '2x' | 'turbo'>('1x');
  const [trafficFilter, setTrafficFilter] = useState<'all' | 'downlink' | 'uplink'>('all');
  const [isBursting, setIsBursting] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleSimulateBurst = () => {
    setIsBursting(true);
    setTimeout(() => setIsBursting(false), 3500);
  };

  // Determine speed factor
  const speedFactor = speedMultiplier === 'turbo' ? 0.4 : speedMultiplier === '2x' ? 0.65 : 1.0;

  // Identify router/gateway
  const gatewayIp = routerStatus?.gateway_ip || '192.168.100.1';
  
  // Filter active client devices (exclude the router itself)
  const clientDevices = devices.filter(
    (d) => d.ip_address !== gatewayIp && d.is_active === 1
  );

  // If there are no other active devices, show any devices or a fallback
  const displayDevices = clientDevices.length > 0 
    ? clientDevices.slice(0, 5) 
    : devices.filter(d => d.ip_address !== gatewayIp).slice(0, 4);

  const totalClients = displayDevices.length;

  // Selected device
  const selectedDevice = displayDevices.find((d) => d.id === selectedDeviceId) || null;

  // Device type icon helper
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'smart_tv':
        return <Tv className="w-4 h-4 text-purple-400" />;
      case 'smartphone':
        return <Smartphone className="w-4 h-4 text-blue-400" />;
      case 'laptop':
        return <Laptop className="w-4 h-4 text-indigo-400" />;
      case 'router':
        return <RouterIcon className="w-4 h-4 text-emerald-400" />;
      default:
        return <Cpu className="w-4 h-4 text-zinc-300" />;
    }
  };

  // Coordinates calculation
  // ViewBox: 0 0 920 420
  const wanPos = { x: 460, y: 45 };
  const routerPos = { x: 460, y: 175 };

  // Calculate client node positions across the bottom
  const clientPositions = displayDevices.map((dev, idx) => {
    let x = 460;
    if (totalClients === 1) {
      x = 460;
    } else {
      const padding = 100;
      const availableWidth = 920 - padding * 2;
      const step = availableWidth / (totalClients - 1);
      x = padding + idx * step;
    }
    // Subtle arc: outer nodes slightly higher
    const distFromCenter = Math.abs(x - 460) / 360;
    const y = 335 + Math.pow(distFromCenter, 2) * 20;

    return {
      device: dev,
      x,
      y,
      // Bezier curve from Router to Device
      pathDown: `M 460 205 C 460 ${205 + (y - 30 - 205) * 0.55}, ${x} ${205 + (y - 30 - 205) * 0.45}, ${x} ${y - 32}`,
      // Reverse path from Device to Router
      pathUp: `M ${x} ${y - 32} C ${x} ${205 + (y - 30 - 205) * 0.45}, 460 ${205 + (y - 30 - 205) * 0.55}, 460 205`,
      // Dynamic duration based on latency
      durDown: `${Math.max(1.2, Math.min(3.5, ((dev.latency_ms || 2.0) * 0.3 + 1.6))) * speedFactor}s`,
      durUp: `${Math.max(1.4, Math.min(4.0, ((dev.latency_ms || 2.0) * 0.35 + 1.8))) * speedFactor}s`,
    };
  });

  // WAN <-> Router Path
  const wanPathDown = `M 460 68 L 460 148`;
  const wanPathUp = `M 460 148 L 460 68`;

  return (
    <div className="bg-[#111317]/95 border border-[#1e2127] rounded-2xl overflow-hidden shadow-lg backdrop-blur-sm relative">
      {/* Decorative ambient radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-48 bg-gradient-to-b from-[#4668f2]/10 via-[#30a46c]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header & Controls Toolbar */}
      <div className="p-4 sm:p-5 border-b border-[#1c1f25] flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#181a20] border border-[#242730] flex items-center justify-center text-[#4668f2]">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Live Packet Flow & Topology
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Real-time vector telemetry illustrating active LAN & WAN packet conduits
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Traffic Filter */}
          <div className="flex items-center rounded-lg bg-[#0c0d10] p-0.5 border border-[#1e2127] text-[11px]">
            <button
              onClick={() => setTrafficFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                trafficFilter === 'all'
                  ? 'bg-[#1e222b] text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Bi-Directional
            </button>
            <button
              onClick={() => setTrafficFilter('downlink')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                trafficFilter === 'downlink'
                  ? 'bg-[#1e222b] text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Downlink
            </button>
            <button
              onClick={() => setTrafficFilter('uplink')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                trafficFilter === 'uplink'
                  ? 'bg-[#1e222b] text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Uplink
            </button>
          </div>

          {/* Speed Toggle */}
          <div className="flex items-center rounded-lg bg-[#0c0d10] p-0.5 border border-[#1e2127] text-[11px]">
            {(['1x', '2x', 'turbo'] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2 py-1 rounded-md uppercase font-mono transition-all ${
                  speedMultiplier === spd
                    ? 'bg-[#4668f2] text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {spd}
              </button>
            ))}
          </div>

          {/* Simulate Burst / Scan */}
          <button
            onClick={handleSimulateBurst}
            disabled={isBursting || isScanning}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#181a20] hover:bg-[#22252e] border border-[#262b36] text-[11px] font-medium text-amber-300 active:scale-95 transition-all disabled:opacity-50"
            title="Inject simulated ICMP packet bursts along all conduits"
          >
            <Zap className={`w-3.5 h-3.5 ${isBursting ? 'animate-bounce text-amber-400' : ''}`} />
            <span>{isBursting ? 'Pulse Active' : 'Inject Pulse'}</span>
          </button>

          {/* Trigger Scan Sweep */}
          {onTriggerScan && (
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#181a20] hover:bg-[#22252e] border border-[#262b36] text-[11px] font-medium text-emerald-400 active:scale-95 transition-all disabled:opacity-50"
              title="Trigger active ARP & ICMP scan sweep across local subnet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Sweeping...' : 'Sweep LAN'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto bg-[#0a0b0e] select-none">
        <svg
          viewBox="0 0 920 420"
          className="w-full h-auto min-w-[720px] max-h-[460px] mx-auto block"
          style={{ willChange: 'transform' }}
        >
          <defs>
            {/* Glowing Drop-Shadow Filters */}
            <filter id={`${componentId}-glow-cyan`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id={`${componentId}-glow-emerald`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id={`${componentId}-glow-amber`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id={`${componentId}-glow-purple`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient Paths */}
            <linearGradient id={`${componentId}-cable-glow`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4668f2" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#30a46c" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id={`${componentId}-wan-glow`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#4668f2" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Background Grid Pattern */}
          <g opacity="0.15">
            <line x1="0" y1="110" x2="920" y2="110" stroke="#242938" strokeDasharray="3 6" />
            <line x1="0" y1="260" x2="920" y2="260" stroke="#242938" strokeDasharray="3 6" />
            <circle cx="460" cy="175" r="140" fill="none" stroke="#242938" strokeDasharray="2 8" />
            <circle cx="460" cy="175" r="220" fill="none" stroke="#242938" strokeDasharray="2 10" />
          </g>

          {/* 1. WAN <-> Router Uplink Conduit */}
          <g>
            {/* Base cable */}
            <line
              x1={wanPos.x}
              y1={wanPos.y + 20}
              x2={routerPos.x}
              y2={routerPos.y - 28}
              stroke="#1b202c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1={wanPos.x}
              y1={wanPos.y + 20}
              x2={routerPos.x}
              y2={routerPos.y - 28}
              stroke="url(#wan-glow)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Moving Packets: WAN -> Router (Downlink WAN) */}
            {(trafficFilter === 'all' || trafficFilter === 'downlink') && (
              <g>
                <circle
                  r="3.5"
                  fill="#38bdf8"
                  filter={`url(#${componentId}-glow-cyan)`}
                >
                  <animateMotion
                    path={wanPathDown}
                    dur={`${1.6 * speedFactor}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  r="2.5"
                  fill="#38bdf8"
                  opacity="0.5"
                  filter={`url(#${componentId}-glow-cyan)`}
                >
                  <animateMotion
                    path={wanPathDown}
                    dur={`${1.6 * speedFactor}s`}
                    begin={`${0.18 * speedFactor}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )}

            {/* Moving Packets: Router -> WAN (Uplink DNS/Ping) */}
            {(trafficFilter === 'all' || trafficFilter === 'uplink') && (
              <g>
                <circle
                  r="3"
                  fill="#34d399"
                  filter={`url(#${componentId}-glow-emerald)`}
                >
                  <animateMotion
                    path={wanPathUp}
                    dur={`${1.8 * speedFactor}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            )}
          </g>

          {/* 2. Client Device Conduits & Packets */}
          {clientPositions.map((pos) => {
            const isSelected = selectedDeviceId === pos.device.id;
            const isTV = pos.device.device_type === 'smart_tv';
            const packetColor = isTV ? '#c084fc' : '#38bdf8';
            const packetFilter = isTV ? `${componentId}-glow-purple` : `${componentId}-glow-cyan`;

            return (
              <g key={`conduit-${pos.device.id}`}>
                {/* Conduit Base Shadow */}
                <path
                  d={pos.pathDown}
                  fill="none"
                  stroke={isSelected ? '#2e3a55' : '#181c25'}
                  strokeWidth={isSelected ? '4' : '3'}
                  strokeLinecap="round"
                />

                {/* Conduit Inner Track */}
                <path
                  d={pos.pathDown}
                  fill="none"
                  stroke={isSelected ? '#4668f2' : '#222938'}
                  strokeWidth="1.5"
                  strokeDasharray={isSelected ? 'none' : '4 6'}
                  strokeLinecap="round"
                  className={isSelected ? '' : 'animate-dash-flow'}
                  opacity={isSelected ? 0.9 : 0.5}
                />

                {/* Packet 1: Downlink (Router -> Device) */}
                {(trafficFilter === 'all' || trafficFilter === 'downlink') && (
                  <g>
                    {/* Primary packet */}
                    <circle
                      r="4"
                      fill={packetColor}
                      filter={`url(#${packetFilter})`}
                    >
                      <animateMotion
                        path={pos.pathDown}
                        dur={pos.durDown}
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Trailing secondary packet */}
                    <circle
                      r="2.5"
                      fill={packetColor}
                      opacity="0.6"
                      filter={`url(#${packetFilter})`}
                    >
                      <animateMotion
                        path={pos.pathDown}
                        dur={pos.durDown}
                        begin={`${parseFloat(pos.durDown) * 0.1}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                )}

                {/* Packet 2: Uplink (Device -> Router) */}
                {(trafficFilter === 'all' || trafficFilter === 'uplink') && (
                  <g>
                    <circle
                      r="3.5"
                      fill="#34d399"
                      filter={`url(#${componentId}-glow-emerald)`}
                    >
                      <animateMotion
                        path={pos.pathUp}
                        dur={pos.durUp}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                )}

                {/* Burst / Scan Packet (High-Speed Amber Waves) */}
                {(isBursting || isScanning) && (
                  <g>
                    <circle
                      r="4.5"
                      fill="#fbbf24"
                      filter={`url(#${componentId}-glow-amber)`}
                    >
                      <animateMotion
                        path={pos.pathDown}
                        dur="0.75s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      r="3"
                      fill="#fbbf24"
                      opacity="0.7"
                      filter={`url(#${componentId}-glow-amber)`}
                    >
                      <animateMotion
                        path={pos.pathDown}
                        dur="0.75s"
                        begin="0.12s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                )}
              </g>
            );
          })}

          {/* 3. WAN / Internet Gateway Node */}
          <g transform={`translate(${wanPos.x}, ${wanPos.y})`}>
            {/* Background pill */}
            <rect
              x="-85"
              y="-22"
              width="170"
              height="44"
              rx="22"
              fill="#12151d"
              stroke="#222838"
              strokeWidth="1.5"
              className="transition-colors"
            />
            {/* Status indicator ring */}
            <circle cx="-58" cy="0" r="12" fill="#171e2e" />
            <Globe className="w-4 h-4 text-sky-400" x="-66" y="-8" />

            {/* Label */}
            <text x="-38" y="-3" fill="#f4f4f5" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
              WAN / Internet
            </text>
            <text x="-38" y="11" fill="#9ba1a6" fontSize="9" fontFamily="JetBrains Mono, monospace">
              {routerStatus?.internet_online ? '1.1.1.1' : 'Offline'} •{' '}
              {routerStatus?.internet_latency_ms !== null && routerStatus?.internet_latency_ms !== undefined
                ? `${routerStatus.internet_latency_ms.toFixed(0)}ms`
                : '14ms'}
            </text>
            {/* Green Online Dot */}
            <circle cx="64" cy="0" r="4" fill="#30a46c" className="animate-pulse" />
          </g>

          {/* 4. Central Router / Gateway Node */}
          <g transform={`translate(${routerPos.x}, ${routerPos.y})`}>
            {/* Radar Sweep Ring */}
            <circle
              cx="0"
              cy="0"
              r="34"
              fill="none"
              stroke="#4668f2"
              strokeWidth="1.5"
              className="animate-radar"
              opacity="0.4"
            />
            {/* Subtle outer static glow */}
            <circle cx="0" cy="0" r="32" fill="#161922" stroke="#2c3447" strokeWidth="2" />
            <circle cx="0" cy="0" r="24" fill="#1a1e2a" stroke="#4668f2" strokeWidth="1" />

            {/* Router Icon */}
            <RouterIcon className="w-5 h-5 text-emerald-400" x="-10" y="-10" />

            {/* Router Label Card */}
            <rect
              x="-90"
              y="32"
              width="180"
              height="36"
              rx="10"
              fill="#12151d"
              stroke="#242a3a"
              strokeWidth="1"
            />
            <text x="0" y="47" textAnchor="middle" fill="#f4f4f5" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
              Home Gateway
            </text>
            <text x="0" y="60" textAnchor="middle" fill="#9ba1a6" fontSize="9" fontFamily="JetBrains Mono, monospace">
              {gatewayIp} • HG8145V6
            </text>
          </g>

          {/* 5. Connected Devices Nodes */}
          {clientPositions.map((pos) => {
            const dev = pos.device;
            const isSelected = selectedDeviceId === dev.id;
            const displayName = dev.custom_name || dev.hostname || dev.ip_address;
            const truncatedName = displayName.length > 16 ? displayName.substring(0, 14) + '...' : displayName;

            return (
              <g
                key={`node-${dev.id}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer group"
                onClick={() => setSelectedDeviceId(isSelected ? null : dev.id)}
              >
                {/* Node Box */}
                <rect
                  x="-72"
                  y="-26"
                  width="144"
                  height="52"
                  rx="12"
                  fill={isSelected ? '#1c2230' : '#13161c'}
                  stroke={isSelected ? '#4668f2' : '#232733'}
                  strokeWidth={isSelected ? '2' : '1.2'}
                  filter={isSelected ? `url(#${componentId}-glow-cyan)` : 'none'}
                  className="transition-all duration-200 group-hover:stroke-[#3b4356]"
                />

                {/* Device Icon Avatar */}
                <circle
                  cx="-48"
                  cy="0"
                  r="13"
                  fill={isSelected ? '#252d42' : '#191c25'}
                  stroke={isSelected ? '#4668f2' : '#2b3140'}
                  strokeWidth="1"
                />
                <g transform="translate(-56, -8)">
                  {getDeviceIcon(dev.device_type)}
                </g>

                {/* Device Labels */}
                <text
                  x="-28"
                  y="-4"
                  fill="#f4f4f5"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                  className="group-hover:fill-sky-300 transition-colors"
                >
                  {truncatedName}
                </text>
                <text
                  x="-28"
                  y="10"
                  fill="#9ba1a6"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {dev.ip_address}
                </text>

                {/* Latency Pill */}
                <rect
                  x="20"
                  y="1"
                  width="44"
                  height="14"
                  rx="7"
                  fill="#101217"
                  stroke="#232733"
                  strokeWidth="0.8"
                />
                <text
                  x="42"
                  y="11"
                  textAnchor="middle"
                  fill="#30a46c"
                  fontSize="8.5"
                  fontWeight="500"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {dev.latency_ms !== null ? `${dev.latency_ms.toFixed(1)}ms` : '—'}
                </text>

                {/* Active Status Dot */}
                <circle
                  cx="62"
                  cy="-18"
                  r="3.5"
                  fill="#30a46c"
                  className="animate-pulse"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Telemetry Inspector Popover / Card */}
      {selectedDevice ? (
        <div className="p-4 sm:p-5 border-t border-[#1c1f25] bg-[#0d0e12] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#16181f] border border-[#232731] flex items-center justify-center flex-shrink-0">
              {getDeviceIcon(selectedDevice.device_type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-white truncate">
                  {selectedDevice.custom_name || selectedDevice.hostname || selectedDevice.ip_address}
                </span>
                {selectedDevice.is_trusted === 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#122b1c] text-[#46a758] border border-[#1d472c] font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Trusted
                  </span>
                )}
                {selectedDevice.is_trusted === 2 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a2414] text-[#f5a623] border border-[#433719] font-medium flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" />
                    Review
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 mt-0.5">
                <span className="font-mono text-zinc-300">{selectedDevice.ip_address}</span>
                <span>•</span>
                <span>{selectedDevice.manufacturer || 'Unknown Hardware Vendor'}</span>
                <span>•</span>
                <span className="font-mono text-zinc-400">{selectedDevice.mac_address || 'No MAC'}</span>
                {selectedDevice.latency_ms !== null && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedDevice.latency_ms.toFixed(2)}ms latency
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-auto">
            <button
              onClick={(e) => copyToClipboard(selectedDevice.ip_address, e)}
              className="px-3 py-1.5 rounded-lg bg-[#16181f] hover:bg-[#20232b] border border-[#242832] text-zinc-300 text-xs font-mono flex items-center space-x-1.5 transition-colors"
            >
              {copiedIp === selectedDevice.ip_address ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy IP</span>
                </>
              )}
            </button>

            {onEditDevice && (
              <button
                onClick={() => onEditDevice(selectedDevice)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors shadow-sm"
              >
                Edit Device
              </button>
            )}

            <button
              onClick={() => setSelectedDeviceId(null)}
              className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1d24] text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {/* Legend & Telemetry Indicators Footer */}
      <div className="px-5 py-3 border-t border-[#181b22] bg-[#0c0d10] flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="size-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
            <span className="text-zinc-300">Downstream Data</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="size-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
            <span className="text-zinc-300">Upstream Telemetry</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="size-2 rounded-full bg-[#c084fc] shadow-[0_0_8px_#c084fc]" />
            <span className="text-zinc-300">Smart TV Stream</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="size-2 rounded-full bg-[#fbbf24] shadow-[0_0_8px_#fbbf24]" />
            <span className="text-zinc-300">ICMP / ARP Sweep</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-[#4668f2]" />
          <span>GPU-Accelerated Vector Engine</span>
        </div>
      </div>
    </div>
  );
};
