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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-rose-500/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Device Blocking Notice</h3>
              <p className="text-xs text-rose-300">Feature Unavailable — Router Integration Required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Target device identity card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Target Device Identity
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Device Name:</span>
                <p className="font-semibold text-white mt-0.5">{deviceName}</p>
              </div>
              <div>
                <span className="text-slate-400">IP Address:</span>
                <p className="font-mono text-sky-400 mt-0.5">{device.ip_address}</p>
              </div>
              <div>
                <span className="text-slate-400">MAC Address:</span>
                <p className="font-mono text-slate-300 mt-0.5">{device.mac_address || 'Unavailable'}</p>
              </div>
              <div>
                <span className="text-slate-400">Manufacturer:</span>
                <p className="text-slate-300 mt-0.5">{device.manufacturer}</p>
              </div>
            </div>
          </div>

          {/* Technical explanation alert */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex space-x-3 text-xs text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-semibold text-amber-200">
                Why simulated blocking is not permitted:
              </p>
              <p className="text-amber-300/90 leading-relaxed">
                Local ARP network discovery can observe active packets on your home Wi-Fi, but cannot safely disconnect or isolate devices. A device dropping off ping scans is not proof that it was blocked.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center space-x-2 text-sky-400 font-semibold">
              <Info className="w-4 h-4" />
              <span>How real blocking works:</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              Genuine blocking requires creating an authenticated MAC filter rule inside the Huawei HG8145V6 GPON ONT router.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs pl-1">
              <li>Log in to the router web management at <code className="text-sky-300 font-mono">https://192.168.100.1</code></li>
              <li>Navigate to <strong className="text-white">Security &gt; MAC Filter Configuration</strong></li>
              <li>Add MAC address <code className="text-sky-300 font-mono">{device.mac_address || 'target-mac'}</code> to the blacklist rule</li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="https://192.168.100.1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              <span>Open Router Web Interface</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
