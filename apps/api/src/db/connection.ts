import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Resolve __dirname equivalents for ES modules since standard Node global is unavailable.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Locate the local SQLite database file path.
const DB_PATH = path.join(__dirname, '../../carbon.db');

const databaseUrl = process.env.DATABASE_URL || `file:${DB_PATH}`;
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

/**
 * Instantiate the native @libsql client.
 * Connects to the database file or Turso cloud server.
 */
export const client = createClient({
  url: databaseUrl,
  authToken: authToken,
});

/**
 * Drizzle ORM client wrapper initialized with the LibSQL driver and schema mappings.
 * Used for structured querying, insertion, and relations support.
 */
export const db = drizzle(client, { schema });

