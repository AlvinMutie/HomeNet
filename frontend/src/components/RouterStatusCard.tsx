import React from 'react';
import type { RouterStatus } from '../types';
import { Router, Globe, Lock, ExternalLink, Activity, Cpu } from 'lucide-react';

interface RouterStatusCardProps {
  routerStatus: RouterStatus | null;
  onOpenDiagnostics: () => void;
}

export const RouterStatusCard: React.FC<RouterStatusCardProps> = ({
  routerStatus,
  onOpenDiagnostics,
}) => {
  const isReachable = routerStatus?.reachable ?? false;
  const isInternetOnline = routerStatus?.internet_online ?? false;
  const webAccessible = routerStatus?.web_interface?.accessible ?? false;

  return (
    <div className="bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg shadow-black/40">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Router className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">
                {routerStatus?.model || 'Huawei HG8145V6'}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">
                {routerStatus?.firmware || 'Safaricom Customized ONT'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
              <span>Gateway:</span>
              <code className="text-sky-300 font-mono text-xs bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                {routerStatus?.gateway_ip || '192.168.100.1'}
              </code>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenDiagnostics}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Diagnostics</span>
          </button>
          <a
            href={`${routerStatus?.protocol || 'https'}://${routerStatus?.gateway_ip || '192.168.100.1'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
          >
            <span>Open Router Web UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Gateway Reachability */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Gateway Reachability</span>
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isReachable ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'
              }`}
            />
            <span className="text-sm font-semibold text-white">
              {isReachable ? 'Gateway Responding' : 'Unreachable'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Ping Latency:{' '}
            <span className="text-slate-300 font-mono">
              {routerStatus?.ping_latency_ms !== null && routerStatus?.ping_latency_ms !== undefined
                ? `${routerStatus.ping_latency_ms.toFixed(1)} ms`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Web Management Interface */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>HTTPS Web Portal</span>
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                webAccessible ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-semibold text-white">
              {webAccessible ? 'HTTPS Port 443 Active' : 'Offline / Blocked'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Status Code:{' '}
            <span className="text-slate-300 font-mono">
              {routerStatus?.web_interface?.status_code
                ? `HTTP ${routerStatus.web_interface.status_code}`
                : 'Standby'}
            </span>
          </div>
        </div>

        {/* Verified WAN Internet Connectivity */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>WAN Internet Status</span>
            <Globe className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isInternetOnline ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
            <span className="text-sm font-semibold text-white">
              {isInternetOnline ? 'Internet Verified' : 'No Connection'}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Verified via:{' '}
            <span className="text-slate-300 font-mono">
              {routerStatus?.internet_verified_target || '1.1.1.1:53'}
            </span>
          </div>
        </div>

        {/* Router Adapter Status */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Adapter Integration</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-sm font-semibold text-white">Monitoring Mode</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Official Client API:{' '}
            <span className="text-amber-400 font-medium">Pending Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
