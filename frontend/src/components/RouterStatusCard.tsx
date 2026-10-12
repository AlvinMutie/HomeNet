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
    <div className="bg-[#111317]/95 border border-[#1e2127] rounded-2xl p-6 shadow-sm relative overflow-hidden">
      {/* Specular highlight border on top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#1c1f25] gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[#16181f] border border-[#232731] flex items-center justify-center text-zinc-200">
            <Router className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {routerStatus?.model || 'Huawei HG8145V6'}
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#181a20] border border-[#262933] text-zinc-300 font-medium">
                {routerStatus?.firmware || 'ONT Gateway'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 flex items-center space-x-2">
              <span>Gateway Address:</span>
              <code className="text-zinc-200 font-mono text-xs bg-[#0c0d10] px-2 py-0.5 rounded-md border border-[#1e2127]">
                {routerStatus?.gateway_ip || '192.168.100.1'}
              </code>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenDiagnostics}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-[#181a20] hover:bg-[#22252c] text-zinc-200 border border-[#262a34] active:scale-95 transition-all"
          >
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <span>Diagnostics</span>
          </button>
          <a
            href={`${routerStatus?.protocol || 'https'}://${routerStatus?.gateway_ip || '192.168.100.1'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-full bg-white hover:bg-zinc-200 text-black active:scale-95 transition-all shadow-sm"
          >
            <span>Open Router Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-black" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
        {/* Gateway Reachability */}
        <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Gateway Health</span>
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2.5 flex items-center space-x-2">
            <span
              className={`size-2 rounded-full ${
                isReachable ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
            <span className="text-sm font-semibold text-white tracking-tight">
              {isReachable ? 'Online & Responding' : 'Unreachable'}
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-mono">
            RTT:{' '}
            <span className="text-zinc-300">
              {routerStatus?.ping_latency_ms !== null && routerStatus?.ping_latency_ms !== undefined
                ? `${routerStatus.ping_latency_ms.toFixed(1)}ms`
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Web Management Interface */}
        <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Web Portal</span>
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2.5 flex items-center space-x-2">
            <span
              className={`size-2 rounded-full ${
                webAccessible ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-semibold text-white tracking-tight">
              {webAccessible ? 'Port 443 Serving' : 'Check Access'}
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Status:{' '}
            <span className="text-zinc-300 font-mono">
              HTTP {routerStatus?.web_interface?.status_code || 200}
            </span>
          </div>
        </div>

        {/* WAN Internet */}
        <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">WAN Uplink</span>
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2.5 flex items-center space-x-2">
            <span
              className={`size-2 rounded-full ${
                isInternetOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-semibold text-white tracking-tight">
              {isInternetOnline ? 'Internet Active' : 'Checking WAN...'}
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Target:{' '}
            <span className="text-zinc-300 font-mono">
              1.1.1.1 / 8.8.8.8
            </span>
          </div>
        </div>

        {/* Discovery Engine */}
        <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium">Subnet Scope</span>
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2.5 flex items-center space-x-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="text-sm font-semibold text-white tracking-tight">
              ARP Sweep Active
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Mode:{' '}
            <span className="text-zinc-300 font-mono">
              Unprivileged ICMP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
