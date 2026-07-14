import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  Trash2, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Cpu, 
  Clock, 
  Wifi, 
  ShieldAlert, 
  RefreshCw,
  Percent
} from 'lucide-react';
import { motion } from 'motion/react';
import { Device, DeviceCheck, Alert } from '../types.ts';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

interface DeviceDetailProps {
  device: Device;
  onBack: () => void;
  onEdit: (device: Device) => void;
  onDelete: (id: number) => Promise<void>;
  token: string | null;
}

export const DeviceDetail: React.FC<DeviceDetailProps> = ({
  device,
  onBack,
  onEdit,
  onDelete,
  token,
}) => {
  const [history, setHistory] = useState<DeviceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Fetch device metrics history
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/devices/${device.id}/history?range=${range}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load device check history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    
    // Auto-refresh history every 15s to keep the detail page live!
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [device.id, range]);

  // Handle deletion
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(device.id);
      onBack();
    } catch (err) {
      console.error('Deletion failed:', err);
      setDeleting(false);
    }
  };

  // Uptime, Avg Latency, and Max Latency Calculations
  const metrics = useMemo(() => {
    if (history.length === 0) return { uptimePct: 100, avgLatency: 0, maxLatency: 0, activeAlerts: 0 };
    
    let healthyCount = 0;
    let totalLatency = 0;
    let validLatencyCount = 0;
    let maxLatency = 0;

    history.forEach((check) => {
      if (check.status !== 'DOWN') {
        healthyCount++;
      }
      if (check.latencyMs !== null) {
        totalLatency += check.latencyMs;
        validLatencyCount++;
        if (check.latencyMs > maxLatency) {
          maxLatency = check.latencyMs;
        }
      }
    });

    const uptimePct = Math.round((healthyCount / history.length) * 100);
    const avgLatency = validLatencyCount > 0 ? Math.round(totalLatency / validLatencyCount) : 0;

    return { uptimePct, avgLatency, maxLatency };
  }, [history]);

  // Format dates for charts
  const chartData = useMemo(() => {
    return history.map((check) => {
      const date = new Date(check.timestamp);
      let formattedTime = '';

      if (range === '1h') {
        formattedTime = date.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
      } else if (range === '24h') {
        formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        formattedTime = date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
      }

      return {
        time: formattedTime,
        latency: check.latencyMs,
        status: check.status,
        loss: check.packetLossPct || 0,
      };
    });
  }, [history, range]);

  // Current status metrics
  const currentStatus = history[history.length - 1]?.status || 'UP';
  const currentLatency = history[history.length - 1]?.latencyMs ?? null;

  return (
    <div className="space-y-6 text-white font-sans select-none">
      {/* Back Button and Controls Header */}
      <div className="flex items-center justify-between gap-4 bg-[#0d0d0f] p-4 border border-white/10 rounded-2xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-indigo-400" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onEdit(device)}
            className="h-9 px-4 border border-white/5 hover:border-white/10 bg-[#08080a] hover:bg-white/5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            Configure Host
          </button>

          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="h-9 px-4 border border-transparent hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Remove Device
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400 font-semibold">Delete Host?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 px-3 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="h-8 px-3 bg-white/5 text-slate-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer border border-white/5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Core Host Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Main Health Card */}
        <div className="bg-[#111114] border border-white/5 rounded-2xl p-5 flex flex-col justify-between md:col-span-1 relative overflow-hidden">
          {currentStatus === 'UP' && (
            <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          )}
          {currentStatus === 'WARNING' && (
            <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          )}
          {currentStatus === 'DOWN' && (
            <div className="absolute inset-x-0 top-0 h-1 bg-red-500 animate-pulse" />
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">SYSTEM STATUS</span>
              {currentStatus === 'UP' && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.2)]">
                  ONLINE
                </span>
              )}
              {currentStatus === 'WARNING' && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.2)]">
                  WARNING
                </span>
              )}
              {currentStatus === 'DOWN' && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.2)]">
                  DOWN
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-white truncate tracking-tight">{device.name}</h3>
            <p className="text-[10px] font-mono text-slate-500 leading-none mt-1">{device.groupName || 'General'}</p>
            
            <div className="mt-4 bg-[#08080a] p-2.5 rounded-xl border border-white/5 text-center">
              <span className="text-xs font-mono text-slate-400 truncate block tracking-wider">
                {device.ipAddress}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <Wifi className="w-3.5 h-3.5 text-slate-500" />
              {device.isSimulated ? 'Simulated' : 'Real ICMP'}
            </span>
            <span className="font-mono text-[10px] text-slate-500">ID: {device.id}</span>
          </div>
        </div>

        {/* Dynamic Metric 1 (Uptime) */}
        <div className="bg-[#111114] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-slate-400" />
            Device Uptime
          </span>
          <div>
            <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
              {metrics.uptimePct}%
            </span>
            <div className="w-full bg-[#08080a] h-2 rounded-full overflow-hidden mt-3 border border-white/5">
              <div 
                className={`h-full rounded-full ${metrics.uptimePct > 95 ? 'bg-emerald-500' : metrics.uptimePct > 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${metrics.uptimePct}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-500 leading-none mt-2 font-mono">Calculated from range history checks</span>
        </div>

        {/* Dynamic Metric 2 (Avg Latency) */}
        <div className="bg-[#111114] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            Average Latency
          </span>
          <div>
            <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
              {metrics.avgLatency} <span className="text-sm font-normal text-slate-500">ms</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 leading-none font-mono">Warning Threshold: {device.latencyThresholdMs}ms</span>
        </div>

        {/* Dynamic Metric 3 (Interval / Active alert) */}
        <div className="bg-[#111114] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-slate-400" />
            Diagnostic Check Rate
          </span>
          <div>
            <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
              {device.pingIntervalSec} <span className="text-sm font-normal text-slate-500">sec</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 leading-none font-mono">Background cron schedule active</span>
        </div>
      </div>

      {/* Latency History Chart Card */}
      <div className="bg-[#111114] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-sm">Latency & Performance Metrics</h4>
          </div>

          <div className="flex bg-[#08080a] p-1 border border-white/5 rounded-xl">
            {(['1h', '24h', '7d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  range === r
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {r === '1h' ? '1 Hour' : r === '24h' ? '24 Hours' : '7 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Loading host history...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No historical diagnostic entries found for selected range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" opacity={0.4} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  unit="ms"
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#0d0d0f', 
                    borderColor: 'rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  itemStyle={{ color: '#6366f1' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#latencyGlow)" 
                  name="Latency"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
