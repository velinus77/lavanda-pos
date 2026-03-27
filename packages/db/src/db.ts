import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema/index';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path — resolve relative to this file so it works from any cwd
const DB_PATH = process.env.DATABASE_PATH ||
  path.join(__dirname, '../../data/lavanda.db');

let _db: BetterSQLite3Database<typeof schema> | undefined;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    const sqlite = new Database(DB_PATH);

    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');

    // Enable WAL mode for better concurrency
    sqlite.pragma('journal_mode = WAL');

    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

/**
 * Lazily-initialised singleton db instance.
 * Import this directly: `import { db } from '@lavanda/db'`
 */
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  }
});

export function closeDb() {
  if (_db) {
    // Raw better-sqlite3 client lives at _db.$client
    const client = (_db as unknown as { $client?: InstanceType<typeof Database> }).$client;
    client?.close();
    _db = undefined;
  }
}

export function getRawClient(): InstanceType<typeof Database> {
  const d = getDb();
  return (d as unknown as { $client: InstanceType<typeof Database> }).$client;
}

export { schema };
