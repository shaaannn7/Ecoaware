import { client } from './connection.js';

/**
 * Executes SQLite migrations manually using LibSQL batch execution.
 * Creates all base tables if they do not exist and applies differential schemas.
 *
 * Design Decisions:
 * - PRAGMA foreign_keys = ON: Enforces referential integrity in SQLite at connection level.
 * - CASCADE deletes: Ensures deleting a User automatically purges their associated activity metrics.
 */
export async function runMigrations() {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;

    -- ── Users Table ──────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_initials TEXT NOT NULL DEFAULT '??',
      monthly_limit_kg REAL NOT NULL DEFAULT 1000.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Activities Table (Tracks raw user carbon consumption metrics) ─────────
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      co2_kg REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Carbon Reduction Goals Table ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      target_co2_kg REAL NOT NULL,
      current_co2_kg REAL NOT NULL DEFAULT 0,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Offsets Table (Tracks carbon credits or offsets purchased) ────────────
    CREATE TABLE IF NOT EXISTS offsets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      description TEXT NOT NULL,
      co2_kg REAL NOT NULL,
      cost_usd REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── Refresh Tokens Table (Stores tokens for persistent sessions) ──────────
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Run dynamic schema upgrades for existing installations.
  // SQLite does not support IF NOT EXISTS for ADD COLUMN, so we execute and trap the "duplicate column" error.
  try {
    await client.execute("ALTER TABLE users ADD COLUMN monthly_limit_kg REAL NOT NULL DEFAULT 1000.0;");
    console.log('🔧 Dynamic migration: Added monthly_limit_kg to users table');
  } catch (err) {
    // Column already exists, safe to ignore
  }

  console.log('✅ Database migrations complete');
}

