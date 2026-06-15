import React, { useState, useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';
import { useCarbonData } from './hooks/useCarbonData';
import {
  Leaf, Moon, Sun,
  LogOut, X, Loader2, AlertCircle,
  LayoutDashboard, Lightbulb, Settings
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { activitiesApi, goalsApi, offsetsApi, type EmissionFactor } from './services/api';

/**
 * AuthPage Onboarding Component.
 * Implements an immersive, gamified signature-based onboarding flow.
 * Travelers sign their names on a virtual signature canvas to initialize their local citizen passport.
 */
function AuthPage() {
  const { login, register } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isStamped, setIsStamped] = useState(false);
  const [showInkStamp, setShowInkStamp] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // References for canvases
  const signatureCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const seedCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Drawing state
  const isDrawing = React.useRef(false);
  const strokeCount = React.useRef(0);
  const pointsDrawn = React.useRef<number>(0);
  const particles = React.useRef<any[]>([]);
  const animationFrameId = React.useRef<number | null>(null);
  const mousePos = React.useRef<{ x: number; y: number } | null>(null);

  // Handle signature ink drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!name.trim()) {
      setError('Please sign the traveler signature label by typing your name first.');
      return;
    }
    setError('');
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    strokeCount.current += 1;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Draw glowing cursive ink line
    ctx.lineTo(x, y);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(1, '#10b981');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
    ctx.stroke();

    pointsDrawn.current += 1;
    if (pointsDrawn.current > 40) {
      setIsSigned(true);
    }

    // Add signature particles
    for (let i = 0; i < 2; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        alpha: 1,
        size: Math.random() * 2 + 1,
      });
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pointsDrawn.current = 0;
    strokeCount.current = 0;
    setIsSigned(false);
  };

  // Seed Box Proximity / Growth logic
  const handleSeedMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = seedCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleSeedMouseLeave = () => {
    mousePos.current = null;
  };

  // Canvas render loops (particles + seed growth)
  React.useEffect(() => {
    const runAnimation = () => {
      // 1. Signature canvas particle updates
      const sigCanvas = signatureCanvasRef.current;
      if (sigCanvas) {
        const ctx = sigCanvas.getContext('2d');
        if (ctx) {
          // Draw particles overlay
          particles.current.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.025;
            if (p.alpha <= 0) {
              particles.current.splice(idx, 1);
              return;
            }
            ctx.fillStyle = `rgba(52, 211, 153, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      // 2. Seed canvas drawing loop
      const seedCanvas = seedCanvasRef.current;
      if (seedCanvas) {
        const ctx = seedCanvas.getContext('2d');
        if (ctx) {
          const w = seedCanvas.width;
          const h = seedCanvas.height;
          ctx.clearRect(0, 0, w, h);

          // Grid circles
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
          ctx.arc(w / 2, h / 2, 65, 0, Math.PI * 2);
          ctx.stroke();

          // Mouse tracking roots
          if (mousePos.current) {
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(w / 2, h - 25);
            ctx.lineTo(mousePos.current.x, mousePos.current.y);
            ctx.stroke();
          }

          // Dormant seed node
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(16, 185, 129, 0.35)';
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(w / 2, h - 25, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Grow foliage proportional to signature progress (pointsDrawn)
          const growth = Math.min(1, pointsDrawn.current / 120);
          if (growth > 0) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';

            const stemHeight = 65 * growth;
            ctx.beginPath();
            ctx.moveTo(w / 2, h - 25);
            ctx.quadraticCurveTo(w / 2 - 6 * Math.sin(growth * Math.PI), h - 25 - stemHeight / 2, w / 2, h - 25 - stemHeight);
            ctx.stroke();

            // First leaf
            if (growth > 0.35) {
              const leafGrowth = Math.min(1, (growth - 0.35) / 0.65);
              ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
              ctx.beginPath();
              const startX = w / 2;
              const startY = h - 25 - stemHeight * 0.45;
              ctx.moveTo(startX, startY);
              ctx.bezierCurveTo(startX - 18 * leafGrowth, startY - 8 * leafGrowth, startX - 18 * leafGrowth, startY + 8 * leafGrowth, startX, startY + 4 * leafGrowth);
              ctx.fill();
            }

            // Second leaf
            if (growth > 0.7) {
              const leafGrowth = Math.min(1, (growth - 0.7) / 0.3);
              ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
              ctx.beginPath();
              const startX = w / 2;
              const startY = h - 25 - stemHeight * 0.8;
              ctx.moveTo(startX, startY);
              ctx.bezierCurveTo(startX + 18 * leafGrowth, startY - 8 * leafGrowth, startX + 18 * leafGrowth, startY + 8 * leafGrowth, startX, startY + 4 * leafGrowth);
              ctx.fill();
            }
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(runAnimation);
    };

    runAnimation();
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const handleStampSubmit = async () => {
    if (!name.trim() || !isSigned) return;
    setLoading(true);
    setError('');
    setIsStamped(true);

    // Simulate rubber stamp physics and audio thud delay
    setTimeout(() => {
      setShowInkStamp(true);
    }, 120);

    setTimeout(async () => {
      setIsTransitioning(true);
      // Wait for fold/shrink animation to complete
      setTimeout(async () => {
        try {
          const email = name.trim().toLowerCase().replace(/\s+/g, '') + '@ecoaware.com';
          try {
            await register(email, name, 'password123');
          } catch (regErr) {
            // Already registered - log in directly
            await login(email, 'password123');
          }
        } catch (err: any) {
          setError(err?.message || 'Onboarding authentication failed.');
          setIsStamped(false);
          setShowInkStamp(false);
          setIsTransitioning(false);
          setLoading(false);
        }
      }, 650);
    }, 700);
  };

  const handleDemoFill = async () => {
    setLoading(true);
    setError('');
    try {
      await login('alex@ecoaware.com', 'password123');
    } catch (err: any) {
      setError(err?.message || 'Demo account sign in failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans text-slate-100 selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      
      {/* Background Layer (Ambient Glow Orbs) */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-emerald-500/15 blur-[140px] animate-aurora" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/10 blur-[130px] animate-aurora" />
      </div>

      {/* Main Passport Card Container */}
      <div className={`w-[440px] bento-card p-9 shadow-2xl relative z-10 border-white/10 dark:border-white/10 bg-slate-900/60 backdrop-blur-2xl transition-all duration-300 ${isTransitioning ? 'animate-fold-out' : 'animate-fade-in-up'}`}>
        
        {/* Passport Header Pill */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2.5">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-black tracking-widest uppercase">EcoAware</span>
          </div>
          <span className="text-[9px] font-black tracking-wider uppercase text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
            Traveler Passport
          </span>
        </header>

        {/* Visual Emblem Box (Generative Canvas Seed) */}
        <div className="w-full h-[150px] rounded-2xl bg-slate-950/40 border border-dashed border-white/10 relative overflow-hidden mb-6 flex items-center justify-center">
          <canvas
            ref={seedCanvasRef}
            width={368}
            height={150}
            onMouseMove={handleSeedMouseMove}
            onMouseLeave={handleSeedMouseLeave}
            className="absolute inset-0 cursor-crosshair"
          />
          <span className="absolute bottom-3 font-mono text-[9px] text-slate-500 tracking-[0.2em] uppercase select-none pointer-events-none">
            Citizen of Earth
          </span>
        </div>

        {/* Copy/Storytelling Section */}
        <div className="space-y-2 mb-6">
          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
            Global Emissions Reporting
          </span>
          <h2 className="text-xl font-medium tracking-tight text-white leading-tight">
            Your journey starts with a single footprint.
          </h2>
          <p className="text-slate-400 text-xs font-medium leading-relaxed">
            To help slow climate change, the average annual footprint must drop to 2,000 kg. Initialize your passport to document your progress.
          </p>
        </div>

        {/* Signature Name Entry */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Full Name / Traveler Signature
            </label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter name to sign..."
              disabled={isStamped}
              className="bento-input bg-slate-950/40 border-white/10 focus:border-emerald-500/50 text-xs font-semibold py-3"
            />
          </div>

          {/* Cursive Signature Ink Pad (Canvas Tablet) */}
          <div className="space-y-1.5 relative">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Ink Pad Signature Signature
              </label>
              {isSigned && (
                <button
                  type="button"
                  onClick={clearSignature}
                  disabled={isStamped}
                  className="text-[9px] font-bold text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear signature
                </button>
              )}
            </div>
            <div className="w-full h-[85px] rounded-xl bg-slate-950/60 border border-white/10 relative overflow-hidden">
              <canvas
                ref={signatureCanvasRef}
                width={368}
                height={85}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className={`w-full h-full cursor-pencil absolute inset-0 ${!name.trim() ? 'opacity-40 pointer-events-none' : ''}`}
              />
              {!name.trim() && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                    Type name above to unlock signature ink
                  </span>
                </div>
              )}
              {name.trim() && !isSigned && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide animate-pulse">
                    Sign in ink on tablet pad
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert Block */}
        {error && (
          <div className="mt-4 flex items-center space-x-2 text-red-400 text-[11px] bg-red-500/10 rounded-xl p-3 border border-red-500/15">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stamping Authentication CTA */}
        <div className="mt-6 flex flex-col items-center">
          <div className="relative w-28 h-28 flex items-center justify-center mb-4">
            
            {/* Visual Ink Stamp print when stamped */}
            {showInkStamp && (
              <div className="absolute w-24 h-24 rounded-full border-4 border-dashed border-emerald-500/70 flex flex-col items-center justify-center uppercase tracking-widest font-black select-none pointer-events-none rotate-[-8deg] animate-ink-bleed">
                <span className="text-[8px] text-emerald-400">Approved</span>
                <span className="text-[10px] text-emerald-300 font-bold my-0.5">EcoAware</span>
                <span className="text-[7px] text-emerald-400">47°N, 122°W</span>
              </div>
            )}

            {/* Clickable Rubber Stamp trigger */}
            <button
              type="button"
              disabled={!name.trim() || !isSigned || isStamped || loading}
              onClick={handleStampSubmit}
              title={isSigned ? 'Click stamp to approve' : 'Sign in ink to unlock stamp'}
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-[9px] font-black tracking-widest uppercase transition-all duration-300 ${
                isSigned && !isStamped
                  ? 'bg-emerald-500 text-slate-950 hover:scale-110 cursor-pointer shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-500/25'
                  : 'bg-slate-900 border border-white/10 text-slate-500 cursor-not-allowed'
              } ${isStamped ? 'animate-stamp-press pointer-events-none' : ''}`}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin text-slate-950" />
              ) : (
                <span>Stamp</span>
              )}
            </button>
          </div>

          {/* Secondary fallback triggers */}
          <button
            type="button"
            disabled={isStamped}
            onClick={handleDemoFill}
            className="text-[10px] font-semibold text-slate-500 hover:text-emerald-400 underline transition-colors"
          >
            Explore anonymously first
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * AddActivityModal Component.
 * Modal container that lists registered emission categories, allowing the user to select
 * registered emission factors and specify quantity variables to estimate CO2 equivalents in real-time.
 */
function AddActivityModal({
  onClose, onSuccess, factors,
}: {
  onClose: () => void;
  onSuccess: () => void;
  factors: Record<string, EmissionFactor>;
}) {
  const [category, setCategory] = useState<'transport' | 'energy' | 'diet' | 'waste'>('transport');
  const [factorKey, setFactorKey] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categoryFactors = Object.entries(factors).filter(([, f]) => f.category === category);
  const selectedFactor = factors[factorKey];
  const estimatedCO2 = selectedFactor && quantity
    ? Math.round(selectedFactor.co2PerUnit * parseFloat(quantity) * 100) / 100
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const desc = description || selectedFactor?.label || 'Activity';
      await activitiesApi.create({ category, description: desc, date, factorKey, quantity: parseFloat(quantity) });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Log Activity" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {(['transport', 'energy', 'diet', 'waste'] as const).map((c) => (
            <button key={c} type="button" onClick={() => { setCategory(c); setFactorKey(''); }}
              className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${category === c ? 'bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-sm' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>
              {c}
            </button>
          ))}
        </div>
        <select value={factorKey} onChange={(e) => setFactorKey(e.target.value)} required
          className="bento-input">
          <option value="">Select activity type...</option>
          {categoryFactors.map(([key, f]) => (
            <option key={key} value={key}>{f.label} (per {f.unit})</option>
          ))}
        </select>
        <div className="flex space-x-3">
          <input type="number" step="0.1" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            placeholder={selectedFactor ? `Quantity in ${selectedFactor.unit}` : 'Quantity'} required
            className="bento-input flex-1" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="bento-input w-40" />
        </div>
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note (e.g. 'Commute to office')"
          className="bento-input" />
        
        {estimatedCO2 !== null && (
          <div className="text-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/5">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{estimatedCO2} kg</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">CO₂e estimated</span>
          </div>
        )}
        
        {error && <ErrorMsg msg={error} />}
        
        <button type="submit" disabled={loading} className="btn-bento-primary w-full py-3.5">
          {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Log Activity'}
        </button>
      </form>
    </ModalShell>
  );
}

