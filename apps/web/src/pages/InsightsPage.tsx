import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCarbonData } from '../hooks/useCarbonData';
import { assistantApi, type Badge, type CommunityResponse } from '../services/api';
import { 
  Loader2, Send, Sparkles, Award, Zap, 
  Shield, Leaf, Globe, Lock, MessageSquare, 
  Users, CheckCircle2, TrendingDown, RefreshCw
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

/**
 * InsightsPage React Component.
 * Hosts the dual-tab interface featuring:
 * 1. AI Eco-Assistant (context-aware chat interface, quick chips, carbon overview)
 * 2. Eco-Milestones & Community (milestone badges & competitive leaderboard)
 */
export default function InsightsPage() {
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading, isError, refetch } = useCarbonData(isAuthenticated);

  // Sub-tabs: 'chat' | 'milestones'
  const [subTab, setSubTab] = useState<'chat' | 'milestones'>('chat');

  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: "Hello! I'm your AI Eco-Assistant. I analyze your carbon footprint data to help you adopt sustainable habits.\n\nHere are some things you can ask me:\n- **\"Analyze my carbon data\"** (I'll review your logs)\n- **\"Give me reduction tips\"**\n- **\"How do I compare to the community?\"**",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Gamification States
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isBadgesLoading, setIsBadgesLoading] = useState(false);
  
  // Community Comparison States
  const [communityData, setCommunityData] = useState<CommunityResponse | null>(null);
  const [isCommunityLoading, setIsCommunityLoading] = useState(false);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (subTab === 'chat') {
      scrollToBottom();
    }
  }, [chatMessages, subTab]);

  // Load Badges and Community data
  const loadGamificationData = async () => {
    if (!isAuthenticated) return;
    setIsBadgesLoading(true);
    setIsCommunityLoading(true);
    try {
      const [badgesRes, communityRes] = await Promise.all([
        assistantApi.badges(),
        assistantApi.community()
      ]);
      if (badgesRes.badges) {
        setBadges(badgesRes.badges);
      }
      if (communityRes.success) {
        setCommunityData(communityRes);
      }
    } catch (err) {
      console.error('Failed to load gamification data:', err);
    } finally {
      setIsBadgesLoading(false);
      setIsCommunityLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadGamificationData();
    }
  }, [isAuthenticated, subTab]); // reload when switching sub-tabs to sync with new logs

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await assistantApi.chat(textToSend);
      if (res.success) {
        setChatMessages(prev => [...prev, {
          sender: 'assistant',
          text: res.response,
          timestamp: new Date(res.timestamp)
        }]);
      } else {
        throw new Error('Chat API error');
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'Sorry, I encountered an issue connecting to the carbon tracking service. Please try again in a moment.',
        timestamp: new Date()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Helper to render badge icon
  const renderBadgeIcon = (iconName: string, size = 20) => {
    switch (iconName) {
      case 'award': return <Award size={size} />;
      case 'zap': return <Zap size={size} />;
      case 'shield': return <Shield size={size} />;
      case 'leaf': return <Leaf size={size} />;
      case 'globe': return <Globe size={size} />;
      case 'sparkles': return <Sparkles size={size} />;
      default: return <Award size={size} />;
    }
  };

  // Helper to format/render AI messages
  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Check for bullet lists or numbers
      const isBullet = line.trim().startsWith('1.') || line.trim().startsWith('2.') || line.trim().startsWith('3.') || line.trim().startsWith('-');
      
      // Parse bolding **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-extrabold text-emerald-800 dark:text-emerald-300">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <p key={i} className={`text-xs md:text-sm leading-relaxed mb-1.5 ${isBullet ? 'pl-4' : ''}`}>
          {renderedLine}
        </p>
      );
    });
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col justify-center items-center py-32 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Loading Insights...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bento-card max-w-md mx-auto text-center py-10 my-10 border-red-500/20">
        <p className="text-red-500 font-bold mb-3">Failed to load insights</p>
        <button onClick={() => refetch()} className="btn-bento-secondary py-2 px-4 text-xs mx-auto">
          Retry
        </button>
      </div>
    );
  }

  const { tips, monthly } = data;
  const currentMonthKg = monthly.length > 0 ? monthly[monthly.length - 1].kg : 0;
  const limit = user?.monthlyLimitKg ?? 1000;
  const pct = Math.min(100, Math.round((currentMonthKg / limit) * 100));

  const categories: Record<string, { label: string; glowClass: string; textClass: string; bgClass: string }> = {
    transport: { label: 'Transportation', glowClass: 'border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.08)]', textClass: 'text-blue-500 dark:text-blue-400', bgClass: 'bg-blue-500/10' },
    energy: { label: 'Energy', glowClass: 'border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.08)]', textClass: 'text-amber-500 dark:text-amber-400', bgClass: 'bg-amber-500/10' },
    diet: { label: 'Diet', glowClass: 'border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.08)]', textClass: 'text-emerald-500 dark:text-emerald-400', bgClass: 'bg-emerald-500/10' },
    waste: { label: 'Waste', glowClass: 'border-cyan-500/20 shadow-[0_0_15px_-3px_rgba(6,182,212,0.08)]', textClass: 'text-cyan-500 dark:text-cyan-400', bgClass: 'bg-cyan-500/10' },
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in-up pb-8">
      
      {/* ── Sub Navigation Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Eco-Assistant</span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">AI Insights & Milestones</h2>
        </div>

        <div className="liquid-tab-container p-1 rounded-2xl flex items-center space-x-1 self-start sm:self-auto">
          <button 
            onClick={() => setSubTab('chat')} 
            className={subTab === 'chat' ? 'liquid-tab-active flex items-center space-x-1.5' : 'liquid-tab-inactive flex items-center space-x-1.5'}
          >
            <MessageSquare size={13} />
            <span>AI Eco-Assistant</span>
          </button>
          <button 
            onClick={() => setSubTab('milestones')} 
            className={subTab === 'milestones' ? 'liquid-tab-active flex items-center space-x-1.5' : 'liquid-tab-inactive flex items-center space-x-1.5'}
          >
            <Users size={13} />
            <span>Milestones & Community</span>
          </button>
        </div>
      </div>

      {/* ── Tab 1: AI Eco-Assistant ── */}
      {subTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Chat Window */}
          <div className="lg:col-span-7 flex flex-col bento-card p-6 h-[550px] justify-between border-emerald-500/20">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-950 dark:text-white">AI Eco-Assistant</h4>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block mr-1 animate-pulse"></span>
                    Online & Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Log */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-emerald-500/10 scrollbar-track-transparent">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3.5 ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-emerald-950 shadow-md font-medium'
                      : 'bg-emerald-500/5 dark:bg-white/5 border border-emerald-500/10 text-slate-700 dark:text-slate-200'
                  }`}>
                    {msg.sender !== 'user' ? renderMessageText(msg.text) : <p className="text-xs md:text-sm">{msg.text}</p>}
                    <span className="text-[8px] opacity-40 font-bold block text-right mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-emerald-500/5 dark:bg-white/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center space-x-2 animate-pulse">
                    <Loader2 size={14} className="animate-spin text-emerald-500" />
                    <span className="text-xs text-slate-400 font-bold">Analyzing footprint...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Chips */}
            <div className="flex flex-wrap gap-2 mb-3.5">
              <button 
                onClick={() => handleSendMessage("Analyze my carbon data")}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/30 dark:hover:border-emerald-400/30 transition-all hover:bg-emerald-500/5 bg-transparent"
              >
                📊 Analyze footprint
              </button>
              <button 
                onClick={() => handleSendMessage("Give me reduction tips")}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/30 dark:hover:border-emerald-400/30 transition-all hover:bg-emerald-500/5 bg-transparent"
              >
                💡 Get reduction tips
              </button>
              <button 
                onClick={() => handleSendMessage("How do I compare to the community?")}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/30 dark:hover:border-emerald-400/30 transition-all hover:bg-emerald-500/5 bg-transparent"
              >
                👥 Compare to community
              </button>
            </div>

            {/* Input Box */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(chatInput);
              }}
              className="flex items-center space-x-2"
            >
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about emissions, milestones, or reduction strategy..." 
                className="bento-input flex-1 py-3 text-xs md:text-sm"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || isChatLoading}
                className="btn-bento-primary p-3 rounded-2xl h-[46px] w-[46px] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

          {/* Right Column: Carbon Allowance & Actionable Tips */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Allowance Progress Card */}
            <div className="bento-card bento-card-glow-indigo p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carbon Account</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 mb-4 tracking-tight">Monthly allowance</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{currentMonthKg} <span className="text-xs text-slate-400 font-bold uppercase">kg CO₂e</span></div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">Footprint recorded</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Limit: {limit} kg</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-bold">Monthly target</div>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="h-3.5 bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 rounded-full overflow-hidden backdrop-blur-md shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 100 ? 'bg-red-500/60 backdrop-blur-md' : pct >= 80 ? 'bg-amber-500/60 backdrop-blur-md' : 'gauge-gradient'}`}
                  style={{ width: `${pct}%` }} 
                />
              </div>
              
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2.5">
                <span>{pct}% utilized</span>
                {pct >= 100 ? (
                  <span className="text-red-500 font-black">Allowance exceeded!</span>
                ) : (
                  <span className="text-slate-800 dark:text-slate-200 font-black">{Math.round((limit - currentMonthKg) * 10) / 10} kg left</span>
                )}
              </div>
            </div>

            {/* Quick Insights Suggestions List */}
            <div className="bento-card p-6 space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Tips</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">Actionable Recommendations</h3>
              </div>

              <div className="space-y-3">
                {tips.slice(0, 2).map((tip) => {
                  const meta = categories[tip.category] ?? { label: 'Eco', textClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10' };
                  return (
                    <div key={tip.id} className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${meta.textClass} ${meta.bgClass}`}>
                          {meta.label}
                        </span>
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                          -{tip.savingsKg} kg/mo
                        </span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{tip.title}</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 leading-normal">{tip.description}</p>
                    </div>
                  );
                })}
                {tips.length === 0 && (
                  <p className="text-xs text-slate-400 font-bold text-center py-4">No recommendations. Log activities to generate suggestions!</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Tab 2: Eco-Milestones & Community ── */}
      {subTab === 'milestones' && (
        <div className="space-y-8">
          
          {/* Milestones / Badges Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rewards</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">Unlockable Eco-Badges</h3>
              </div>
              <button 
                onClick={loadGamificationData}
                disabled={isBadgesLoading}
                className="text-slate-400 hover:text-emerald-500 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800/60 bg-transparent transition-colors"
              >
                <RefreshCw size={12} className={isBadgesLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {isBadgesLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {badges.map((badge) => (
                  <div 
                    key={badge.id}
                    className={`bento-card relative flex flex-col justify-between p-5 transition-all duration-500 ${
                      badge.unlocked 
                        ? 'border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.12)]' 
                        : 'border-slate-200/50 dark:border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div>
                      {/* Badge Icon & Lock State */}
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                          badge.unlocked 
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[inset_0_2px_10px_rgba(16,185,129,0.1)]' 
                            : 'bg-slate-500/10 text-slate-400 border-slate-300/20'
                        }`}>
                          {renderBadgeIcon(badge.icon, 20)}
                        </div>
                        {badge.unlocked ? (
                          <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={11} />
                          </span>
                        ) : (
                          <span className="p-1 rounded-full bg-slate-500/10 text-slate-400">
                            <Lock size={11} />
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-black tracking-tight text-slate-900 dark:text-white mb-1">{badge.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-normal mb-3">{badge.description}</p>
                    </div>

                    {/* Badge Progress bar */}
                    <div>
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{badge.progress} / {badge.target}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/20">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${badge.unlocked ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          style={{ width: `${(badge.progress / badge.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community Comparison Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Competitive Leaderboard */}
            <div className="lg:col-span-7 bento-card p-6 border-emerald-500/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standings</span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 mb-6 tracking-tight">Community Leaderboard</h3>

              {isCommunityLoading || !communityData ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {communityData.leaderboard.map((comp, idx) => {
                    const isUser = comp.isCurrentUser;
                    const rank = idx + 1;
                    return (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 border ${
                          isUser 
                            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)] scale-[1.01]' 
                            : 'bg-white/40 dark:bg-white/5 border-slate-100 dark:border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5">
                          <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                            rank === 1 
                              ? 'bg-amber-400/20 text-amber-500 border border-amber-400/30' 
                              : rank === 2 
                                ? 'bg-slate-300/20 text-slate-400 border border-slate-300/30'
                                : rank === 3 
                                  ? 'bg-amber-600/20 text-amber-700 border border-amber-600/30'
                                  : 'text-slate-400 font-bold'
                          }`}>
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                          </span>

                          <span className={`text-xs md:text-sm font-black ${isUser ? 'text-emerald-950 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {comp.name} {isUser && <span className="text-[8px] font-black uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded ml-1 text-emerald-600">You</span>}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className={`text-xs md:text-sm font-black ${isUser ? 'text-emerald-950 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                            {comp.netKg} <span className="text-[10px] text-slate-400 font-bold uppercase">kg CO₂e</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Community Comparison Graph & Stats */}
            <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between min-h-[400px]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comparison</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 mb-6 tracking-tight">EcoAware Benchmark</h3>

                {isCommunityLoading || !communityData ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Stat callouts */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Community Rank</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                          #{communityData.userRank} <span className="text-xs text-slate-400 font-bold">of {communityData.totalCompetitors}</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-100 dark:border-slate-800/80">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Avg Footprint</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                          {communityData.communityAverageKg} <span className="text-xs text-slate-400 font-bold">kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Comparison Message */}
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-start space-x-3">
                      <TrendingDown size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-black text-slate-950 dark:text-emerald-300">Footprint Analysis</h4>
                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 leading-relaxed">
                          {communityData.userNetKg <= communityData.communityAverageKg ? (
                            `Excellent work! Your net carbon footprint of ${communityData.userNetKg} kg is lower than the community average of ${communityData.communityAverageKg} kg. You rank in the top tier of active eco-conscious citizens.`
                          ) : (
                            `Your net carbon footprint of ${communityData.userNetKg} kg is currently higher than the community average of ${communityData.communityAverageKg} kg. Try checking out the AI Assistant's reduction roadmap to identify changes!`
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Visual Comparison Horizontal Bars */}
                    <div className="space-y-4 pt-2">
                      {/* User Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                          <span>Your Net Footprint</span>
                          <span className="text-slate-800 dark:text-slate-200">{communityData.userNetKg} kg</span>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/20">
                          <div 
                            className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(100, (communityData.userNetKg / Math.max(communityData.communityAverageKg, communityData.userNetKg)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Community Avg Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                          <span>Community Average</span>
                          <span className="text-slate-800 dark:text-slate-200">{communityData.communityAverageKg} kg</span>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/20">
                          <div 
                            className="h-full rounded-full bg-indigo-500 transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(100, (communityData.communityAverageKg / Math.max(communityData.communityAverageKg, communityData.userNetKg)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
