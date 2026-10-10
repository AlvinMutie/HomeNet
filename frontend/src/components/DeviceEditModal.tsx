import React, { useState } from 'react';
import type { Device } from '../types';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  HelpCircle, 
  Save, 
  Smartphone, 
  Laptop, 
  Tv, 
  Home, 
  Router, 
  Cpu, 
  HelpCircle as QuestionIcon
} from 'lucide-react';

interface DeviceEditModalProps {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceId: string, data: { custom_name?: string | null; is_trusted?: number; notes?: string | null; device_type?: string }) => Promise<void>;
}

export const DeviceEditModal: React.FC<DeviceEditModalProps> = ({
  device,
  isOpen,
  onClose,
  onSave,
}) => {
  const [customName, setCustomName] = useState(device.custom_name || '');
  const [deviceType, setDeviceType] = useState<string>(device.device_type || 'unknown');
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
        device_type: deviceType,
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
    { label: 'My Phone', type: 'smartphone', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { label: 'Laptop', type: 'laptop', icon: <Laptop className="w-3.5 h-3.5" /> },
    { label: 'Smart TV', type: 'smart_tv', icon: <Tv className="w-3.5 h-3.5" /> },
    { label: 'Family Device', type: 'smartphone', icon: <Home className="w-3.5 h-3.5" /> },
  ];

  const categories = [
    { id: 'smartphone', label: 'Phone', icon: <Smartphone className="w-4 h-4 text-sky-400" /> },
    { id: 'smart_tv', label: 'Smart TV', icon: <Tv className="w-4 h-4 text-purple-400" /> },
    { id: 'laptop', label: 'Laptop / PC', icon: <Laptop className="w-4 h-4 text-indigo-400" /> },
    { id: 'router', label: 'Gateway', icon: <Router className="w-4 h-4 text-emerald-400" /> },
    { id: 'iot', label: 'IoT Device', icon: <Cpu className="w-4 h-4 text-amber-400" /> },
    { id: 'unknown', label: 'Other', icon: <QuestionIcon className="w-4 h-4 text-slate-400" /> },
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Quick preset name chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Device Name
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {quickPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setCustomName(preset.label);
                    setDeviceType(preset.type);
                  }}
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
              placeholder="e.g. Alvin's Phone, Sony BRAVIA TV, Work Laptop"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm"
            />
          </div>

          {/* Device Category Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Device Type Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setDeviceType(cat.id)}
                  className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    deviceType === cat.id
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 ring-1 ring-sky-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
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
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs ${
                  isTrusted === 1
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="font-semibold">Trusted</span>
                <span className="text-[10px] text-slate-500 text-center mt-0.5">Known device</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTrusted(2)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs ${
                  isTrusted === 2
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <HelpCircle className="w-4 h-4 mb-1 text-amber-400" />
                <span className="font-semibold">Review</span>
                <span className="text-[10px] text-slate-500 text-center mt-0.5">Unverified</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTrusted(0)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs ${
                  isTrusted === 0
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 ring-1 ring-rose-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ShieldAlert className="w-4 h-4 mb-1 text-rose-400" />
                <span className="font-semibold">Untrusted</span>
                <span className="text-[10px] text-slate-500 text-center mt-0.5">Flagged</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Bedroom TV, personal mobile on 5GHz Wi-Fi"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs"
            />
          </div>

          {/* Readonly identity details */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1">
            {device.model_name && (
              <div className="flex justify-between">
                <span className="text-slate-400">Detected Model:</span>
                <span className="text-sky-300 font-medium">{device.model_name}</span>
              </div>
            )}
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
