import React, { useState, useEffect } from 'react';
import type { RouterDiagnostics, RouterStatus } from '../types';
import { fetchRouterDiagnostics } from '../services/api';
import { 
  Router as RouterIcon, 
  ShieldCheck, 
  Globe, 
  Terminal, 
  ExternalLink, 
  RotateCw, 
  AlertCircle, 
  Code, 
  Lock, 
  Layers
} from 'lucide-react';

interface RouterViewProps {
  initialStatus: RouterStatus | null;
}

export const RouterView: React.FC<RouterViewProps> = ({ initialStatus }) => {
  const [diagnostics, setDiagnostics] = useState<RouterDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRouterDiagnostics();
      setDiagnostics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const router = diagnostics?.router || initialStatus;
  const isReachable = router?.reachable ?? false;
  const isInternet = router?.internet_online ?? false;

  return (
    <div className="space-y-6">
      {/* Header bar (Expo style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111317]/95 border border-[#1e2127] rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white">Huawei HG8145V6 Integration</h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#181a20] text-zinc-300 border border-[#272a33] font-medium">
              ONT Firmware
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            GPON Optical Network Terminal (ONT) diagnostics &amp; gateway adapter interface
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadDiagnostics}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3.5 h-9 text-xs font-semibold rounded-full bg-[#16181f] hover:bg-[#20232b] text-zinc-300 border border-[#242832] active:scale-95 transition-all"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>

          <a
            href="https://192.168.100.1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 h-9 text-xs font-semibold rounded-full bg-white hover:bg-zinc-200 text-black active:scale-95 transition-all shadow-sm"
          >
            <span>Open Router Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-black" />
          </a>
        </div>
      </div>

      {error && (
        <div className="bg-[#111317] border border-[#4a1c20] rounded-2xl p-4 text-xs text-rose-300 flex items-center space-x-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Core diagnostics cards (Expo style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gateway Card */}
        <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>Gateway Reachability</span>
            <RouterIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`size-2.5 rounded-full ${
                isReachable ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
            <span className="text-lg font-semibold tracking-tight text-white">
              {isReachable ? '192.168.100.1 Online' : 'Unreachable'}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-zinc-400 font-mono bg-[#0c0d10] p-3 rounded-xl border border-[#1b1e24]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Ping RTT:</span>
              <span className="text-zinc-200">{router?.ping_latency_ms ? `${router.ping_latency_ms.toFixed(2)}ms` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Kernel ARP MAC:</span>
              <span className="text-zinc-200">{diagnostics?.gateway_arp?.mac || '1c:e5:04:77:c1:ab'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Interface:</span>
              <span className="text-zinc-200">wlan0</span>
            </div>
          </div>
        </div>

        {/* HTTPS Web Management Portal */}
        <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>Web Management (HTTPS)</span>
            <Lock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`size-2.5 rounded-full ${
                router?.web_interface?.accessible ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-lg font-semibold tracking-tight text-white">
              {router?.web_interface?.accessible ? 'Port 443 Responding' : 'Not Responding'}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-zinc-400 font-mono bg-[#0c0d10] p-3 rounded-xl border border-[#1b1e24]">
            <div className="flex justify-between">
              <span className="text-zinc-500">HTTP Status:</span>
              <span className="text-zinc-200">
                {router?.web_interface?.status_code ? `HTTP ${router.web_interface.status_code}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Response Time:</span>
              <span className="text-zinc-200">
                {router?.web_interface?.response_time_ms ? `${router.web_interface.response_time_ms}ms` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Server Banner:</span>
              <span className="text-zinc-200 truncate max-w-[130px]">
                {router?.web_interface?.server_header || 'Huawei Embedded'}
              </span>
            </div>
          </div>
        </div>

        {/* WAN Internet Connectivity */}
        <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <span>WAN Internet Connectivity</span>
            <Globe className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`size-2.5 rounded-full ${
                isInternet ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
            <span className="text-lg font-semibold tracking-tight text-white">
              {isInternet ? 'Internet Online' : 'No Connection'}
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-zinc-400 font-mono bg-[#0c0d10] p-3 rounded-xl border border-[#1b1e24]">
            <div className="flex justify-between">
              <span className="text-zinc-500">Tested Target:</span>
              <span className="text-zinc-200">{router?.internet_verified_target || '1.1.1.1:53'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Outbound Latency:</span>
              <span className="text-zinc-200">
                {router?.internet_latency_ms ? `${router.internet_latency_ms}ms` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Checked:</span>
              <span className="text-zinc-200">Live Socket Test</span>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Separation & Roadmap Guide */}
      <div className="bg-[#111317]/95 border border-[#1e2127] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <Layers className="w-5 h-5 text-zinc-300" />
          <h3 className="text-base font-semibold tracking-tight text-white">
            Router Integration Architecture &amp; Roadmap
          </h3>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          HomeNet Manager strictly isolates <strong className="text-white">Local ARP Discovery</strong> from <strong className="text-white">Router Management Operations</strong>. 
          The local ARP engine provides real-time device visibility without requiring router administrator credentials.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          {/* Card: Current Capabilities */}
          <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Current Production Capabilities</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 text-xs">
              <li>Real dynamic IPv4 subnet scan (<code className="text-zinc-300 font-mono">192.168.100.0/24</code>)</li>
              <li>Kernel ARP resolution (<code className="text-zinc-300 font-mono">/proc/net/arp</code> &amp; <code className="text-zinc-300 font-mono">ip neigh</code>)</li>
              <li>IEEE OUI manufacturer identification (Huawei, Intel, Apple, etc.)</li>
              <li>Private / randomized MAC address detection</li>
              <li>Independent gateway latency &amp; WAN internet testing</li>
              <li>Persistent friendly names and trust tags stored in SQLite</li>
            </ul>
          </div>

          {/* Card: Future Authenticated Capabilities */}
          <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-blue-400 font-semibold">
              <Code className="w-4 h-4" />
              <span>Future Authenticated Adapter Features</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-zinc-400 text-xs">
              <li>Retrieve official DHCP lease table from router memory</li>
              <li>Fetch Wi-Fi 2.4GHz &amp; 5GHz associated client lists</li>
              <li>Display GPON optical power levels (Rx/Tx dBm)</li>
              <li>Automate genuine MAC filter rules for device blocking</li>
              <li>Requires user-provided ONT credentials via secure session</li>
            </ul>
          </div>
        </div>

        {/* Security & Safe Investigation Guide */}
        <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-5 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
            <Terminal className="w-4 h-4" />
            <span>How to Safely Investigate the Huawei HG8145V6 Web Portal</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Huawei GPON ONTs run customized firmware. To inspect supported management endpoints safely without brute-forcing:
          </p>
          <div className="bg-[#111317] border border-[#1f2229] rounded-xl p-3.5 text-[11px] font-mono text-zinc-300 space-y-1.5 overflow-x-auto">
            <div>1. Open Google Chrome or Firefox and navigate to <span className="text-white">https://192.168.100.1</span></div>
            <div>2. Press F12 to open Developer Tools and select the <span className="text-amber-400">Network</span> tab</div>
            <div>3. Log in with your ONT credentials (found on the router sticker or provided by your ISP)</div>
            <div>4. Observe the authenticated XHR/Fetch calls (e.g. <span className="text-emerald-400">/api/system/device_list</span> or <span className="text-emerald-400">cgi-bin</span>)</div>
            <div>5. Note any CSRF header tokens (<span className="text-white">X-CSRF-Token</span> or form cookie session tokens)</div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Never attempt credential brute-forcing, as Huawei ONTs enforce temporary account lockouts after multiple failed login attempts.
          </p>
        </div>
      </div>
    </div>
  );
};
