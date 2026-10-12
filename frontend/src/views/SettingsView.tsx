import React from 'react';
import { Settings, Shield, Terminal, Globe, Server, CheckCircle2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Title (Expo style) */}
      <div className="bg-[#111317]/95 border border-[#1e2127] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <Settings className="w-5 h-5 text-zinc-300" />
          <h2 className="text-xl font-bold tracking-tight text-white">Network Settings &amp; Configuration</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Review system parameters, network interface assignments, and trusted Wi-Fi access guidance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Configuration Parameters */}
        <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white tracking-tight">
            <Server className="w-4 h-4 text-zinc-400" />
            <span>Environment Parameters</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24]">
              <span className="text-zinc-400">Network Interface:</span>
              <span className="font-mono text-white font-medium">wlan0</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24]">
              <span className="text-zinc-400">Local Subnet:</span>
              <span className="font-mono text-white font-medium">192.168.100.0/24</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24]">
              <span className="text-zinc-400">Router Gateway:</span>
              <span className="font-mono text-white font-medium">192.168.100.1:443</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24]">
              <span className="text-zinc-400">Host Local IP:</span>
              <span className="font-mono text-emerald-400 font-medium">192.168.100.7</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24]">
              <span className="text-zinc-400">Database Engine:</span>
              <span className="font-mono text-zinc-300 font-medium">SQLite (WAL Mode)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24]">
              <span className="text-zinc-400">Persistence File:</span>
              <span className="font-mono text-zinc-400">backend/data/homenet.db</span>
            </div>
          </div>
        </div>

        {/* Security & Access Controls */}
        <div className="bg-[#111317]/90 border border-[#1e2127] rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-sm font-semibold text-white tracking-tight">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Security &amp; Privacy Protections</span>
          </div>

          <div className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
            <div className="p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24] space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Strictly Local Application</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                HomeNet Manager binds exclusively to your private network. No telemetry, traffic data, or IP logs are transmitted to external servers.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24] space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Safe Non-Destructive Discovery</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Discovery uses non-aggressive ICMP echo sweeps, mDNS, and kernel ARP resolution. No port scanning floods or disruptive packets are injected.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0c0d10] border border-[#1b1e24] space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Unprivileged Execution</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                The Python backend and React frontend run entirely as regular non-root users on Kali Linux.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide: Accessing Dashboard from other devices on Wi-Fi */}
      <div className="bg-[#111317]/95 border border-[#1e2127] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center space-x-2 text-sm font-semibold text-white tracking-tight">
          <Globe className="w-4 h-4 text-zinc-300" />
          <span>Accessing Dashboard from Other Devices on your Home Wi-Fi</span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          To view this dashboard from your phone, tablet, or another computer connected to your home Wi-Fi:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4 space-y-2">
            <span className="text-zinc-200 font-sans font-semibold text-xs">
              1. Adjust Kali Linux Firewall
            </span>
            <div className="bg-[#111317] p-3 rounded-lg text-zinc-300 text-[11px] space-y-1 border border-[#1e2127]">
              <p className="text-zinc-500 font-sans text-[10px]"># Allow incoming traffic from local subnet</p>
              <p>sudo ufw allow from 192.168.100.0/24 to any port 5173 proto tcp</p>
              <p>sudo ufw allow from 192.168.100.0/24 to any port 8000 proto tcp</p>
            </div>
          </div>

          <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4 space-y-2">
            <span className="text-zinc-200 font-sans font-semibold text-xs">
              2. Open in Mobile / Laptop Browser
            </span>
            <div className="bg-[#111317] p-3 rounded-lg text-zinc-300 text-[11px] space-y-1 border border-[#1e2127]">
              <p className="text-zinc-500 font-sans text-[10px]"># Navigate to host IP from phone:</p>
              <p className="text-emerald-400">http://192.168.100.7:5173</p>
              <p className="text-zinc-400 font-sans text-[10px] mt-1">Backend API binds at port 8000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide: Optional raw ARP-scan capability permissions */}
      <div className="bg-[#111317]/95 border border-[#1e2127] rounded-2xl p-6 space-y-3 text-xs shadow-sm">
        <div className="flex items-center space-x-2 text-amber-400 font-semibold">
          <Terminal className="w-4 h-4" />
          <span>Optional: Granting Raw ARP Capture Capabilities to arp-scan</span>
        </div>
        <p className="text-zinc-400 leading-relaxed">
          HomeNet Manager already achieves complete device discovery via ICMP sweeps and kernel ARP table parsing without root. If you want <code className="text-zinc-200 font-mono">arp-scan</code> to execute without sudo, you can grant Linux capabilities to the binary instead of running the web application as root:
        </p>
        <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-3 font-mono text-[11px] text-zinc-300">
          sudo setcap cap_net_raw+ep /usr/sbin/arp-scan
        </div>
      </div>
    </div>
  );
};
