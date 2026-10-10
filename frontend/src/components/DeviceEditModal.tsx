import React, { useState } from 'react';
import type { Device } from '../types';
import { X, ShieldCheck, ShieldAlert, HelpCircle, Save, Smartphone, Laptop, Tv, Home } from 'lucide-react';

interface DeviceEditModalProps {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceId: string, data: { custom_name?: string | null; is_trusted?: number; notes?: string | null }) => Promise<void>;
}

export const DeviceEditModal: React.FC<DeviceEditModalProps> = ({
  device,
  isOpen,
  onClose,
  onSave,
}) => {
  const [customName, setCustomName] = useState(device.custom_name || '');
  const [isTrusted, setIsTrusted] = useState<number>(device.is_trusted);
  const [notes, setNotes] = useState(device.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(device.id, {
        custom_name: customName.trim() ? customName.trim() : null,
        is_trusted: isTrusted,
        notes: notes.trim() ? notes.trim() : null,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickPresets = [
    { label: 'My Phone', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { label: 'Laptop', icon: <Laptop className="w-3.5 h-3.5" /> },
    { label: 'Smart TV', icon: <Tv className="w-3.5 h-3.5" /> },
    { label: 'Family Device', icon: <Home className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Edit Device Details</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{device.ip_address} • {device.mac_address || 'No MAC'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick preset name chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Friendly Name
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {quickPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setCustomName(preset.label)}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                >
                  {preset.icon}
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Living Room TV, Work MacBook"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm"
            />
          </div>

          {/* Trust status selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Trust Classification
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setIsTrusted(1)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-xs ${
                  isTrusted === 1
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-5 h-5 mb-1 text-emerald-400" />
                <span className="font-semibold">Trusted</span>
                <span className="text-[10px] text-slate-500 text-center mt-0.5">Known device</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTrusted(2)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-xs ${
                  isTrusted === 2
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <HelpCircle className="w-5 h-5 mb-1 text-amber-400" />
                <span className="font-semibold">Needs Review</span>
                <span className="text-[10px] text-slate-500 text-center mt-0.5">Unverified</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTrusted(0)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-xs ${
                  isTrusted === 0
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 ring-1 ring-rose-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ShieldAlert className="w-5 h-5 mb-1 text-rose-400" />
                <span className="font-semibold">Untrusted</span>
                <span className="text-[10px] text-slate-500 text-center mt-0.5">Flagged</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Note: Trust labels are organizational markers to help you categorize home network equipment. They do not alter firewall rules.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Connected on 5GHz Wi-Fi band, bedroom outlet"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm"
            />
          </div>

          {/* Readonly identity details */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Manufacturer:</span>
              <span className="text-slate-300 font-medium">{device.manufacturer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">MAC Type:</span>
              <span className="text-slate-300">
                {device.is_randomized_mac ? 'Private / Randomized (iOS/Android)' : 'Standard IEEE OUI'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">First Discovered:</span>
              <span className="text-slate-400">{new Date(device.first_seen).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
