export interface User {
  id: number;
  uid: string;
  email: string;
  createdAt: string;
}

export interface Device {
  id: number;
  userId: number;
  name: string;
  ipAddress: string;
  type: 'server' | 'router' | 'switch' | 'website';
  groupName: string;
  isSimulated: boolean;
  pingIntervalSec: number;
  latencyThresholdMs: number;
  createdAt: string;
}

export interface DeviceCheck {
  id: number;
  deviceId: number;
  timestamp: string;
  status: 'UP' | 'DOWN' | 'WARNING';
  latencyMs: number | null;
  packetLossPct: number | null;
}

export interface Alert {
  id: number;
  deviceId: number;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  triggeredAt: string;
  resolvedAt: string | null;
  deviceName?: string;
  deviceIp?: string;
}

export interface DashboardSummary {
  totalDevices: number;
  activeDevices: number; // UP
  warningDevices: number; // WARNING
  downDevices: number; // DOWN
  avgLatency: number;
}
