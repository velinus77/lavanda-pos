#!/usr/bin/env tsx
/**
 * Migration runner for Lavanda Pharmacy POS
 * Applies SQL migrations to the database
 */

import { getDb, closeDb } from './db';
import * as path from 'path';
import * as fs from 'fs';

async function runMigrations() {
  const db = getDb();
  const client = (db as any).client as any; // BetterSQLite3Database client
  
  console.log('🔧 Running database migrations...\n');
  
  try {
    // Ensure migrations table exists
    client.exec(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    
    // Get list of applied migrations
    const stmt = client.prepare('SELECT hash FROM __drizzle_migrations ORDER BY id');
    const appliedMigrations = stmt.all() as { hash: string }[];
    const appliedHashes = new Set(appliedMigrations.map(m => m.hash));
    
    // Get migration files
    const migrationsPath = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${files.length} migration file(s)\n`);
    
    let migrationCount = 0;
    
    for (const file of files) {
      // Create hash from filename (simplified - drizzle uses content hash)
      const hash = file;
      
      if (appliedHashes.has(hash)) {
        console.log(`⏭️  Skipped: ${file} (already applied)`);
        continue;
      }
      
      const filePath = path.join(migrationsPath, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`📄 Applying: ${file}`);
      
      // Run migration in transaction
      client.exec('BEGIN');
      try {
        client.exec(sql);
        
        // Record migration
        client.prepare('INSERT INTO __drizzle_migrations (hash) VALUES (?)').run(hash);
        
        client.exec('COMMIT');
        migrationCount++;
        console.log(`   ✓ Success\n`);
      } catch (error) {
        client.exec('ROLLBACK');
        console.error(`   ❌ Failed: ${error}\n`);
        throw error;
      }
    }
    
    console.log(`✅ Migrations completed: ${migrationCount} applied\n`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    closeDb();
  }
}

// Run migrations
runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
