import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { activities, offsets, goals, users } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Secure all assistant routes
router.use(authenticate);

/**
 * Interface detailing the structure of a gamification badge
 */
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: 'award' | 'zap' | 'shield' | 'leaf' | 'globe' | 'sparkles';
  unlocked: boolean;
  progress: number;
  target: number;
}

/**
 * POST /api/assistant/chat
 * Simulates a context-aware AI assistant that analyzes user's specific carbon data.
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Fetch user's current metrics for context
    const [activityRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${activities.co2Kg}), 0)` })
      .from(activities)
      .where(eq(activities.userId, userId));

    const [offsetRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${offsets.co2Kg}), 0)` })
      .from(offsets)
      .where(eq(offsets.userId, userId));

    const breakdownRows = await db
      .select({
        category: activities.category,
        totalKg: sql<number>`COALESCE(sum(${activities.co2Kg}), 0)`,
      })
      .from(activities)
      .where(eq(activities.userId, userId))
      .groupBy(activities.category);

    const totalKg = activityRow?.total ?? 0;
    const offsetKg = offsetRow?.total ?? 0;
    const netKg = Math.max(0, totalKg - offsetKg);

    // Sort categories from highest emitting to lowest
    breakdownRows.sort((a, b) => b.totalKg - a.totalKg);
    const topCategory = breakdownRows.length > 0 && breakdownRows[0].totalKg > 0 ? breakdownRows[0].category : null;
    const topCategoryEmissions = breakdownRows.length > 0 ? breakdownRows[0].totalKg : 0;

    const lowerMsg = message.toLowerCase();
    let responseText = '';

    // Contextual AI-like response generation based on actual user data
    if (lowerMsg.includes('analyze') || lowerMsg.includes('footprint') || lowerMsg.includes('data')) {
      responseText = `Based on my analysis of your carbon data, your total emissions stand at **${totalKg.toFixed(1)} kg CO₂e**, and you have offset **${offsetKg.toFixed(1)} kg CO₂e** through credits, leaving a net footprint of **${netKg.toFixed(1)} kg CO₂e**.\n\n`;

      if (topCategory) {
        const percentage = totalKg > 0 ? ((topCategoryEmissions / totalKg) * 100).toFixed(0) : '0';
        responseText += `Your highest emitting sector is **${topCategory.toUpperCase()}**, representing **${percentage}%** (${topCategoryEmissions.toFixed(1)} kg) of your total footprint. `;
        
        if (topCategory === 'transport') {
          responseText += `Since travel is your largest contributor, I recommend prioritizing public transport commutes, carpooling, or walking for short-distance trips. Shifting 3 trips a week to cycling can save up to **45 kg CO₂e** per month!`;
        } else if (topCategory === 'energy') {
          responseText += `Since home energy usage is high, check for phantom plug loads. Unplugging appliances when not in use and lowering your thermostat by 2°F during peak hours can shave **35 kg CO₂e** off your monthly bill.`;
        } else if (topCategory === 'diet') {
          responseText += `Since agriculture and diet carry high carbon weights, introducing just 2 meatless days a week could reduce your food footprint by **30 kg CO₂e** per month.`;
        } else if (topCategory === 'waste') {
          responseText += `Reducing packaging waste by buying in bulk and setting up a kitchen compost bin can save up to **25 kg CO₂e** of methane-equivalent emissions monthly.`;
        }
      } else {
        responseText += `You haven't logged any carbon activities yet! Use the **Add Activity** button on the dashboard to log your travel or household habits, and I will analyze your data immediately to offer customized reduction strategies.`;
      }
    } else if (lowerMsg.includes('tip') || lowerMsg.includes('reduction') || lowerMsg.includes('help')) {
      if (topCategory === 'transport') {
        responseText = `Here is your priority reduction roadmap:\n\n1. **Active Travel:** Walk/cycle for trips under 2km (Potential: **-20 kg/mo**).\n2. **Optimize Rail:** Swap short flights for train travel where possible (Potential: **-110 kg/flight**).\n3. **Eco-Driving:** Keep your tires inflated and drive smoothly to lower fuel consumption by 10%.`;
      } else {
        responseText = `Here are three high-impact tips you can apply today:\n\n1. **Phantom Power:** Use smart power strips to shut down standby devices completely (Potential: **-12 kg/mo**).\n2. **Thermostat:** Adjust your winter heating target down 2°F (Potential: **-50 kg/mo**).\n3. **Diet Shift:** Swap beef or lamb for poultry or plant-based proteins on Meatless Mondays (Potential: **-35 kg/mo**).`;
      }
    } else if (lowerMsg.includes('badge') || lowerMsg.includes('milestone') || lowerMsg.includes('gamify')) {
      responseText = `We have active rewards programs to support your journey! You can unlock badges like **Eco Pioneer** for your first log, **Green Commuter** for low travel footprints, and **Carbon Neutralizer** for logging offset credits. You've currently offset **${offsetKg.toFixed(0)} kg CO₂e**—keep it up!`;
    } else if (lowerMsg.includes('community') || lowerMsg.includes('comparison') || lowerMsg.includes('rank')) {
      const avgCommunity = 450; // Community average in kg
      const comparisonPct = avgCommunity > 0 ? ((netKg - avgCommunity) / avgCommunity) * 100 : 0;
      
      if (netKg === 0) {
        responseText = `You currently have 0 logged emissions, placing you in **1st place** of the community leaderboard! Log your carbon data to get an accurate comparison against the community average of **${avgCommunity} kg CO₂e** per month.`;
      } else if (comparisonPct < 0) {
        responseText = `Incredible! Your net footprint of **${netKg.toFixed(0)} kg** is **${Math.abs(comparisonPct).toFixed(0)}% lower** than the average EcoAware community member (${avgCommunity} kg). You currently rank in the top tier!`;
      } else {
        responseText = `Your current net footprint is **${netKg.toFixed(0)} kg**, which is **${comparisonPct.toFixed(0)}% higher** than the community average of **${avgCommunity} kg**. Try setting a new **Emissions reduction goal** on the dashboard to catch up!`;
      }
    } else {
      responseText = `Hello! I'm your AI Eco-Assistant. I analyze your carbon logs to help you shrink your footprint.\n\nAsk me questions like:\n- *"Analyze my carbon data"* (I'll review your actual logs)\n- *"Give me reduction tips"*\n- *"How do I compare to the community?"*`;
    }

    res.json({
      success: true,
      response: responseText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * GET /api/assistant/badges
 * Calculates unlock status of user gamification badges based on database stats.
 */
