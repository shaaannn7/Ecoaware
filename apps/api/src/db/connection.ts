import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname equivalents for ES modules since standard Node global is unavailable.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Locate the local SQLite database file path.
const DB_PATH = path.join(__dirname, '../../carbon.db');

/**
 * Instantiate the native @libsql client.
 * Connects to the local SQLite database file via the `file:` protocol.
 */
export const client = createClient({
  url: `file:${DB_PATH}`,
});

/**
 * Drizzle ORM client wrapper initialized with the LibSQL driver and schema schema mappings.
 * Used for structured querying, insertion, and relations support.
 */
export const db = drizzle(client, { schema });

