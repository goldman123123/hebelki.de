import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not defined. Please check your .env.local file.\n' +
    `Current env keys: ${Object.keys(process.env).filter(k => k.includes('DATABASE')).join(', ')}`
  );
}

// Neon HTTP driver — each query is a stateless HTTPS request.
// No persistent TCP/WebSocket connections to drop, no cold-start pool issues.
// Works identically in local dev and Vercel serverless (production).
// Transactions are supported via batched HTTP requests.
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export * from './schema';
