import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// Users table linked with Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Monitored Devices
export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  ipAddress: text('ip_address').notNull(),
  type: text('type').notNull(), // 'server' | 'router' | 'switch' | 'website'
  groupName: text('group_name').default('General'),
  isSimulated: boolean('is_simulated').default(true).notNull(),
  pingIntervalSec: integer('ping_interval_sec').default(15).notNull(),
  latencyThresholdMs: integer('latency_threshold_ms').default(200).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Historic checks for metrics
export const deviceChecks = pgTable('device_checks', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => devices.id, { onDelete: 'cascade' })
    .notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  status: text('status').notNull(), // 'UP' | 'DOWN' | 'WARNING'
  latencyMs: integer('latency_ms'),
  packetLossPct: integer('packet_loss_pct'),
});

// Generated Alerts
export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => devices.id, { onDelete: 'cascade' })
    .notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull(), // 'WARNING' | 'CRITICAL'
  triggeredAt: timestamp('triggered_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
  checks: many(deviceChecks),
  alerts: many(alerts),
}));

export const deviceChecksRelations = relations(deviceChecks, ({ one }) => ({
  device: one(devices, {
    fields: [deviceChecks.deviceId],
    references: [devices.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  device: one(devices, {
    fields: [alerts.deviceId],
    references: [devices.id],
  }),
}));
