/**
 * Database Seeding Script.
 * Populates clean SQLite databases with realistic historical carbon metrics, targets, and offsets.
 * 
 * Execution:
 * `npm run seed` or `tsx src/db/seed.ts`
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './connection.js';
import { users, activities, goals, offsets } from './schema.js';
import { runMigrations } from './migrate.js';

/**
 * Executes the full database population script.
 */
export async function seed() {
  // Enforce DB tables initialization/validation before inserting mock rows.
  await runMigrations();
  console.log('🌱 Seeding database...');

  // ── Create demo user ──────────────────────────────────────────────────────
  // Use a workload factor of 12 for bcrypt hashes (secure balance between speed & strength).
  const passwordHash = await bcrypt.hash('password123', 12);

  const inserted = await db
    .insert(users)
    .values({
      email: 'alex@ecoaware.com',
      name: 'Alex Martin',
      passwordHash,
      avatarInitials: 'AM',
    })
    .onConflictDoNothing()
    .returning();

  // Guard clause to avoid re-populating historical data multiple times.
  if (inserted.length === 0) {
    console.log('⚠️  Demo user already exists. Skipping seed.');
    return;
  }

  const userId = inserted[0].id;

  // ── Past 6 months of activities ───────────────────────────────────────────
  const today = new Date();
  
  /**
   * Helper utility to calculate historical date strings relative to today's local date.
   * Format: YYYY-MM-DD
   */
  const mkDate = (monthsBack: number, day: number) => {
    const d = new Date(today.getFullYear(), today.getMonth() - monthsBack, day);
    return d.toISOString().split('T')[0];
  };

  // Populate multiple activity metrics representing a progressive transition to sustainable lifestyle choices.
  await db.insert(activities).values([
    // 5 months ago
    { userId, category: 'transport', description: 'Daily commute by petrol car', co2Kg: 210, date: mkDate(5, 5) },
    { userId, category: 'energy',    description: 'Monthly electricity bill',    co2Kg: 120, date: mkDate(5, 10) },
    { userId, category: 'diet',      description: 'Beef meals this month',        co2Kg: 99,  date: mkDate(5, 15) },
    { userId, category: 'waste',     description: 'Household waste',              co2Kg: 34,  date: mkDate(5, 20) },
    
    // 4 months ago
    { userId, category: 'transport', description: 'Daily commute by petrol car', co2Kg: 195, date: mkDate(4, 5) },
    { userId, category: 'energy',    description: 'Monthly electricity bill',    co2Kg: 115, date: mkDate(4, 10) },
    { userId, category: 'diet',      description: 'Mixed diet meals',             co2Kg: 85,  date: mkDate(4, 15) },
    { userId, category: 'waste',     description: 'Household waste',              co2Kg: 30,  date: mkDate(4, 20) },
    
    // 3 months ago — took some flights
    { userId, category: 'transport', description: 'Short-haul flight to London', co2Kg: 255, date: mkDate(3, 3) },
    { userId, category: 'transport', description: 'Train commute (switched!)',    co2Kg: 41,  date: mkDate(3, 5) },
    { userId, category: 'energy',    description: 'Monthly electricity bill',    co2Kg: 110, date: mkDate(3, 10) },
    { userId, category: 'diet',      description: 'More plant-based this month', co2Kg: 65,  date: mkDate(3, 15) },
    { userId, category: 'waste',     description: 'Reduced waste month',          co2Kg: 22,  date: mkDate(3, 20) },
    
    // 2 months ago — eco-conscious
    { userId, category: 'transport', description: 'Mixed: train + car (less)',   co2Kg: 130, date: mkDate(2, 5) },
    { userId, category: 'energy',    description: 'Switched to LED bulbs',       co2Kg: 88,  date: mkDate(2, 10) },
    { userId, category: 'diet',      description: 'Mostly vegetarian',            co2Kg: 54,  date: mkDate(2, 15) },
    { userId, category: 'waste',     description: 'Started composting',           co2Kg: 18,  date: mkDate(2, 20) },
    
    // 1 month ago
    { userId, category: 'transport', description: 'Mostly public transit',       co2Kg: 110, date: mkDate(1, 5) },
    { userId, category: 'energy',    description: 'Solar panel contribution',    co2Kg: 72,  date: mkDate(1, 10) },
    { userId, category: 'diet',      description: 'Vegan week + some chicken',   co2Kg: 48,  date: mkDate(1, 15) },
    { userId, category: 'waste',     description: 'Composting + recycling',       co2Kg: 12,  date: mkDate(1, 20) },
    
    // This month
    { userId, category: 'transport', description: 'Car to work (3 days)',        co2Kg: 63,  date: mkDate(0, 5) },
    { userId, category: 'energy',    description: 'Electricity this month',      co2Kg: 55,  date: mkDate(0, 8) },
    { userId, category: 'diet',      description: 'Balanced diet',               co2Kg: 40,  date: mkDate(0, 10) },
  ]);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
    .toISOString().split('T')[0];
  const inThreeMonths = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())
    .toISOString().split('T')[0];

  await db.insert(goals).values([
    { userId, title: 'Reduce transport CO₂ by 20%', targetCo2Kg: 100, currentCo2Kg: 63, deadline: nextMonth, status: 'active' },
    { userId, title: 'Go fully plant-based for 1 month', targetCo2Kg: 30, currentCo2Kg: 40, deadline: inThreeMonths, status: 'active' },
  ]);

  // ── Offsets ───────────────────────────────────────────────────────────────
  await db.insert(offsets).values([
    { userId, provider: 'Gold Standard', description: 'Reforestation in Kenya — 10 trees', co2Kg: 500, costUsd: 25, date: mkDate(3, 1) },
    { userId, provider: 'Cool Effect', description: 'Wind energy project in India', co2Kg: 300, costUsd: 15, date: mkDate(1, 15) },
  ]);

  console.log('✅ Seed complete!');
  console.log('   📧 Email: alex@ecoaware.com');
  console.log('   🔑 Password: password123');
}

// Only run the script directly if executed from CLI
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seed().then(() => process.exit(0)).catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
}

