import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { devices, deviceChecks, alerts } from './src/db/schema.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { startMonitoringScheduler } from './src/services/scheduler.ts';
import { runDeviceCheck } from './src/services/monitor.ts';
import { eq, and, desc, sql } from 'drizzle-orm';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON body parsing middleware
  app.use(express.json());

  // Background monitoring scheduler startup
  startMonitoringScheduler(15000);

  // 1. Healthcheck Route (Public)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // 2. Auth Context Endpoint (Protected)
  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    res.json({
      firebaseUser: req.user,
      dbUser: req.dbUser,
    });
  });

  // 3. Get Dashboard Summary (Protected)
  app.get('/api/dashboard/summary', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUser!.id;
      const userDevices = await db.select().from(devices).where(eq(devices.userId, userId));
      
      const totalDevices = userDevices.length;
      let activeDevices = 0; // UP
      let warningDevices = 0; // WARNING
      let downDevices = 0; // DOWN
      let totalLatency = 0;
      let latencyCount = 0;

      for (const device of userDevices) {
        const latestCheck = await db.select()
          .from(deviceChecks)
          .where(eq(deviceChecks.deviceId, device.id))
          .orderBy(desc(deviceChecks.timestamp))
          .limit(1);

        if (latestCheck.length > 0) {
          const check = latestCheck[0];
          if (check.status === 'UP') activeDevices++;
          else if (check.status === 'WARNING') warningDevices++;
          else if (check.status === 'DOWN') downDevices++;

          if (check.latencyMs !== null) {
            totalLatency += check.latencyMs;
            latencyCount++;
          }
        } else {
          // If no checks yet, default to UP
          activeDevices++;
        }
      }

      const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

      res.json({
        totalDevices,
        activeDevices,
        warningDevices,
        downDevices,
        avgLatency,
      });
    } catch (error: any) {
      console.error('Failed to load dashboard summary:', error);
      res.status(500).json({ error: 'Failed to load dashboard summary' });
    }
  });

  // Custom Refresh Trigger (Protected)
  app.post('/api/devices/refresh', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUser!.id;
      const userDevices = await db.select().from(devices).where(eq(devices.userId, userId));
      
      // Trigger all checks in parallel in background
      await Promise.all(userDevices.map(d => runDeviceCheck(d).catch(console.error)));
      
      res.json({ message: 'Refresh checks completed successfully' });
    } catch (error) {
      console.error('Refresh failed:', error);
      res.status(500).json({ error: 'Failed to trigger device refresh' });
    }
  });

  // 4. Get User Devices with Current Status (Protected)
  app.get('/api/devices', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUser!.id;
      const userDevices = await db.select().from(devices).where(eq(devices.userId, userId)).orderBy(desc(devices.createdAt));
      
      const result = [];
      for (const device of userDevices) {
        const latestCheck = await db.select()
          .from(deviceChecks)
          .where(eq(deviceChecks.deviceId, device.id))
          .orderBy(desc(deviceChecks.timestamp))
          .limit(1);
          
        result.push({
          ...device,
          latestCheck: latestCheck[0] || null,
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      res.status(500).json({ error: 'Failed to fetch devices' });
    }
  });

  // 5. Create Device (Protected)
  app.post('/api/devices', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, ipAddress, type, groupName, isSimulated, pingIntervalSec, latencyThresholdMs } = req.body;
      const userId = req.dbUser!.id;

      if (!name || !ipAddress || !type) {
        return res.status(400).json({ error: 'Missing required fields: name, ipAddress, type' });
      }

      const [newDevice] = await db.insert(devices).values({
        userId,
        name,
        ipAddress,
        type,
        groupName: groupName || 'General',
        isSimulated: isSimulated !== undefined ? isSimulated : true,
        pingIntervalSec: pingIntervalSec || 15,
        latencyThresholdMs: latencyThresholdMs || 200,
      }).returning();

      // Run an immediate check in the background so it is instantly populated with metrics
      runDeviceCheck(newDevice).catch(err => console.error('Error running immediate check:', err));

      res.status(201).json(newDevice);
    } catch (error) {
      console.error('Failed to create device:', error);
      res.status(500).json({ error: 'Failed to create device' });
    }
  });

  // 6. Update Device (Protected)
  app.put('/api/devices/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.dbUser!.id;
      const { name, ipAddress, type, groupName, isSimulated, pingIntervalSec, latencyThresholdMs } = req.body;

      const existing = await db.select().from(devices).where(
        and(eq(devices.id, deviceId), eq(devices.userId, userId))
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Device not found' });
      }

      const [updatedDevice] = await db.update(devices)
        .set({
          name: name !== undefined ? name : existing[0].name,
          ipAddress: ipAddress !== undefined ? ipAddress : existing[0].ipAddress,
          type: type !== undefined ? type : existing[0].type,
          groupName: groupName !== undefined ? groupName : existing[0].groupName,
          isSimulated: isSimulated !== undefined ? isSimulated : existing[0].isSimulated,
          pingIntervalSec: pingIntervalSec !== undefined ? pingIntervalSec : existing[0].pingIntervalSec,
          latencyThresholdMs: latencyThresholdMs !== undefined ? latencyThresholdMs : existing[0].latencyThresholdMs,
        })
        .where(eq(devices.id, deviceId))
        .returning();

      // Trigger check immediately for the updated settings
      runDeviceCheck(updatedDevice).catch(err => console.error('Error running immediate check after update:', err));

      res.json(updatedDevice);
    } catch (error) {
      console.error('Failed to update device:', error);
      res.status(500).json({ error: 'Failed to update device' });
    }
  });

  // 7. Delete Device (Protected)
  app.delete('/api/devices/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.dbUser!.id;

      const existing = await db.select().from(devices).where(
        and(eq(devices.id, deviceId), eq(devices.userId, userId))
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Device not found' });
      }

      await db.delete(devices).where(eq(devices.id, deviceId));
      res.json({ message: 'Device deleted successfully' });
    } catch (error) {
      console.error('Failed to delete device:', error);
      res.status(500).json({ error: 'Failed to delete device' });
    }
  });

  // 8. Get Device History (Protected)
  app.get('/api/devices/:id/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.dbUser!.id;
      const range = (req.query.range as string) || '24h';

      const existing = await db.select().from(devices).where(
        and(eq(devices.id, deviceId), eq(devices.userId, userId))
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Device not found' });
      }

      let intervalExpr = '24 hours';
      if (range === '1h') intervalExpr = '1 hour';
      else if (range === '7d') intervalExpr = '7 days';

      const history = await db.select()
        .from(deviceChecks)
        .where(
          and(
            eq(deviceChecks.deviceId, deviceId),
            sql`${deviceChecks.timestamp} >= NOW() - (${intervalExpr})::interval`
          )
        )
        .orderBy(deviceChecks.timestamp);

      res.json(history);
    } catch (error) {
      console.error('Failed to fetch device history:', error);
      res.status(500).json({ error: 'Failed to fetch device history' });
    }
  });

  // 9. Get Alerts (Protected)
  app.get('/api/alerts', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUser!.id;

      const userAlerts = await db.select({
        id: alerts.id,
        deviceId: alerts.deviceId,
        message: alerts.message,
        severity: alerts.severity,
        triggeredAt: alerts.triggeredAt,
        resolvedAt: alerts.resolvedAt,
        deviceName: devices.name,
        deviceIp: devices.ipAddress,
      })
      .from(alerts)
      .innerJoin(devices, eq(alerts.deviceId, devices.id))
      .where(eq(devices.userId, userId))
      .orderBy(desc(alerts.triggeredAt));

      res.json(userAlerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  // 10. Serve Vite Client (Dev mode) / Serve Static assets (Production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
