import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Server, 
  Globe, 
  Cpu, 
  Network, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  ChevronRight,
  Wifi,
  Settings2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Device } from '../types.ts';

interface DeviceGridProps {
  devices: (Device & { latestCheck: any | null })[];
  onSelectDevice: (device: Device) => void;
  onAddDevice: () => void;
}

export const DeviceGrid: React.FC<DeviceGridProps> = ({
  devices,
  onSelectDevice,
  onAddDevice,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UP' | 'WARNING' | 'DOWN'>('ALL');
  const [groupFilter, setGroupNameFilter] = useState('ALL');

  // Compute unique groups for filters
  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    devices.forEach(d => {
      if (d.groupName) groups.add(d.groupName);
    });
    return ['ALL', ...Array.from(groups)];
  }, [devices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const checkStatus = d.latestCheck?.status || 'UP'; // Treat unchecked as UP
      const statusMatch = statusFilter === 'ALL' || checkStatus === statusFilter;
      
      const groupMatch = groupFilter === 'ALL' || d.groupName === groupFilter;
      
      const textMatch = 
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.ipAddress.toLowerCase().includes(search.toLowerCase());
        
      return statusMatch && groupMatch && textMatch;
    });
  }, [devices, search, statusFilter, groupFilter]);

  // Device Icons based on type
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'website':
        return <Globe className="w-5 h-5 text-sky-400" />;
      case 'router':
        return <Network className="w-5 h-5 text-indigo-400" />;
      case 'switch':
        return <Layers className="w-5 h-5 text-violet-400" />;
      default:
        return <Server className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 select-none font-sans text-slate-200">
      {/* Filtering and Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0d0d0f] p-4 border border-white/10 rounded-2xl">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hosts or IPs..."
            className="w-full h-10 pl-10 pr-4 bg-[#08080a] border border-white/5 focus:border-indigo-500/50 rounded-xl text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all text-slate-200"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
          {/* Status Filter */}
          <div className="flex bg-[#08080a] p-1 border border-white/5 rounded-xl w-full sm:w-auto overflow-x-auto shrink-0">
            {(['ALL', 'UP', 'WARNING', 'DOWN'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Group Filter */}
          <select
            value={groupFilter}
            onChange={(e) => setGroupNameFilter(e.target.value)}
            className="h-10 px-3 bg-[#08080a] border border-white/5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-300 w-full sm:w-auto cursor-pointer"
          >
            {uniqueGroups.map((g) => (
              <option key={g} value={g} className="bg-[#0d0d0f]">
                Group: {g}
              </option>
            ))}
          </select>

          {/* Add Device Button */}
          <button
            onClick={onAddDevice}
            className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto cursor-pointer shadow-lg shadow-indigo-500/10"
          >
            <Plus className="w-4 h-4 text-white stroke-[3px]" />
            Add Host
          </button>
        </div>
      </div>

      {/* Grid Display */}
      {filteredDevices.length === 0 ? (
        <div className="bg-[#111114] border border-white/5 rounded-2xl p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <Settings2 className="w-10 h-10 text-slate-600 animate-spin" style={{ animationDuration: '6s' }} />
          <p className="text-sm font-semibold">No monitored devices match your criteria.</p>
          <p className="text-xs text-slate-600">Register new devices to start logging infrastructure health.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDevices.map((device) => {
            const status = device.latestCheck?.status || 'UP';
            const latency = device.latestCheck?.latencyMs ?? null;
            const loss = device.latestCheck?.packetLossPct ?? 0;
            const updated = device.latestCheck?.timestamp
              ? new Date(device.latestCheck.timestamp).toLocaleTimeString()
              : 'Never Checked';

            return (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSelectDevice(device)}
                className="bg-[#111114] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Glow effects based on status */}
                {status === 'DOWN' && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500 shadow-[0_2px_12px_rgba(239,68,68,0.5)]" />
                )}
                {status === 'WARNING' && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500 shadow-[0_2px_12px_rgba(245,158,11,0.5)]" />
                )}
                {status === 'UP' && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_2px_12px_rgba(16,185,129,0.5)]" />
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#08080a] border border-white/5 rounded-xl flex items-center justify-center">
                        {getDeviceIcon(device.type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                          {device.name}
                        </h3>
                        <p className="text-[10px] font-mono text-slate-500 leading-none mt-1">
                          {device.groupName || 'General'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5">
                      {status === 'UP' && (
                        <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.2)]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          UP
                        </span>
                      )}
                      {status === 'WARNING' && (
                        <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.2)]">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          WARN
                        </span>
                      )}
                      {status === 'DOWN' && (
                        <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.2)]">
                          <XCircle className="w-3 h-3 text-red-500" />
                          DOWN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Device Destination Address */}
                  <div className="mb-4 bg-[#08080a] border border-white/5 p-2.5 rounded-xl text-center">
                    <p className="text-xs font-mono text-slate-400 truncate tracking-wide">
                      {device.ipAddress}
                    </p>
                  </div>

                  {/* Core Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#08080a]/50 border border-white/5 p-2 rounded-xl flex flex-col justify-center">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">LATENCY</span>
                      <span className="text-sm font-bold font-mono text-slate-300">
                        {latency !== null ? `${latency} ms` : '—'}
                      </span>
                    </div>

                    <div className="bg-[#08080a]/50 border border-white/5 p-2 rounded-xl flex flex-col justify-center">
                      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">PACKET LOSS</span>
                      <span className="text-sm font-bold font-mono text-slate-300">
                        {loss}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-slate-500" />
                    <span>{device.isSimulated ? 'Simulated' : 'Real ICMP'}</span>
                  </div>
                  <div className="flex items-center gap-1 group-hover:text-slate-300 transition-colors">
                    <span>{updated}</span>
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
