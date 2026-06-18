import { useQuery } from '@tanstack/react-query';
import { 
  statsApi, goalsApi, activitiesApi, offsetsApi, 
  FootprintStats, BreakdownItem, MonthlyItem, EmissionFactor, Tip, Activity, Offset, Goal
} from '../services/api';

/**
 * Combined carbon footprint datasets retrieved from multiple endpoints.
 */
export interface CarbonData {
  /** Aggregated carbon quantities and converted tons */
  footprint: FootprintStats | null;
  /** Emission weights partitioned by category (transport, energy, etc.) */
  breakdown: BreakdownItem[];
  /** Historical calendar logs over the past 6 months */
  monthly: MonthlyItem[];
  /** Last 10 activity log entries */
  recentActivities: Activity[];
  /** Active target targets */
  goals: Goal[];
  /** Registered carbon credit contributions */
  offsets: Offset[];
  /** Conversion factor constants for user dropdown inputs */
  factors: Record<string, EmissionFactor>;
  /** Dynamically sorted ecological suggestion tips */
  tips: Tip[];
}

/**
 * Hook to retrieve all primary dashboard data concurrently using TanStack Query.
 * Optimizes network overhead by performing all requests in parallel via Promise.all.
 *
 * @param isAuthenticated - Condition to trigger/enable query polling
 * @returns React Query result container holding CarbonData
 */
export function useCarbonData(isAuthenticated: boolean) {
  return useQuery<CarbonData>({
    queryKey: ['carbon-data'],
    queryFn: async () => {
      // Fetch datasets concurrently to improve load speeds.
      const [fp, bd, mo, ra, gl, off, fac, tp] = await Promise.all([
        statsApi.footprint(),
        statsApi.breakdown(),
        statsApi.monthly(),
        statsApi.recentActivities(),
        goalsApi.list(),
        offsetsApi.list(),
        activitiesApi.emissionFactors(),
        statsApi.tips(),
      ]);
      return {
        footprint: fp,
        breakdown: bd.breakdown,
        monthly: mo.monthly,
        recentActivities: ra.activities,
        goals: gl.goals,
        offsets: off.offsets,
        factors: fac.factors,
        tips: tp.tips,
      };
    },
    // Only query backend if user authentication is active.
    enabled: isAuthenticated,
    // Keep data fresh in cache for 5 minutes. Prevents repetitive fetches during routing changes.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

