import React from 'react';
import type { RouterStatus } from '../types';
import { 
  RotateCw, 
  Globe, 
  ShieldCheck, 
  Activity, 
  HardDrive, 
  Settings, 
  Server
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'overview' | 'devices' | 'router' | 'settings';
  setActiveTab: (tab: 'overview' | 'devices' | 'router' | 'settings') => void;
  routerStatus: RouterStatus | null;
  isScanning: boolean;
  onTriggerScan: () => void;
  deviceCount: number;
  respondingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  routerStatus,
  isScanning,
  onTriggerScan,
  deviceCount,
  respondingCount,
}) => {
  const routerReachable = routerStatus?.reachable ?? false;
  const internetOnline = routerStatus?.internet_online ?? false;
  const routerLatency = routerStatus?.ping_latency_ms;

  return (
    <header className="border-b border-[#1e2127] bg-[#090a0d]/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main top bar */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#16181f] border border-[#262a34] flex items-center justify-center shadow-sm text-white group hover:border-[#383e4c] transition-colors">
              {/* Geometric Expo-inspired vector mark */}
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                className="w-5 h-5 text-zinc-100"
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="m5 16 7-12 7 12-4-2-3 4-3-4-4 2Z" fill="currentColor" fillOpacity="0.15" />
                <circle cx="12" cy="18" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-base font-semibold tracking-tight text-white">HomeNet</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#14171d] text-zinc-300 font-mono border border-[#242731]">
                  192.168.100.0/24
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 font-medium tracking-tight">
                Huawei HG8145V6 • Local Gateway
              </span>
            </div>
          </div>

          {/* Router Gateway & Internet Status Pills (Expo style) */}
          <div className="hidden lg:flex items-center space-x-2.5">
            {/* Gateway status */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#111317] border border-[#1e2127] text-xs">
              <Server className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400 font-medium">Gateway:</span>
              {routerReachable ? (
                <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                  <span className="relative flex size-2 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-emerald-500/40 animate-status-pulse"></span>
                    <span className="relative size-1.5 rounded-full bg-emerald-400"></span>
                  </span>
                  <span>192.168.100.1</span>
                  {routerLatency !== null && routerLatency !== undefined && (
                    <span className="text-zinc-400 font-mono text-[11px]">({routerLatency.toFixed(1)}ms)</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-rose-400 font-medium">
                  <span className="size-1.5 rounded-full bg-rose-500"></span>
                  <span>Offline</span>
                </div>
              )}
            </div>

            {/* Internet verification */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#111317] border border-[#1e2127] text-xs">
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400 font-medium">Internet:</span>
              {internetOnline ? (
                <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                  <span className="relative flex size-2 items-center justify-center">
                    <span className="relative size-1.5 rounded-full bg-emerald-400"></span>
                  </span>
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-amber-400 font-medium">
                  <span className="size-1.5 rounded-full bg-amber-400"></span>
                  <span>Unverified</span>
                </div>
              )}
            </div>
          </div>

          {/* Action button: Expo High-Contrast Pill Button */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className={`inline-flex items-center space-x-2 h-9 px-4 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 shadow-sm ${
                isScanning
                  ? 'bg-[#181a20] text-zinc-400 border border-[#272b35] cursor-not-allowed'
                  : 'bg-white text-black hover:bg-zinc-200 border border-transparent'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-zinc-400' : 'text-black'}`} />
              <span>{isScanning ? 'Scanning Subnet...' : 'Scan Subnet'}</span>
            </button>
          </div>
        </div>

        {/* Expo-style Segmented Pill Navigation */}
        <div className="flex items-center pb-3 pt-1 overflow-x-auto">
          <nav className="inline-flex items-center gap-1 p-1 rounded-full bg-[#111317] border border-[#1e2127] text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#20232a] text-white shadow-sm border border-[#2c313a]'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('devices')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === 'devices'
                  ? 'bg-[#20232a] text-white shadow-sm border border-[#2c313a]'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Devices</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                activeTab === 'devices' 
                  ? 'bg-[#2b2f38] text-emerald-400' 
                  : 'bg-[#17191f] text-zinc-300 border border-[#232630]'
              }`}>
                <span className="text-emerald-400 font-semibold">{respondingCount} active</span>
                <span className="text-zinc-500 mx-1">•</span>
                <span className="text-zinc-400">{deviceCount} known</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('router')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === 'router'
                  ? 'bg-[#20232a] text-white shadow-sm border border-[#2c313a]'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Gateway &amp; ONT</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#20232a] text-white shadow-sm border border-[#2c313a]'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
