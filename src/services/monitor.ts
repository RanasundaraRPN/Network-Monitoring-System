import net from 'net';
import { exec } from 'child_process';
import { db } from '../db/index.ts';
import { devices, deviceChecks, alerts } from '../db/schema.ts';
import { eq, and, isNull } from 'drizzle-orm';

// System ping helper
function systemPing(host: string): Promise<{ latencyMs: number; packetLossPct: number } | null> {
  return new Promise((resolve) => {
    // Clean hostname for ping (remove protocols/ports)
    let cleanHost = host.replace(/https?:\/\//i, '').split(':')[0].split('/')[0];
    
    const isWin = process.platform === 'win32';
    const cmd = isWin 
      ? `ping -n 3 ${cleanHost}` 
      : `ping -c 3 -W 2 ${cleanHost}`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve(null);
        return;
      }
      
      try {
        let packetLossPct = 0;
        let latencyMs = 20;

        const lossMatch = stdout.match(/(\d+)%\s+packet\s+loss/i);
        if (lossMatch) {
          packetLossPct = parseInt(lossMatch[1], 10);
        }

        const rttMatch = stdout.match(/rtt\s+min\/avg\/max\/mdev\s+=\s+([\d.]+)\/([\d.]+)\/([\d.]+)/i);
        if (rttMatch) {
          latencyMs = Math.round(parseFloat(rttMatch[2]));
        } else {
          // Windows ping parsing
          const winLossMatch = stdout.match(/Lost\s+=\s+(\d+)\s+\((\d+)%\s+loss\)/i);
          if (winLossMatch) {
            packetLossPct = parseInt(winLossMatch[2], 10);
          }
          const winRttMatch = stdout.match(/Average\s+=\s+(\d+)ms/i);
          if (winRttMatch) {
            latencyMs = parseInt(winRttMatch[1], 10);
          }
        }

        resolve({ latencyMs, packetLossPct });
      } catch (err) {
        resolve(null);
      }
    });
  });
}

