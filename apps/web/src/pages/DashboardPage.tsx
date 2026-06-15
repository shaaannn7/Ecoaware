import { useCarbonData } from '../hooks/useCarbonData';
import { useAuth } from '../contexts/AuthContext';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis
} from 'recharts';
import { 
  Leaf, Plus, Trash2, Activity, Zap, TreePine, 
  PieChart as PieChartIcon, Loader2, Target, Award
} from 'lucide-react';
import { activitiesApi, offsetsApi, goalsApi } from '../services/api';

/**
 * Renders semantic, frosted glass style category icons for activity listings.
 * 
 * @param category - Name of the carbon source category ('transport', 'energy', 'diet', etc.)
 */
function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case 'transport':
      return (
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border border-white/40 dark:border-white/10 backdrop-blur-md">
          <Activity size={15} />
        </div>
      );
    case 'energy':
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border border-white/40 dark:border-white/10 backdrop-blur-md">
          <Zap size={15} />
        </div>
      );
    case 'diet':
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border border-white/40 dark:border-white/10 backdrop-blur-md">
          <Leaf size={15} />
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_2px_10px_rgba(255,255,255,0.1)] border border-white/40 dark:border-white/10 backdrop-blur-md">
          <TreePine size={15} />
        </div>
      );
  }
}

/** Interface detailing action callback events for modal overlays */
interface DashboardPageProps {
  /** Event triggered when adding a new activity footprint */
  onOpenActivity: () => void;
  /** Event triggered when creating a new target reduction goal */
  onOpenGoal: () => void;
  /** Event triggered when logging offset credits */
  onOpenOffset: () => void;
}

/**
 * DashboardPage React Component.
 * The primary operations overview. Embeds responsive Recharts data grids,
 * budget limits gauges, logged credits trackers, and historical timelines.
 */
