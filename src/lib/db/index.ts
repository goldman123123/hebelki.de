import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not defined. Please check your .env.local file.\n' +
    `Current env keys: ${Object.keys(process.env).filter(k => k.includes('DATABASE')).join(', ')}`
  );
}

/**
 * Check if any error in the .cause chain is a transient network failure.
 * Drizzle wraps Neon errors: top-level "Failed query: ..." → cause "Error connecting to database" → cause ETIMEDOUT.
 */
function isTransientError(err: unknown): boolean {
  const keywords = ['fetch failed', 'ETIMEDOUT', 'Error connecting to database', 'ECONNRESET', 'ENOTFOUND']
  let current: unknown = err
  for (let depth = 0; depth < 5 && current; depth++) {
    if (current instanceof Error) {
      const msg = current.message || ''
      if (keywords.some(k => msg.includes(k))) return true
      // Also check .code on AggregateError / Node system errors
      const code = (current as NodeJS.ErrnoException).code
      if (code && keywords.includes(code)) return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
}

// Neon HTTP driver — each query is a stateless HTTPS request.
// No persistent TCP/WebSocket connections to drop, no cold-start pool issues.
// Works identically in local dev and Vercel serverless (production).
// Transactions are supported via batched HTTP requests.
const rawSql = neon(process.env.DATABASE_URL);

// Retry a promise-returning function with exponential backoff on transient errors.
function withRetry(fn: () => Promise<unknown>): Promise<unknown> {
  const retryDelays = [500, 1500]; // 2 retries, ~9s total window
  let chain = fn();
  for (const delay of retryDelays) {
    chain = chain.catch(async (err: unknown) => {
      if (isTransientError(err)) {
        console.warn(`[DB] Transient error, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        return fn();
      }
      throw err;
    });
  }
  return chain;
}

// Proxy wraps every SQL call with automatic retry on transient network errors.
// - apply trap: catches tagged template calls like sql`SELECT ...`
// - get trap: wraps .query method that drizzle-orm extracts and calls directly
//   (drizzle does `clientQuery = client.query ?? client` then calls clientQuery(),
//    which bypasses the apply trap — the get trap ensures .query is also wrapped)
const sql = new Proxy(rawSql, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (prop === 'query' && typeof value === 'function') {
      return (...args: unknown[]) =>
        withRetry(() => (value as Function).apply(target, args) as Promise<unknown>);
    }
    return value;
  },
  apply(target, thisArg, argArray) {
    return withRetry(() => Reflect.apply(target, thisArg, argArray) as Promise<unknown>);
  }
}) as typeof rawSql;

export const db = drizzle(sql, { schema });

/**
 * Retry wrapper for Neon HTTP queries that fail with ETIMEDOUT / fetch failed.
 * NOTE: The sql Proxy above already retries every query automatically.
 * This function is kept for explicit double-retry on critical paths (auth, conversation saves).
 */
export async function dbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      if (isTransientError(err) && attempt < retries) {
        await new Promise(r => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }
  throw new Error('dbRetry: unreachable')
}

export * from './schema';
