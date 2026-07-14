import React, { useState, useEffect } from 'react';
import { X, Server, Globe, Cpu, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Device } from '../types.ts';

interface AddEditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceData: any) => Promise<void>;
  deviceToEdit?: Device | null;
}

export const AddEditDeviceModal: React.FC<AddEditDeviceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  deviceToEdit,
}) => {
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [type, setType] = useState<'server' | 'router' | 'switch' | 'website'>('server');
  const [groupName, setGroupName] = useState('General');
  const [isSimulated, setIsSimulated] = useState(true);
  const [pingIntervalSec, setPingIntervalSec] = useState(15);
  const [latencyThresholdMs, setLatencyThresholdMs] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (deviceToEdit) {
      setName(deviceToEdit.name);
      setIpAddress(deviceToEdit.ipAddress);
      setType(deviceToEdit.type);
      setGroupName(deviceToEdit.groupName || 'General');
      setIsSimulated(deviceToEdit.isSimulated);
      setPingIntervalSec(deviceToEdit.pingIntervalSec || 15);
      setLatencyThresholdMs(deviceToEdit.latencyThresholdMs || 200);
    } else {
      setName('');
      setIpAddress('');
      setType('server');
      setGroupName('General');
      setIsSimulated(true);
      setPingIntervalSec(15);
      setLatencyThresholdMs(200);
    }
    setError(null);
  }, [deviceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ipAddress.trim() || !type) {
      setError('All basic fields are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSave({
        name,
        ipAddress,
        type,
        groupName: groupName || 'General',
        isSimulated,
        pingIntervalSec,
        latencyThresholdMs,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save device configurations.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-[#0d0d0f] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative z-10 text-white font-sans select-none"
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">
              {deviceToEdit ? 'Modify Monitored Host' : 'Register New Device'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Device Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Device/Host Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Web API Server 01"
                className="w-full h-11 px-3.5 bg-[#08080a] border border-white/5 rounded-xl focus:border-indigo-500/50 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all text-slate-200"
                required
              />
            </div>

            {/* IP Address or Hostname */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                IP Address, Hostname, or Endpoint URL
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="e.g. 10.0.1.5 or google.com or https://api.myserver.com"
                className="w-full h-11 px-3.5 bg-[#08080a] border border-white/5 rounded-xl focus:border-indigo-500/50 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all text-slate-200"
                required
              />
            </div>

            {/* Type & Group Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Device Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full h-11 px-3 bg-[#08080a] border border-white/5 rounded-xl focus:border-indigo-500/50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all text-slate-200"
                >
                  <option value="server" className="bg-[#0d0d0f]">Server</option>
                  <option value="website" className="bg-[#0d0d0f]">Website / HTTP</option>
                  <option value="router" className="bg-[#0d0d0f]">Router</option>
                  <option value="switch" className="bg-[#0d0d0f]">Switch</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Network Group / Tag</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Production, HQ"
                  className="w-full h-11 px-3.5 bg-[#08080a] border border-white/5 rounded-xl focus:border-indigo-500/50 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all text-slate-200"
                />
              </div>
            </div>

            {/* Simulated Toggle */}
            <div className="p-4 bg-[#08080a] border border-white/5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Simulated Diagnostics Mode</p>
                <p className="text-[11px] text-slate-500 leading-normal mt-0.5 font-mono">
                  Generates safe, realistic test metrics. Disable to attempt live pings and HTTP/TCP checks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulated(!isSimulated)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-1 focus:outline-none ${
                  isSimulated ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`w-4 h-4 bg-white rounded-full transition-transform shadow ${
                    isSimulated ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Threshold and Interval Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1">
                  Latency Threshold (ms)
                </label>
                <input
                  type="number"
                  value={latencyThresholdMs}
                  onChange={(e) => setLatencyThresholdMs(parseInt(e.target.value, 10))}
                  min={1}
                  max={5000}
                  className="w-full h-11 px-3.5 bg-[#08080a] border border-white/5 rounded-xl focus:border-indigo-500/50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all text-slate-200"
                  required
                />
                <p className="text-[10px] text-slate-500 font-mono">Latency above this triggers Warnings</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1">
                  Interval Check (seconds)
                </label>
                <input
                  type="number"
                  value={pingIntervalSec}
                  onChange={(e) => setPingIntervalSec(parseInt(e.target.value, 10))}
                  min={5}
                  max={3600}
                  className="w-full h-11 px-3.5 bg-[#08080a] border border-white/5 rounded-xl focus:border-indigo-500/50 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all text-slate-200"
                  required
                />
                <p className="text-[10px] text-slate-500 font-mono">Frequency of server side checks</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-11 border border-white/5 hover:border-white/10 bg-[#08080a] text-slate-300 hover:text-white rounded-xl text-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 active:scale-95"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin text-white" />}
                {deviceToEdit ? 'Save Changes' : 'Add Host'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
