import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not defined. Please check your .env.local file.\n' +
    `Current env keys: ${Object.keys(process.env).filter(k => k.includes('DATABASE')).join(', ')}`
  );
}

// Configure WebSocket for Node.js (required for Pool in local dev)
neonConfig.webSocketConstructor = ws;

// Pool-based driver with transaction support
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from './schema';
