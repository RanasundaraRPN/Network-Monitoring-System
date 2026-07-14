import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users, devices } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { DecodedIdToken } from 'firebase-admin/auth';
import { runDeviceCheck } from '../services/monitor.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: typeof users.$inferSelect;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const email = decodedToken.email || 'no-email@firebase.com';
    const uid = decodedToken.uid;

    // Synchronize user to Cloud SQL database using upsert
    let dbUserRecord;
    try {
      const result = await db.insert(users)
        .values({
          uid,
          email,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
          },
        })
        .returning();

      dbUserRecord = result[0];

      // Auto-seed default simulated devices for first-time login
      const userDevicesCount = await db.select({ count: sql`count(*)` })
        .from(devices)
        .where(eq(devices.userId, dbUserRecord.id));

      if (parseInt(userDevicesCount[0]?.count as string || '0', 10) === 0) {
        const seeded = await db.insert(devices).values([
          {
            userId: dbUserRecord.id,
            name: 'API Gateway Server',
            ipAddress: '10.0.1.15',
            type: 'server',
            groupName: 'Production',
            isSimulated: true,
            pingIntervalSec: 15,
            latencyThresholdMs: 150,
          },
          {
            userId: dbUserRecord.id,
            name: 'Public Web Portal',
            ipAddress: 'https://google.com',
            type: 'website',
            groupName: 'Production',
            isSimulated: true,
            pingIntervalSec: 15,
            latencyThresholdMs: 250,
          },
          {
            userId: dbUserRecord.id,
            name: 'Core Database Server',
            ipAddress: '10.0.2.10',
            type: 'server',
            groupName: 'Database',
            isSimulated: true,
            pingIntervalSec: 15,
            latencyThresholdMs: 60,
          },
          {
            userId: dbUserRecord.id,
            name: 'Office Edge Router',
            ipAddress: '192.168.1.1',
            type: 'router',
            groupName: 'HQ Network',
            isSimulated: true,
            pingIntervalSec: 15,
            latencyThresholdMs: 80,
          }
        ]).returning();

        // Trigger immediate background check for seeded devices so they have history
        for (const d of seeded) {
          runDeviceCheck(d).catch(err => console.error('Error in seed check:', err));
        }
      }
    } catch (dbError) {
      console.error('Database user sync/seed failed during insert/upsert, attempting select:', dbError);
      const existing = await db.select().from(users).where(eq(users.uid, uid));
      if (existing.length > 0) {
        dbUserRecord = existing[0];
      } else {
        return res.status(500).json({ error: 'Failed to synchronize user account' });
      }
    }

    req.dbUser = dbUserRecord;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
