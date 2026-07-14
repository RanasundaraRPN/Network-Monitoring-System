import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

export const createPool = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const useSsl = process.env.SQL_SSL === 'true' || process.env.SQL_SSL === '1' || isProd;

  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 15000, // Close idle connections quickly to prevent dead sockets in serverless envs
    max: 25, // Support high concurrency from background scheduler and user requests
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    keepAlive: true, // Send keepalive packets to keep connections healthy
  });
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
export { schema };
