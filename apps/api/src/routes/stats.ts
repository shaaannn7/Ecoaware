import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { activities, offsets } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Secure stats/analytics endpoints.
router.use(authenticate);

/**
 * GET /api/stats/footprint
 * Computes raw carbon emission totals, offset credits totals, and net scores.
 * Outputs values both in kilograms and converted metric tons (rounded to 2 decimals).
 */
router.get('/footprint', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Aggregate user emissions. Coalesce protects against empty database results returning null.
  const [activityRow] = await db
    .select({ total: sql<number>`COALESCE(sum(${activities.co2Kg}), 0)` })
    .from(activities)
    .where(eq(activities.userId, userId));

  // Aggregate user offsets.
  const [offsetRow] = await db
    .select({ total: sql<number>`COALESCE(sum(${offsets.co2Kg}), 0)` })
    .from(offsets)
    .where(eq(offsets.userId, userId));

  const totalKg = activityRow?.total ?? 0;
  const offsetKg = offsetRow?.total ?? 0;
  const netKg = Math.max(0, totalKg - offsetKg);

  /** Helper conversion factor to convert kilograms into metric tons. */
  const toTons = (kg: number) => Math.round((kg / 1000) * 100) / 100;

  res.json({
    totalTons: toTons(totalKg),
    offsetTons: toTons(offsetKg),
    netTons: toTons(netKg),
    totalKg: Math.round(totalKg * 10) / 10,
    offsetKg: Math.round(offsetKg * 10) / 10,
    netKg: Math.round(netKg * 10) / 10,
  });
});

/**
 * GET /api/stats/breakdown
 * Computes emission percentages grouped by carbon category.
 * Maps category labels and chart theme color palettes dynamically.
 */
router.get('/breakdown', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const rows = await db
    .select({
      category: activities.category,
      totalKg: sql<number>`COALESCE(sum(${activities.co2Kg}), 0)`,
    })
    .from(activities)
    .where(eq(activities.userId, userId))
    .groupBy(activities.category);

  const grandTotal = rows.reduce((sum, r) => sum + r.totalKg, 0);

  // Styling theme colors matched to category semantics for both Light/Dark modes.
  const CATEGORY_COLORS: Record<string, { light: string; dark: string }> = {
    transport: { light: '#2b9348', dark: '#4ade80' },
    energy:    { light: '#55a630', dark: '#86efac' },
    diet:      { light: '#80b918', dark: '#bbf7d0' },
    waste:     { light: '#aacc00', dark: '#dcfce7' },
  };

  const CATEGORY_LABELS: Record<string, string> = {
    transport: 'Transportation',
    energy: 'Energy',
    diet: 'Diet',
    waste: 'Waste',
  };

  const breakdown = rows.map((r) => ({
    name: CATEGORY_LABELS[r.category] ?? r.category,
    category: r.category,
    value: grandTotal > 0 ? Math.round((r.totalKg / grandTotal) * 100) : 0,
    kg: Math.round(r.totalKg * 10) / 10,
    colorLight: CATEGORY_COLORS[r.category]?.light ?? '#2b9348',
    colorDark: CATEGORY_COLORS[r.category]?.dark ?? '#4ade80',
  }));

  res.json({ breakdown, totalKg: Math.round(grandTotal * 10) / 10 });
});

/**
 * GET /api/stats/monthly
 * Computes chronological emission totals for the past 6 calendar months.
 * Formats month labels using SQLite strftime date formatting.
 */
router.get('/monthly', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Construct a chronological array of the last 6 months to guarantee continuous bar charts even with zero data.
  const months: { label: string; yearMonth: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en-US', { month: 'short' });
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label, yearMonth });
  }

  // Fetch carbon sum grouped by year-month string segment.
  const rows = await db
    .select({
      yearMonth: sql<string>`strftime('%Y-%m', ${activities.date})`,
      totalKg: sql<number>`COALESCE(sum(${activities.co2Kg}), 0)`,
    })
    .from(activities)
    .where(eq(activities.userId, userId))
    .groupBy(sql`strftime('%Y-%m', ${activities.date})`);

  const dataMap = new Map(rows.map((r) => [r.yearMonth, r.totalKg]));
  const maxKg = Math.max(...rows.map((r) => r.totalKg), 1);

  const monthly = months.map(({ label, yearMonth }) => {
    const kg = dataMap.get(yearMonth) ?? 0;
    return {
      label,
      yearMonth,
      kg: Math.round(kg * 10) / 10,
      percentage: Math.round((kg / maxKg) * 100),
    };
  });

  res.json({ monthly });
});

/**
 * GET /api/stats/recent-activities
 * Returns the 10 most recently created user activity events.
 */
router.get('/recent-activities', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const recent = await db
    .select()
    .from(activities)
    .where(eq(activities.userId, userId))
    .orderBy(sql`${activities.createdAt} DESC`)
    .limit(10);

  res.json({ activities: recent });
});

/**
 * Interface detailing structure of individual ecological suggestions.
 */
