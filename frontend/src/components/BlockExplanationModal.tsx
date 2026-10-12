import React from 'react';
import type { Device } from '../types';
import { X, ShieldAlert, AlertTriangle, ExternalLink, Info } from 'lucide-react';

interface BlockExplanationModalProps {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
}

export const BlockExplanationModal: React.FC<BlockExplanationModalProps> = ({
  device,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const deviceName = device.custom_name || device.hostname || device.ip_address;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111317] border border-[#22262f] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        {/* Specular highlight border on top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#1c1f25] bg-[#1a1012]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#2b1214] border border-[#4a1c20] flex items-center justify-center text-[#e5484d]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-white">Device Blocking Notice</h3>
              <p className="text-xs text-[#e5484d]">Router Integration Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#181a20] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Target device identity card */}
          <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Target Device Identity
            </span>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-zinc-500">Device Name:</span>
                <p className="font-semibold text-white mt-0.5">{deviceName}</p>
              </div>
              <div>
                <span className="text-zinc-500">IP Address:</span>
                <p className="font-mono text-white mt-0.5">{device.ip_address}</p>
              </div>
              <div>
                <span className="text-zinc-500">MAC Address:</span>
                <p className="font-mono text-zinc-300 mt-0.5">{device.mac_address || 'Unavailable'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Manufacturer:</span>
                <p className="text-zinc-300 mt-0.5">{device.manufacturer}</p>
              </div>
            </div>
          </div>

          {/* Technical explanation alert */}
          <div className="bg-[#2a1e0b] border border-[#483413] rounded-xl p-4 flex space-x-3 text-xs text-[#f5a623]">
            <AlertTriangle className="w-4 h-4 text-[#f5a623] flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">
                Why simulated blocking is not permitted:
              </p>
              <p className="text-[#f5a623]/90 leading-relaxed text-[11px]">
                Local ARP network discovery can observe active packets on your home Wi-Fi, but cannot safely disconnect or isolate devices. A device dropping off ping scans is not proof that it was blocked.
              </p>
            </div>
          </div>

          <div className="bg-[#0c0d10] border border-[#1b1e24] rounded-xl p-4 space-y-2 text-xs text-zinc-300">
            <div className="flex items-center space-x-2 text-zinc-200 font-semibold">
              <Info className="w-4 h-4 text-zinc-400" />
              <span>How real blocking works:</span>
            </div>
            <p className="leading-relaxed text-zinc-400 text-[11px]">
              Genuine blocking requires creating an authenticated MAC filter rule inside the Huawei HG8145V6 GPON ONT router.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-xs pl-1">
              <li>Log in to the router web management at <code className="text-white font-mono">https://192.168.100.1</code></li>
              <li>Navigate to <strong className="text-white">Security &gt; MAC Filter Configuration</strong></li>
              <li>Add MAC address <code className="text-white font-mono">{device.mac_address || 'target-mac'}</code> to the blacklist rule</li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="https://192.168.100.1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <span>Open Router Web Interface</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </a>
            <button
              onClick={onClose}
              className="px-4 h-9 text-xs font-semibold rounded-full bg-white hover:bg-zinc-200 text-black active:scale-95 transition-all shadow-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
