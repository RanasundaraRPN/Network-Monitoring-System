import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Bell, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity, 
  Cpu, 
  Clock,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardSummary, Alert } from '../types.ts';

interface HeaderProps {
  summary: DashboardSummary;
  alerts: Alert[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({ summary, alerts, onRefresh, isRefreshing }) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Filter active (unresolved) alerts
  const activeAlerts = alerts.filter(a => !a.resolvedAt);

  return (
    <header className="bg-[#0d0d0f] border-b border-white/10 text-slate-200 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center relative">
              <Activity className="w-5 h-5 text-indigo-400" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping pointer-events-none" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black tracking-tight text-lg sm:text-xl text-white">NOC<span className="text-indigo-500">//</span>MONITOR</h1>
                <span className="text-[10px] bg-[#111114] text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-semibold">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Enterprise Infrastructure Performance Logging</p>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Refresh Indicator */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5 active:scale-95 disabled:opacity-50"
              title="Force check all devices"
            >
              <svg
                className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.248 8H17"
                />
              </svg>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-slate-400 hover:text-white bg-[#111114] border border-white/5 hover:bg-white/5 rounded-xl transition-all relative active:scale-95"
              >
                <Bell className="w-5 h-5" />
                {activeAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#0d0d0f] shadow">
                    {activeAlerts.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-[#0d0d0f] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-red-400" />
                          <span className="font-semibold text-sm">Active System Alerts</span>
                        </div>
                        <span className="text-xs bg-[#111114] text-slate-400 px-2 py-0.5 rounded-full">
                          {activeAlerts.length} active
                        </span>
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                        {activeAlerts.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-slate-600" />
                            <span>All systems operating normally.</span>
                          </div>
                        ) : (
                          activeAlerts.map((alert) => (
                            <div key={alert.id} className="p-3.5 hover:bg-white/5 transition-colors">
                              <div className="flex items-start gap-2.5">
                                {alert.severity === 'CRITICAL' ? (
                                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                )}
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-slate-200">
                                    {alert.deviceName} ({alert.deviceIp})
                                  </p>
                                  <p className="text-[11px] text-slate-400 leading-normal">
                                    {alert.message}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    {new Date(alert.triggeredAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Sign-out Area */}
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full border border-white/10 shadow referrer-policy='no-referrer'"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#111114] flex items-center justify-center text-sm font-semibold border border-white/5">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-slate-200 max-w-[120px] truncate">
                  {user?.displayName || 'Administrator'}
                </p>
                <p className="text-[10px] text-slate-400 max-w-[120px] truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/10 active:scale-95"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#111114] border border-white/5 rounded-xl p-4 flex flex-col hover:border-indigo-500/30 transition-colors">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Monitored Hosts
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              {summary.totalDevices}
            </span>
          </div>

          <div className="bg-[#111114] border border-white/5 rounded-xl p-4 flex flex-col hover:border-indigo-500/30 transition-colors">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Operational UP
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-500">
              {summary.activeDevices}
            </span>
          </div>

          <div className="bg-[#111114] border border-white/5 rounded-xl p-4 flex flex-col hover:border-indigo-500/30 transition-colors">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Warning Latency
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-amber-400">
              {summary.warningDevices}
            </span>
          </div>

          <div className="bg-[#111114] border border-white/5 rounded-xl p-4 flex flex-col hover:border-indigo-500/30 transition-colors">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              Downtime Offline
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-red-500 animate-pulse">
              {summary.downDevices}
            </span>
          </div>

          <div className="col-span-2 md:col-span-1 bg-[#111114] border border-white/5 rounded-xl p-4 flex flex-col hover:border-indigo-500/30 transition-colors">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Avg Latency
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-indigo-400">
              {summary.avgLatency} <span className="text-[10px] text-slate-500 font-normal lowercase">ms</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