export default function DashboardPage({ onOpenActivity, onOpenGoal, onOpenOffset }: DashboardPageProps) {
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading, isError, refetch } = useCarbonData(isAuthenticated);

  // Loading state fallback
  if (isLoading || !data) {
    return (
      <div className="flex flex-col justify-center items-center py-32 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Loading Dashboard...</span>
      </div>
    );
  }

  // Error boundary retry fallback
  if (isError) {
    return (
      <div className="bento-card max-w-md mx-auto text-center py-10 my-10 border-red-500/20">
        <p className="text-red-500 font-bold mb-3">Failed to load dashboard data</p>
        <button onClick={() => refetch()} className="btn-bento-secondary py-2 px-4 text-xs mx-auto">
          Retry
        </button>
      </div>
    );
  }

  const { footprint, breakdown, monthly, recentActivities, goals, offsets } = data;
  const currentMonthKg = monthly.length > 0 ? monthly[monthly.length - 1].kg : 0;
  const limit = user?.monthlyLimitKg || 1000;
  
  // Resolve chart theme palettes dynamically based on dark mode class bindings.
  const isDarkMode = document.body.classList.contains('dark');
  const breakdownWithColors = breakdown.map((b) => ({
    ...b,
    color: isDarkMode ? b.colorDark : b.colorLight,
  }));

  const activeGoals = goals.filter(g => !g.achieved);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full animate-fade-in-up pb-8">
      
      {/* ── Net Footprint Summary Bento Box ── */}
      <div className="lg:col-span-5 flex flex-col justify-between bento-card bento-card-hover bento-card-glow-mint p-8 min-h-[420px]">
        <div>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Annual footprint</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">Net Footprint</h3>
            </div>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="my-8 flex items-baseline">
            <span className="text-8xl font-black tracking-tighter text-slate-900 dark:text-white">
              {footprint?.netTons || 0}
            </span>
            <span className="text-lg font-bold text-slate-400 dark:text-slate-500 ml-3 uppercase tracking-wider">
              Tons CO₂e
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross footprint</span>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200 mt-1">{footprint?.totalTons || 0}t</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total offset</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">🌳 {footprint?.offsetTons || 0}t</p>
            </div>
          </div>
        </div>

        <button onClick={onOpenActivity} className="btn-bento-primary w-full mt-8 flex items-center justify-center space-x-2">
          <Plus size={16} />
          <span>Log Activity</span>
        </button>
      </div>

      {/* ── Category Breakdown Share Chart ── */}
      <div className="lg:col-span-4 bento-card bento-card-hover p-8 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Share</span>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 tracking-tight">Emissions by Source</h3>
        </div>

        <div className="h-44 relative my-4 flex items-center justify-center">
          {breakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <PieChartIcon size={32} className="mb-2 opacity-30" />
              <p className="text-[11px] text-center max-w-[180px]">Add activities to generate your source breakdown.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdownWithColors} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                    {breakdownWithColors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', background: isDarkMode ? 'rgba(13,20,37,0.4)' : 'rgba(255,255,255,0.4)', backdropFilter: 'blur(24px)', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)' }}
                    itemStyle={{ color: isDarkMode ? '#f8fafc' : '#0f172a', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{breakdown.length > 0 ? '100' : '0'}</span>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">%</span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
          {breakdownWithColors.map(b => (
            <div key={b.category} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                <div className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: b.color }} />
                <span className="capitalize font-bold">{b.category}</span>
              </div>
              <span className="font-black text-slate-900 dark:text-white">{b.value}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Monthly Carbon Allowance Progress ── */}
      <div className="lg:col-span-3 bento-card bento-card-hover bento-card-glow-indigo p-6 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carbon Budget</span>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 tracking-tight">Limit Progress</h3>
          
          <div className="mt-8 text-center">
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{currentMonthKg}</span>
            <span className="text-slate-400 text-xs ml-1 font-bold">/ {limit} kg CO₂e</span>
          </div>

          <div className="mt-6">
            <div className="h-2.5 bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 rounded-full overflow-hidden backdrop-blur-md shadow-inner">
              <div className={`h-full rounded-full transition-all duration-1000 ${currentMonthKg >= limit ? 'bg-red-500/60 backdrop-blur-md' : currentMonthKg >= limit * 0.8 ? 'bg-amber-500/60 backdrop-blur-md' : 'gauge-gradient'}`}
                style={{ width: `${Math.min(100, Math.round((currentMonthKg / limit) * 100))}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
              <span>{Math.round((currentMonthKg / limit) * 100)}% Used</span>
              <span>{limit - currentMonthKg > 0 ? `${limit - currentMonthKg}kg left` : 'Limit Exceeded'}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <span>Status</span>
          <span className={`px-2 py-0.5 rounded-md ${currentMonthKg >= limit ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
            {currentMonthKg >= limit ? 'Over Limit' : 'On Track'}
          </span>
        </div>
      </div>

      {/* ── Historical Trend Area Graph ── */}
      <div className="lg:col-span-6 bento-card p-6 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analytics</span>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">Emissions over time</h3>
        </div>

        <div className="h-44 mt-6 relative">
          {monthly.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <p className="text-xs">No monthly historical trend data available.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDarkMode ? '#10b981' : '#6366f1'} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={isDarkMode ? '#10b981' : '#6366f1'} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke={isDarkMode ? '#475569' : '#94a3b8'} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', background: isDarkMode ? '#0d1425' : '#ffffff', border: isDarkMode ? '1px solid #1e293b' : '1px solid #e2e8f0' }}
                  labelStyle={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: '10px', fontWeight: 'bold' }}
                  itemStyle={{ color: isDarkMode ? '#10b981' : '#6366f1', fontSize: '12px', fontWeight: 'black' }}
                  formatter={(value: number) => [`${value} kg`, 'CO₂e']}
                />
                <Area type="monotone" dataKey="kg" stroke={isDarkMode ? '#10b981' : '#6366f1'} strokeWidth={2} fillOpacity={1} fill="url(#colorKg)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs font-bold text-slate-400">
          <span>Active Tracking Period</span>
          <span className="text-slate-800 dark:text-slate-200">{monthly.length} Months Tracked</span>
        </div>
      </div>

      {/* ── Active Goals & Offset Credits Panel ── */}
      <div className="lg:col-span-6 bento-card p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Goals & offsets</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">My credits</h3>
            </div>
            <div className="flex space-x-2">
              <button onClick={onOpenGoal} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white transition-colors flex items-center">
                <Target size={11} className="mr-1 text-indigo-500" /> Goal
              </button>
              <button onClick={onOpenOffset} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white transition-colors flex items-center">
                <Award size={11} className="mr-1 text-emerald-500" /> Offset
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {activeGoals.length === 0 && offsets.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active goals or logged offsets. Set one to start managing credits!
              </div>
            )}

            {/* List active goals with delete options */}
            {activeGoals.map(goal => (
              <div key={`goal-${goal.id}`} className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex justify-between items-center">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Target size={12} className="text-indigo-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{goal.title}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1">Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-black text-indigo-400">-{goal.targetCo2Kg}kg</span>
                  <button onClick={async () => {
                    await goalsApi.delete(goal.id);
                    refetch();
                  }} className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* List offsets with delete options */}
            {offsets.map(off => (
              <div key={`offset-${off.id}`} className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex justify-between items-center">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Award size={12} className="text-emerald-500 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{off.provider}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1">{off.description}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-black text-emerald-400">-{off.co2Kg}kg</span>
                  <button onClick={async () => {
                    await offsetsApi.delete(off.id);
                    refetch();
                  }} className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
          <span className="text-slate-400 font-bold">Offsets logged:</span>
          <span className="font-black text-emerald-600 dark:text-emerald-400">
            {footprint?.offsetTons || 0} tons total
          </span>
        </div>
      </div>

      {/* ── Recent Log Timeline ── */}
      <div className="lg:col-span-12 bento-card p-6 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Log timeline</span>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 mb-6 tracking-tight">Recent activities</h3>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-12">No registered logs yet</p>
            ) : recentActivities.map(act => (
              <div key={act.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-all group">
                <div className="flex items-center space-x-3 min-w-0">
                  <CategoryIcon category={act.category} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{act.description}</p>
                    <span className="text-[9px] text-slate-400 font-bold">{new Date(act.date).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-black text-slate-900 dark:text-white">{act.co2Kg}kg</span>
                  <button onClick={async () => {
                    await activitiesApi.delete(act.id);
                    refetch();
                  }} className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
          <span className="text-slate-400 font-bold">Total Activities Logged:</span>
          <span className="font-black text-slate-800 dark:text-white">{recentActivities.length} logs</span>
        </div>
      </div>

    </div>
  );
}

