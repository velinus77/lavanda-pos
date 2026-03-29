#!/usr/bin/env tsx
/**
 * Migration runner for Lavanda Pharmacy POS
 * Applies SQL migrations to the database (idempotent).
 */

import { getDb, closeDb, getRawClient } from './db';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  // Initialise db (creates file if needed)
  getDb();
  const client = getRawClient();

  console.log('\u{1F527} Running database migrations...\n');

  try {
    // Ensure migrations tracking table exists
    client.exec(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Get list of applied migrations
    const stmt = client.prepare('SELECT hash FROM __drizzle_migrations ORDER BY id');
    const appliedMigrations = stmt.all() as { hash: string }[];
    const appliedHashes = new Set(appliedMigrations.map((m) => m.hash));

    // Get migration files
    const migrationsPath = path.join(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsPath)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration file(s)\n`);

    let migrationCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const hash = file;

      if (appliedHashes.has(hash)) {
        console.log(`\u23ED\uFE0F  Skipped: ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      // Check if tables from this migration already exist (pre-seeded DB).
      // If the DB was bootstrapped outside the migration runner, mark as applied.
      const tablesExist = tablesMigrationAlreadyApplied(client, file);
      if (tablesExist) {
        client.prepare('INSERT OR IGNORE INTO __drizzle_migrations (hash) VALUES (?)').run(hash);
        console.log(`\u23ED\uFE0F  Bootstrapped: ${file} (tables already exist, marked as applied)`);
        skippedCount++;
        continue;
      }

      const filePath = path.join(migrationsPath, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`\u{1F4C4} Applying: ${file}`);

      // Run migration in transaction
      client.exec('BEGIN');
      try {
        client.exec(sql);
        client.prepare('INSERT OR IGNORE INTO __drizzle_migrations (hash) VALUES (?)').run(hash);
        client.exec('COMMIT');
        migrationCount++;
        console.log(`   \u2713 Success\n`);
      } catch (error) {
        client.exec('ROLLBACK');
        console.error(`   \u274C Failed: ${error}\n`);
        throw error;
      }
    }

    console.log(
      `\u2705 Migrations completed: ${migrationCount} applied, ${skippedCount} skipped\n`
    );
  } catch (error) {
    console.error('\u274C Migration failed:', error);
    throw error;
  } finally {
    closeDb();
  }
}

/**
 * Heuristic: check whether the tables defined in a migration SQL file already
 * exist in the database. Used to bootstrap the migration tracking table for
 * databases that were created outside the migration runner.
 */
function tablesMigrationAlreadyApplied(
  client: ReturnType<typeof getRawClient>,
  file: string
): boolean {
  if (file === '0000_initial_schema.sql') {
    const row = client
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='roles'`)
      .get() as { name: string } | undefined;
    return row !== undefined;
  }

  if (file === '0001_pos_phase1_transaction_model.sql') {
    const salePaymentsRow = client
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='sale_payments'`)
      .get() as { name: string } | undefined;
    const surchargeColumn = client
      .prepare(`SELECT name FROM pragma_table_info('sales') WHERE name='surcharge_amount'`)
      .get() as { name: string } | undefined;
    return salePaymentsRow !== undefined && surchargeColumn !== undefined;
  }

  if (file === '0002_pos_phase3_suspended_sales.sql') {
    const row = client
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='suspended_sales'`)
      .get() as { name: string } | undefined;
    return row !== undefined;
  }

  return false;
}

// Run migrations
runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