router.get('/badges', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Fetch counts and logs for stats
    const activityList = await db
      .select({ co2Kg: activities.co2Kg, category: activities.category })
      .from(activities)
      .where(eq(activities.userId, userId));

    const [offsetRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${offsets.co2Kg}), 0)` })
      .from(offsets)
      .where(eq(offsets.userId, userId));

    const totalLogs = activityList.length;
    const offsetKg = offsetRow?.total ?? 0;

    const transportLogs = activityList.filter(a => a.category === 'transport');
    const energyLogs = activityList.filter(a => a.category === 'energy');

    const totalTransportKg = transportLogs.reduce((sum, a) => sum + a.co2Kg, 0);
    const totalEnergyKg = energyLogs.reduce((sum, a) => sum + a.co2Kg, 0);

    const badges: Badge[] = [
      {
        id: 'b1',
        name: 'Eco Pioneer',
        description: 'Take the first step on your climate journey by logging your first carbon footprint activity.',
        icon: 'sparkles',
        unlocked: totalLogs >= 1,
        progress: Math.min(totalLogs, 1),
        target: 1,
      },
      {
        id: 'b2',
        name: 'Green Commuter',
        description: 'Keep transportation logs clean. Log at least one travel activity under 35 kg CO₂e.',
        icon: 'zap',
        unlocked: transportLogs.length > 0 && transportLogs.some(t => t.co2Kg < 35),
        progress: transportLogs.length > 0 && transportLogs.some(t => t.co2Kg < 35) ? 1 : 0,
        target: 1,
      },
      {
        id: 'b3',
        name: 'Energy Guardian',
        description: 'Maintain high efficiency at home. Keep monthly energy emissions under 80 kg.',
        icon: 'shield',
        unlocked: totalLogs > 0 && totalEnergyKg < 80,
        progress: totalLogs > 0 && totalEnergyKg < 80 ? 1 : 0,
        target: 1,
      },
      {
        id: 'b4',
        name: 'Carbon Neutralizer',
        description: 'Log at least 50 kg of offset credits to balance out your environmental footprint.',
        icon: 'leaf',
        unlocked: offsetKg >= 50,
        progress: Math.min(Math.round(offsetKg), 50),
        target: 50,
      },
      {
        id: 'b5',
        name: 'Eco Warrior',
        description: 'Establish consistent tracking habits. Log 5 or more activities in your climate diary.',
        icon: 'globe',
        unlocked: totalLogs >= 5,
        progress: Math.min(totalLogs, 5),
        target: 5,
      }
    ];

    res.json({ success: true, badges });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * GET /api/assistant/community
 * Generates community comparison stats and a friendly competitive leaderboard.
 */
router.get('/community', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Fetch user name from database
    const [userRow] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));
    const userName = userRow?.name || 'You';

    // Fetch user net footprint
    const [activityRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${activities.co2Kg}), 0)` })
      .from(activities)
      .where(eq(activities.userId, userId));

    const [offsetRow] = await db
      .select({ total: sql<number>`COALESCE(sum(${offsets.co2Kg}), 0)` })
      .from(offsets)
      .where(eq(offsets.userId, userId));

    const userNetKg = Math.max(0, (activityRow?.total ?? 0) - (offsetRow?.total ?? 0));
    
    // Community statistics
    const avgCommunityKg = 380; // Community average monthly footprint

    // Build competitive mock leaderboard including the user's live database footprint
    const mockLeaderboard = [
      { name: 'Ananya Sharma', netKg: 85 },
      { name: 'Rohan Mehta', netKg: 140 },
      { name: 'Priya Iyer', netKg: 210 },
      { name: userName, netKg: Math.round(userNetKg), isCurrentUser: true },
      { name: 'Arjun Patel', netKg: 490 },
      { name: 'Vikram Desai', netKg: 720 }
    ];

    // Sort leaderboard from lowest net footprint to highest
    mockLeaderboard.sort((a, b) => a.netKg - b.netKg);
    const userRankIndex = mockLeaderboard.findIndex(m => m.isCurrentUser);
    const userRank = userRankIndex + 1;

    res.json({
      success: true,
      communityAverageKg: avgCommunityKg,
      userNetKg: Math.round(userNetKg),
      userRank,
      totalCompetitors: mockLeaderboard.length,
      leaderboard: mockLeaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