// TCP Port connection helper
function tcpPortCheck(host: string, port: number, timeoutMs = 2000): Promise<{ latencyMs: number } | null> {
  return new Promise((resolve) => {
    // Clean hostname
    let cleanHost = host.replace(/https?:\/\//i, '').split(':')[0].split('/')[0];
    const start = Date.now();
    const socket = new net.Socket();
    
    socket.setTimeout(timeoutMs);
    
    socket.connect(port, cleanHost, () => {
      const latencyMs = Date.now() - start;
      socket.destroy();
      resolve({ latencyMs });
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(null);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
  });
}

// Web HTTP fetch helper
async function webFetchCheck(urlStr: string, timeoutMs = 4000): Promise<{ latencyMs: number } | null> {
  const start = Date.now();
  let cleanUrl = urlStr;
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'http://' + cleanUrl;
  }
  
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(cleanUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'NetworkMonitor/1.0' }
    });
    clearTimeout(id);
    
    const latencyMs = Date.now() - start;
    if (response.ok || response.status < 500) {
      return { latencyMs };
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Perform simulated metrics generation
function runSimulatedCheck(device: typeof devices.$inferSelect): {
  status: 'UP' | 'DOWN' | 'WARNING';
  latencyMs: number | null;
  packetLossPct: number | null;
} {
  // 3% chance of being down, 10% chance of high latency/warning, 87% chance of healthy UP
  const rand = Math.random();
  
  let baseLatency = 20;
  if (device.type === 'website') baseLatency = 60;
  if (device.type === 'router') baseLatency = 4;
  if (device.type === 'switch') baseLatency = 2;

  // Add a small fluctuation
  let latencyMs = Math.round(baseLatency + (Math.random() * 15 - 5));
  if (latencyMs < 1) latencyMs = 1;

  let packetLossPct = 0;
  let status: 'UP' | 'DOWN' | 'WARNING' = 'UP';

  if (rand < 0.03) {
    // DOWN
    status = 'DOWN';
    latencyMs = null;
    packetLossPct = 100;
  } else if (rand < 0.13) {
    // WARNING: High latency or light packet loss
    status = 'WARNING';
    latencyMs = Math.round(device.latencyThresholdMs * (1.1 + Math.random() * 0.4));
    packetLossPct = Math.round(Math.random() * 15 + 5); // 5% - 20% loss
  } else {
    // Healthy UP
    packetLossPct = Math.random() > 0.8 ? Math.round(Math.random() * 2) : 0;
    status = latencyMs > device.latencyThresholdMs ? 'WARNING' : 'UP';
  }

  return { status, latencyMs, packetLossPct };
}

// Execute checks on a device and save history + alerts
export async function runDeviceCheck(device: typeof devices.$inferSelect): Promise<void> {
  let status: 'UP' | 'DOWN' | 'WARNING' = 'UP';
  let latencyMs: number | null = null;
  let packetLossPct: number | null = 0;

  if (device.isSimulated) {
    const result = runSimulatedCheck(device);
    status = result.status;
    latencyMs = result.latencyMs;
    packetLossPct = result.packetLossPct;
  } else {
    // Real mode
    try {
      if (device.type === 'website') {
        const webResult = await webFetchCheck(device.ipAddress);
        if (webResult) {
          latencyMs = webResult.latencyMs;
          packetLossPct = 0;
          status = latencyMs > device.latencyThresholdMs ? 'WARNING' : 'UP';
        } else {
          // Fallback to socket check
          const socketResult = await tcpPortCheck(device.ipAddress, 80);
          if (socketResult) {
            latencyMs = socketResult.latencyMs;
            packetLossPct = 0;
            status = latencyMs > device.latencyThresholdMs ? 'WARNING' : 'UP';
          } else {
            status = 'DOWN';
            latencyMs = null;
            packetLossPct = 100;
          }
        }
      } else {
        // Servers, routers, switches: Try Ping, then TCP sockets on common ports
        const pingResult = await systemPing(device.ipAddress);
        if (pingResult) {
          latencyMs = pingResult.latencyMs;
          packetLossPct = pingResult.packetLossPct;
          
          if (packetLossPct >= 100) {
            status = 'DOWN';
          } else if (packetLossPct > 10 || latencyMs > device.latencyThresholdMs) {
            status = 'WARNING';
          } else {
            status = 'UP';
          }
        } else {
          // Fallback to TCP checks on SSH (22), HTTP (80), HTTPS (443)
          let port = 80;
          if (device.type === 'server') port = 22;
          
          const socketResult = await tcpPortCheck(device.ipAddress, port);
          if (socketResult) {
            latencyMs = socketResult.latencyMs;
            packetLossPct = 0;
            status = latencyMs > device.latencyThresholdMs ? 'WARNING' : 'UP';
          } else {
            status = 'DOWN';
            latencyMs = null;
            packetLossPct = 100;
          }
        }
      }
    } catch (err) {
      console.error(`Error checking real device ${device.name}:`, err);
      status = 'DOWN';
      latencyMs = null;
      packetLossPct = 100;
    }
  }

  // 1. Record the Check in DB
  try {
    await db.insert(deviceChecks).values({
      deviceId: device.id,
      status,
      latencyMs,
      packetLossPct,
    });
  } catch (err) {
    console.error('Failed to save device check:', err);
  }

  // 2. Alert Generation & Resolution Engine
  try {
    if (status === 'DOWN') {
      // Find unresolved DOWN alert
      const activeAlerts = await db.select().from(alerts).where(
        and(
          eq(alerts.deviceId, device.id),
          isNull(alerts.resolvedAt),
          eq(alerts.severity, 'CRITICAL')
        )
      );

      if (activeAlerts.length === 0) {
        // Trigger a CRITICAL alert
        await db.insert(alerts).values({
          deviceId: device.id,
          message: `Device is Offline. Failed to connect via ${device.type === 'website' ? 'HTTP/HTTPS' : 'ICMP/TCP'}.`,
          severity: 'CRITICAL',
        });
      }

      // Resolve warning alerts if they are active
      await db.update(alerts)
        .set({ resolvedAt: new Date() })
        .where(
          and(
            eq(alerts.deviceId, device.id),
            isNull(alerts.resolvedAt),
            eq(alerts.severity, 'WARNING')
          )
        );

    } else if (status === 'WARNING') {
      // Check for unresolved warnings
      const activeAlerts = await db.select().from(alerts).where(
        and(
          eq(alerts.deviceId, device.id),
          isNull(alerts.resolvedAt),
          eq(alerts.severity, 'WARNING')
        )
      );

      if (activeAlerts.length === 0) {
        let warnMsg = `High latency detected: ${latencyMs}ms (threshold: ${device.latencyThresholdMs}ms).`;
        if (packetLossPct && packetLossPct > 0) {
          warnMsg = `Packet loss detected: ${packetLossPct}% with latency: ${latencyMs}ms.`;
        }
        await db.insert(alerts).values({
          deviceId: device.id,
          message: warnMsg,
          severity: 'WARNING',
        });
      }

      // Resolve critical alerts (device came back online with warnings)
      await db.update(alerts)
        .set({ resolvedAt: new Date() })
        .where(
          and(
            eq(alerts.deviceId, device.id),
            isNull(alerts.resolvedAt),
            eq(alerts.severity, 'CRITICAL')
          )
        );

    } else {
      // Device is healthy (UP). Resolve ALL active alerts for this device
      await db.update(alerts)
        .set({ resolvedAt: new Date() })
        .where(
          and(
            eq(alerts.deviceId, device.id),
            isNull(alerts.resolvedAt)
          )
        );
    }
  } catch (err) {
    console.error('Failed to update alerts:', err);
  }
}
