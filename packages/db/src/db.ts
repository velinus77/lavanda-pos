import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema/index';

// Database path - uses /data directory for SQLite storage
const DB_PATH = process.env.DATABASE_PATH || '../data/lavanda.db';

let db: BetterSQLite3Database<typeof schema>;

export function getDb() {
  if (!db) {
    const sqlite = new Database(DB_PATH);
    
    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');
    
    // Enable WAL mode for better concurrency
    sqlite.pragma('journal_mode = WAL');
    
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export function closeDb() {
  if (db) {
    const client = (db as any).client as Database;
    client.close();
    db = undefined as any;
  }
}

export { schema };
