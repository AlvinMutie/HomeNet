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
    { id: 'smartphone', label: 'Phone', icon: <Smartphone className="w-4 h-4 text-blue-400" /> },
    { id: 'smart_tv', label: 'Smart TV', icon: <Tv className="w-4 h-4 text-purple-400" /> },
    { id: 'laptop', label: 'Laptop / PC', icon: <Laptop className="w-4 h-4 text-indigo-400" /> },
    { id: 'router', label: 'Gateway', icon: <Router className="w-4 h-4 text-emerald-400" /> },
    { id: 'iot', label: 'IoT Device', icon: <Cpu className="w-4 h-4 text-amber-400" /> },
    { id: 'unknown', label: 'Other', icon: <QuestionIcon className="w-4 h-4 text-zinc-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111317] border border-[#22262f] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        {/* Specular highlight border on top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#1c1f25]">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-white">Edit Device Identity</h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">{device.ip_address} • {device.mac_address || 'No MAC'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#181a20] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 max-h-[85vh] overflow-y-auto">
          {/* Quick preset name chips */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Friendly Device Name
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
                  className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs rounded-full bg-[#16181f] hover:bg-[#20232b] text-zinc-300 border border-[#252832] transition-colors"
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
              placeholder="e.g. My Phone, Living Room TV, Work Laptop"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c0d10] border border-[#1e2127] text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs transition-colors"
            />
          </div>

          {/* Device Category Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Device Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setDeviceType(cat.id)}
                  className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    deviceType === cat.id
                      ? 'bg-[#181a20] border-zinc-400 text-white shadow-sm'
                      : 'bg-[#0c0d10] border-[#1e2127] text-zinc-400 hover:bg-[#14161b]'
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
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Trust Classification
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setIsTrusted(1)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs ${
                  isTrusted === 1
                    ? 'bg-[#122b1c] border-[#1d472c] text-[#46a758]'
                    : 'bg-[#0c0d10] border-[#1e2127] text-zinc-400 hover:bg-[#14161b]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mb-1 text-[#46a758]" />
                <span className="font-semibold">Trusted</span>
                <span className="text-[10px] text-zinc-500 text-center mt-0.5">Known device</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTrusted(2)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs ${
                  isTrusted === 2
                    ? 'bg-[#2e210e] border-[#4d3615] text-[#f5a623]'
                    : 'bg-[#0c0d10] border-[#1e2127] text-zinc-400 hover:bg-[#14161b]'
                }`}
              >
                <HelpCircle className="w-4 h-4 mb-1 text-[#f5a623]" />
                <span className="font-semibold">Review</span>
                <span className="text-[10px] text-zinc-500 text-center mt-0.5">Unverified</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTrusted(0)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-xs ${
                  isTrusted === 0
                    ? 'bg-[#2b1214] border-[#4a1c20] text-[#e5484d]'
                    : 'bg-[#0c0d10] border-[#1e2127] text-zinc-400 hover:bg-[#14161b]'
                }`}
              >
                <ShieldAlert className="w-4 h-4 mb-1 text-[#e5484d]" />
                <span className="font-semibold">Untrusted</span>
                <span className="text-[10px] text-zinc-500 text-center mt-0.5">Flagged</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Personal mobile on 5GHz Wi-Fi"
              className="w-full px-3.5 py-2 rounded-xl bg-[#0c0d10] border border-[#1e2127] text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 text-xs transition-colors"
            />
          </div>

          {/* Readonly identity details */}
          <div className="bg-[#0c0d10] rounded-xl p-3 border border-[#1b1e24] text-xs space-y-1">
            {device.model_name && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Detected Model:</span>
                <span className="text-white font-medium">{device.model_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Manufacturer:</span>
              <span className="text-zinc-300 font-medium">{device.manufacturer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">MAC Type:</span>
              <span className="text-zinc-300 font-mono text-[11px]">
                {device.is_randomized_mac ? 'Private / Randomized (iOS/Android)' : 'Standard IEEE OUI'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 text-xs font-semibold rounded-full text-zinc-400 hover:text-white hover:bg-[#181a20] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 h-9 text-xs font-semibold rounded-full bg-white hover:bg-zinc-200 text-black active:scale-95 transition-all shadow-sm"
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
