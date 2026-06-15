import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Users Schema ──────────────────────────────────────────────────────────────
/**
 * Drizzle schema definition for the `users` table.
 * Stores core user profile, authentication references, and target limits.
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarInitials: text('avatar_initials').notNull().default('??'),
  monthlyLimitKg: real('monthly_limit_kg').notNull().default(1000.0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Activities Schema ─────────────────────────────────────────────────────────
/**
 * Drizzle schema definition for the `activities` table.
 * Tracks carbon footprint actions added by the user.
 * 
 * Valid categories: 'transport' | 'energy' | 'diet' | 'waste'
 */
export const activities = sqliteTable('activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), 
  description: text('description').notNull(),
  co2Kg: real('co2_kg').notNull(),       // CO2 quantity emitted in kilograms
  date: text('date').notNull(),           // ISO date string format: YYYY-MM-DD
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Goals Schema ──────────────────────────────────────────────────────────────
/**
 * Drizzle schema definition for the `goals` table.
 * Represents reduction goals set by a user.
 * 
 * Valid status values: 'active' | 'completed' | 'failed'
 */
export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  targetCo2Kg: real('target_co2_kg').notNull(),   // Target reduction limit in kg
  currentCo2Kg: real('current_co2_kg').notNull().default(0),
  deadline: text('deadline').notNull(),            // Target completion ISO date: YYYY-MM-DD
  status: text('status').notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Offsets Schema ────────────────────────────────────────────────────────────
/**
 * Drizzle schema definition for the `offsets` table.
 * Records contributions user makes to carbon offsetting programs.
 */
export const offsets = sqliteTable('offsets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  description: text('description').notNull(),
  co2Kg: real('co2_kg').notNull(),
  costUsd: real('cost_usd').notNull().default(0),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Refresh Tokens Schema ─────────────────────────────────────────────────────
/**
 * Drizzle schema definition for persistent sessions verification.
 */
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// ─── Type Inference Helpers ────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type Offset = typeof offsets.$inferSelect;
export type NewOffset = typeof offsets.$inferInsert;

