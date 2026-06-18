import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { activities, offsets } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { Tip, TIPS_LIBRARY } from '../services/tips.js';

const router = Router();

// Secure stats/analytics endpoints.
router.use(authenticate);

/**
 * GET /api/stats/footprint
 * Computes raw carbon emission totals, offset credits totals, and net scores.
 * Outputs values both in kilograms and converted metric tons (rounded to 2 decimals).
 */
router.get('/footprint', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/breakdown
 * Computes emission percentages grouped by carbon category.
 * Maps category labels and chart theme color palettes dynamically.
 */
router.get('/breakdown', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/monthly
 * Computes chronological emission totals for the past 6 calendar months.
 * Formats month labels using SQLite strftime date formatting.
 */
router.get('/monthly', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/recent-activities
 * Returns the 10 most recently created user activity events.
 */
router.get('/recent-activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const recent = await db
      .select()
      .from(activities)
      .where(eq(activities.userId, userId))
      .orderBy(sql`${activities.createdAt} DESC`)
      .limit(10);

    res.json({ activities: recent });
  } catch (err) {
    next(err);
  }
});



/**
 * GET /api/stats/tips
 * Dynamically prioritizes tips from the user's highest emitting category,
 * padding results with random cards from other categories to build a set of exactly 4 recommendations.
 */
router.get('/tips', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

export default router;

