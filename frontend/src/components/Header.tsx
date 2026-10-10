import React from 'react';
import type { RouterStatus } from '../types';
import { 
  Wifi, 
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
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-sky-400/30">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white">HomeNet</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                  Safaricom Fibre
                </span>
              </div>
              <p className="text-xs text-slate-400">Huawei HG8145V6 Dashboard</p>
            </div>
          </div>

          {/* Router Gateway & Internet Status Pills */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Router Status */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Gateway (192.168.100.1):</span>
              {routerReachable ? (
                <span className="flex items-center text-emerald-400 font-medium space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Online {routerLatency ? `(${routerLatency.toFixed(1)}ms)` : ''}</span>
                </span>
              ) : (
                <span className="flex items-center text-rose-400 font-medium space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Unreachable</span>
                </span>
              )}
            </div>

            {/* Internet Status (Distinct from Router!) */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">WAN Internet:</span>
              {internetOnline ? (
                <span className="flex items-center text-emerald-400 font-medium space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Verified</span>
                </span>
              ) : (
                <span className="flex items-center text-amber-400 font-medium space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Unchecked / Offline</span>
                </span>
              )}
            </div>
          </div>

          {/* Network Scan Action Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                isScanning
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-sky-600/20 hover:shadow-sky-600/40'
              }`}
            >
              <RotateCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isScanning ? 'Scanning 192.168.100.0/24...' : 'Scan Network'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-slate-800/80 pt-1 -mb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'devices'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Connected Devices</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300">
              {respondingCount} / {deviceCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('router')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'router'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Router Integration & Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Network Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
