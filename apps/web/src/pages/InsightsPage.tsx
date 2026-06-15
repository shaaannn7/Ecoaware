import { useAuth } from '../contexts/AuthContext';
import { useCarbonData } from '../hooks/useCarbonData';
import { Loader2, ArrowRight } from 'lucide-react';

/**
 * InsightsPage React Component.
 * Computes allowance metrics, shows budget progress bar,
 * and renders prioritized ecological recommendation cards.
 */
export default function InsightsPage() {
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useCarbonData(isAuthenticated);

  // Loading state fallback
  if (isLoading || !data) {
    return (
      <div className="flex flex-col justify-center items-center py-32 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Loading Insights...</span>
      </div>
    );
  }

  // Error boundary state fallback
  if (isError) {
    return (
      <div className="bento-card max-w-md mx-auto text-center py-10 my-10 border-red-500/20">
        <p className="text-red-500 font-bold mb-3">Failed to load insights</p>
      </div>
    );
  }

  const { tips, monthly } = data;
  const currentMonthKg = monthly.length > 0 ? monthly[monthly.length - 1].kg : 0;
  
  /** Styling theme configuration mappings corresponding to activity categories. */
  const categories: Record<string, { label: string; glowClass: string; textClass: string; bgClass: string }> = {
    transport: { label: 'Transportation', glowClass: 'border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.08)]', textClass: 'text-blue-500 dark:text-blue-400', bgClass: 'bg-blue-500/10' },
    energy: { label: 'Energy', glowClass: 'border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.08)]', textClass: 'text-amber-500 dark:text-amber-400', bgClass: 'bg-amber-500/10' },
    diet: { label: 'Diet', glowClass: 'border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.08)]', textClass: 'text-emerald-500 dark:text-emerald-400', bgClass: 'bg-emerald-500/10' },
    waste: { label: 'Waste', glowClass: 'border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(6,182,212,0.08)]', textClass: 'text-cyan-500 dark:text-cyan-400', bgClass: 'bg-cyan-500/10' },
  };

  const limit = user?.monthlyLimitKg ?? 1000;
  const pct = Math.min(100, Math.round((currentMonthKg / limit) * 100));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-8">
      
      {/* ── Budget Allowance Bento Box ── */}
      <div className="bento-card bento-card-glow-indigo p-8 relative overflow-hidden">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carbon Account</span>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 mb-6 tracking-tight">Monthly allowance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{currentMonthKg} <span className="text-base text-slate-400 font-bold uppercase tracking-wider">kg CO₂e</span></div>
            <div className="text-xs text-slate-400 font-bold mt-1.5">Your carbon footprint for this billing cycle</div>
          </div>
          <div className="md:text-right">
            <div className="text-xl font-bold text-slate-800 dark:text-slate-200">Budget Limit: {limit} kg</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold">Target monthly allowance</div>
          </div>
        </div>

        {/* Progress Bar Gauge */}
        <div className="h-3.5 bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 rounded-full overflow-hidden backdrop-blur-md shadow-inner">
          <div className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 100 ? 'bg-red-500/60 backdrop-blur-md' : pct >= 80 ? 'bg-amber-500/60 backdrop-blur-md' : 'gauge-gradient'}`}
            style={{ width: `${pct}%` }} />
        </div>
        
        <div className="flex justify-between text-xs font-bold text-slate-400 mt-3.5">
          <span>{pct}% of limit used</span>
          {pct >= 100 ? (
            <span className="text-red-500">Looks like you've gone over this month</span>
          ) : (
            <span className="text-slate-800 dark:text-slate-200 font-black">{Math.round((limit - currentMonthKg) * 10) / 10} kg remaining</span>
          )}
        </div>
      </div>

      {/* ── Recommendations Grid ── */}
      <div className="space-y-4">
        <div className="px-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recommendations</span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">Personalized insights</h3>
        </div>

        {tips.length === 0 ? (
          <div className="bento-card p-12 text-center text-slate-400 text-xs">
            Log some activities on the dashboard to unlock customized reduction strategies.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tips.map(tip => {
              const meta = categories[tip.category] ?? { label: 'Eco', glowClass: 'border-slate-200', textClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10' };
              return (
                <div key={tip.id} className={`bento-card bento-card-hover ${meta.glowClass} p-6 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${meta.textClass} ${meta.bgClass}`}>
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5 px-2.5 py-1 rounded-lg">
                        -{tip.savingsKg} kg/mo
                      </span>
                    </div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white mb-2 tracking-tight">{tip.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">{tip.description}</p>
                  </div>
                  
                  <button className="text-[11px] font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 mt-6 text-left hover:translate-x-1 transition-transform inline-flex items-center space-x-1 w-fit">
                    <span>Learn how to take action</span>
                    <ArrowRight size={12} className="ml-1" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