/**
 * SetGoalModal Component.
 * Form modal that lets travelers select from preset goal options or design a custom carbon
 * budget reduction target with a target date deadline.
 */
function SetGoalModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [targetKg, setTargetKg] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await goalsApi.create({ title, targetCo2Kg: parseFloat(targetKg), deadline });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const presets = [
    { label: 'Reduce transport 20%', title: 'Reduce transport CO₂ by 20%', kg: 100 },
    { label: 'Go plant-based', title: 'Switch to plant-based diet for 1 month', kg: 50 },
    { label: 'Cut energy usage', title: 'Reduce energy consumption by 30%', kg: 75 },
  ];

  return (
    <ModalShell title="Set a Goal" onClose={onClose}>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {presets.map((p) => (
          <button key={p.label} type="button"
            onClick={() => { setTitle(p.title); setTargetKg(String(p.kg)); }}
            className="w-full text-left px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex justify-between items-center">
            <span>{p.label}</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-black">-{p.kg}kg →</span>
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title" required
          className="bento-input" />
        <div className="flex space-x-3">
          <input type="number" value={targetKg} onChange={(e) => setTargetKg(e.target.value)}
            placeholder="Target reduction (kg)" required min="1"
            className="bento-input flex-1" />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required
            min={new Date().toISOString().split('T')[0]}
            className="bento-input w-40" />
        </div>
        {error && <ErrorMsg msg={error} />}
        <button type="submit" disabled={loading} className="btn-bento-primary w-full py-3.5">
          {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Create Goal'}
        </button>
      </form>
    </ModalShell>
  );
}

/**
 * AddOffsetModal Component.
 * Modal interface allowing users to log certified carbon offset program purchases,
 * complete with cost estimators and preset carbon credit provider selections.
 */
function AddOffsetModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [provider, setProvider] = useState('');
  const [description, setDescription] = useState('');
  const [co2Kg, setCo2Kg] = useState('');
  const [costUsd, setCostUsd] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const presets = [
    { provider: 'Gold Standard', description: 'Reforestation project — 10 trees', co2: 500, cost: 25 },
    { provider: 'Cool Effect', description: 'Wind energy project', co2: 300, cost: 15 },
    { provider: 'Terrapass', description: 'Methane capture from farms', co2: 1000, cost: 40 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await offsetsApi.create({ provider, description, co2Kg: parseFloat(co2Kg), costUsd: parseFloat(costUsd), date });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to log offset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Log Carbon Offset" onClose={onClose}>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {presets.map((p) => (
          <button key={p.provider} type="button"
            onClick={() => { setProvider(p.provider); setDescription(p.description); setCo2Kg(String(p.co2)); setCostUsd(String(p.cost)); }}
            className="w-full text-left px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex justify-between items-center">
            <div>
              <span className="text-emerald-500 dark:text-emerald-400 font-bold mr-2">{p.provider}</span>
              <span className="text-slate-400 font-medium">— {p.description.split('—')[0]}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">{p.co2}kg / ${p.cost}</span>
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={provider} onChange={(e) => setProvider(e.target.value)}
          placeholder="Provider (e.g. Gold Standard)" required
          className="bento-input" />
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description of offset" required
          className="bento-input" />
        <div className="flex space-x-3">
          <input type="number" value={co2Kg} onChange={(e) => setCo2Kg(e.target.value)}
            placeholder="CO₂ offset (kg)" required min="1"
            className="bento-input flex-1" />
          <input type="number" value={costUsd} onChange={(e) => setCostUsd(e.target.value)}
            placeholder="Cost ($)" min="0"
            className="bento-input w-28" />
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
          className="bento-input" />
        
        {error && <ErrorMsg msg={error} />}
        
        <button type="submit" disabled={loading} className="btn-bento-primary w-full py-3.5">
          {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Log Offset'}
        </button>
      </form>
    </ModalShell>
  );
}

/**
 * ModalShell UI Container Component.
 * Provides a uniform, accessible backdrop blur container structure for child modal forms.
 */
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
      <div className="bento-card p-7 w-full max-w-md animate-fade-in-up border-slate-300 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center space-x-2 text-red-500 text-xs bg-red-500/10 rounded-xl p-3.5 border border-red-500/15">
      <AlertCircle size={14} /><span>{msg}</span>
    </div>
  );
}

/**
 * App Main Root Component.
 * Manages active tabs, light/dark mode preference listeners, modal visibility triggers,
 * and exchanges query updates with the backend stats service.
 */
export default function App() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeModal, setActiveModal] = useState<'activity' | 'goal' | 'offset' | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tips' | 'settings'>('dashboard');

  const { data, refetch: loadData } = useCarbonData(isAuthenticated);
  const factors = data?.factors || {};

  useEffect(() => {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) setIsDarkMode(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  if (!authLoading && !isAuthenticated) {
    return <AuthPage />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Leaf className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-10 pb-24 md:pb-10 flex flex-col items-center justify-start relative overflow-hidden transition-colors duration-500 animate-fade-in-up">

      <div className={`absolute inset-0 overflow-hidden pointer-events-none -z-10 transition-opacity duration-1000 ${isDarkMode ? 'opacity-35' : 'opacity-85'}`}>
        <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-emerald-500/10 dark:bg-emerald-700/5 blur-[140px] animate-aurora mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/10 dark:bg-emerald-900/5 blur-[130px] animate-aurora mix-blend-screen" />
      </div>

      <div className="w-full max-w-6xl flex flex-col flex-1">
        <header className="flex justify-between items-center mb-8 px-6 py-3.5 liquid-nav-bar sticky top-4 z-40">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white transition-colors duration-300 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="p-2.5 rounded-2xl bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm">
              <Leaf className="w-6 h-6 animate-float-slow" />
            </div>
            <span className="text-lg font-black tracking-tight uppercase">Carbon Tracker</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-1 liquid-tab-container p-1 rounded-2xl">
              <button onClick={() => setActiveTab('dashboard')}
                className={activeTab === 'dashboard' ? 'liquid-tab-active' : 'liquid-tab-inactive'}>
                Dashboard
              </button>
              <button onClick={() => setActiveTab('tips')}
                className={activeTab === 'tips' ? 'liquid-tab-active' : 'liquid-tab-inactive'}>
                Eco Insights
              </button>
              <button onClick={() => setActiveTab('settings')}
                className={activeTab === 'settings' ? 'liquid-tab-active' : 'liquid-tab-inactive'}>
                Settings
              </button>
            </div>

            <div className="liquid-pill">
              <button onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-slate-600 dark:text-slate-300"
                aria-label="Toggle Dark Mode">
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center space-x-2 cursor-pointer hover:opacity-85 transition-opacity" onClick={() => setActiveTab('settings')}>
                <div className="w-7 h-7 rounded-xl bg-slate-900 dark:bg-emerald-50 text-white dark:text-slate-950 flex items-center justify-center font-bold text-xs uppercase">
                  {user?.avatarInitials ?? '??'}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline">{user?.name?.split(' ')[0]}</span>
              </div>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
              <button onClick={logout} className="p-1.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors text-slate-400 dark:text-slate-500" title="Logout">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col justify-start">
          {activeTab === 'dashboard' && (
            <DashboardPage 
              onOpenActivity={() => setActiveModal('activity')} 
              onOpenGoal={() => setActiveModal('goal')}
              onOpenOffset={() => setActiveModal('offset')}
            />
          )}
          {activeTab === 'tips' && <InsightsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/95 dark:bg-[#0c1221]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 px-6 py-3.5 rounded-3xl shadow-xl flex justify-around items-center">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'dashboard' ? 'text-slate-900 dark:text-emerald-400' : 'text-slate-400'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Dashboard</span>
        </button>
        <button onClick={() => setActiveTab('tips')} className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'tips' ? 'text-slate-900 dark:text-emerald-400' : 'text-slate-400'}`}>
          <Lightbulb size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Insights</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'settings' ? 'text-slate-900 dark:text-emerald-400' : 'text-slate-400'}`}>
          <Settings size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Settings</span>
        </button>
      </div>

      {activeModal === 'activity' && (
        <AddActivityModal factors={factors} onClose={() => setActiveModal(null)} onSuccess={loadData} />
      )}
      {activeModal === 'goal' && (
        <SetGoalModal onClose={() => setActiveModal(null)} onSuccess={loadData} />
      )}
      {activeModal === 'offset' && (
        <AddOffsetModal onClose={() => setActiveModal(null)} onSuccess={loadData} />
      )}
    </div>
  );
}