interface Tip {
  id: string;
  category: 'transport' | 'energy' | 'diet' | 'waste';
  title: string;
  description: string;
  savingsKg: number;
}

/** Static repository of sustainability recommendation cards. */
const TIPS_LIBRARY: Tip[] = [
  {
    id: 't1',
    category: 'transport',
    title: 'Commute via Public Transit',
    description: 'Opt for trains or buses instead of driving solo. This reduces travel emissions by up to 60%.',
    savingsKg: 85,
  },
  {
    id: 't2',
    category: 'transport',
    title: 'Try Biking or Walking',
    description: 'For short trips under 2 miles, walk or cycle. It is 100% emission-free and keeps you healthy!',
    savingsKg: 20,
  },
  {
    id: 't3',
    category: 'transport',
    title: 'Maintain Eco-Driving Habits',
    description: 'Keep tires inflated, avoid aggressive acceleration, and clear unnecessary weight from your trunk.',
    savingsKg: 15,
  },
  {
    id: 't4',
    category: 'energy',
    title: 'Switch to Smart LEDs',
    description: 'Replace standard light bulbs with Energy Star LEDs. They use 75-80% less power and last longer.',
    savingsKg: 40,
  },
  {
    id: 't5',
    category: 'energy',
    title: 'Adjust Thermostat by 2°F',
    description: 'Lower heating in winter or raise AC in summer. A small adjustment makes a massive difference on the grid.',
    savingsKg: 50,
  },
  {
    id: 't6',
    category: 'energy',
    title: 'Unplug Phantom Loads',
    description: 'Unplug TVs, chargers, and appliances when not in use. Standby energy represents 10% of home electricity use.',
    savingsKg: 12,
  },
  {
    id: 't7',
    category: 'diet',
    title: 'Adopt Meatless Mondays',
    description: 'Swapping beef/lamb for plant-based alternatives just one day a week saves significant agricultural emissions.',
    savingsKg: 35,
  },
  {
    id: 't8',
    category: 'diet',
    title: 'Minimize Food Waste',
    description: 'Plan your meals, utilize leftovers, and freeze extras. Landfilled food produces potent greenhouse gases.',
    savingsKg: 25,
  },
  {
    id: 't9',
    category: 'diet',
    title: 'Select Local & Seasonal Food',
    description: 'Buy local produce to cut down on food miles (transport emissions) and support sustainable farming.',
    savingsKg: 18,
  },
  {
    id: 't10',
    category: 'waste',
    title: 'Ditch Single-Use Plastics',
    description: 'Use reusable shopping bags, water bottles, and coffee cups to decrease manufacturing and processing waste.',
    savingsKg: 8,
  },
  {
    id: 't11',
    category: 'waste',
    title: 'Start Organic Composting',
    description: 'Compost fruit scraps and coffee grounds. Diverting organic waste from landfills stops anaerobic methane generation.',
    savingsKg: 30,
  },
  {
    id: 't12',
    category: 'waste',
    title: 'Buy Secondhand or Bulk',
    description: 'Shopping secondhand items or buying staples in bulk reduces excess packaging materials and production demand.',
    savingsKg: 15,
  },
];

/**
 * GET /api/stats/tips
 * Dynamically prioritizes tips from the user's highest emitting category,
 * padding results with random cards from other categories to build a set of exactly 4 recommendations.
 */
router.get('/tips', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Retrieve user emission breakdown totals
  const breakdownRows = await db
    .select({
      category: activities.category,
      totalKg: sql<number>`COALESCE(sum(${activities.co2Kg}), 0)`,
    })
    .from(activities)
    .where(eq(activities.userId, userId))
    .groupBy(activities.category);

  // Sort categories from highest emitting to lowest.
  breakdownRows.sort((a, b) => b.totalKg - a.totalKg);

  const topCategory = breakdownRows.length > 0 && breakdownRows[0].totalKg > 0
    ? breakdownRows[0].category as 'transport' | 'energy' | 'diet' | 'waste'
    : null;

  let recommendedTips: Tip[] = [];

  if (topCategory) {
    // 1. Prioritize all tips that target the user's worst category.
    const topTips = TIPS_LIBRARY.filter(t => t.category === topCategory);
    recommendedTips.push(...topTips);

    // 2. Pad to 4 cards using random items from other categories.
    const otherTips = TIPS_LIBRARY.filter(t => t.category !== topCategory);
    otherTips.sort(() => Math.random() - 0.5);

    for (const tip of otherTips) {
      if (recommendedTips.length >= 4) break;
      recommendedTips.push(tip);
    }
  } else {
    // If user has no logs, pick 1 tip from each category to provide a balanced overview.
    const categories: ('transport' | 'energy' | 'diet' | 'waste')[] = ['transport', 'energy', 'diet', 'waste'];
    categories.forEach(cat => {
      const catTips = TIPS_LIBRARY.filter(t => t.category === cat);
      if (catTips.length > 0) {
        recommendedTips.push(catTips[Math.floor(Math.random() * catTips.length)]);
      }
    });
  }

  res.json({ tips: recommendedTips.slice(0, 4) });
});

export default router;

