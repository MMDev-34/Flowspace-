import { useAppStore, type ForgeItem } from '../store/useAppStore';
import { useState, useMemo, useEffect, useRef, memo, useCallback } from 'react';
import { Plus, X, Trash2, Flame, Pencil, GripVertical, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

const ITEM_COLORS = ['#00d4ff', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const ITEM_ICONS = ['🏃', '🧘', '💧', '📖', '✍️', '🚫', '😴', '💪', '📚', '🎯', '💻', '🎵', '🏋️', '🥗', '🚶', '🧠'];

// ── Confetti ──
const Confetti = memo(function Confetti() {
    return (
        <div className="fixed inset-0 pointer-events-none z-[300]">
            {Array.from({ length: 50 }).map((_, i) => (
                <div key={i} className="absolute animate-fall"
                    style={{
                        left: `${Math.random() * 100}%`, top: '-20px',
                        width: `${Math.random() * 8 + 4}px`, height: `${Math.random() * 8 + 4}px`,
                        background: ['#00d4ff', '#8b5cf6', '#22c55e', '#f59e0b'][Math.floor(Math.random() * 4)],
                        borderRadius: '2px', animationDelay: `${Math.random() * 0.5}s`, animationDuration: `${Math.random() * 2 + 2}s`,
                        transform: `rotate(${Math.random() * 360}deg)`,
                    }} />
            ))}
        </div>
    );
});

// ── Floating +1 ──
function FloatingPlusOne({ x, y }: { x: number; y: number }) {
    return (
        <div className="fixed pointer-events-none z-[250] animate-float-up text-cyan-400 font-bold font-mono text-sm"
            style={{ left: x, top: y }}>
            +1
        </div>
    );
}

// ── Check Particle Burst ──
function CheckParticles({ x, y }: { x: number; y: number }) {
    return (
        <div className="fixed pointer-events-none z-[250]" style={{ left: x, top: y }}>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="absolute animate-particle-burst rounded-full"
                    style={{
                        width: '4px', height: '4px', background: '#22c55e',
                        animationDelay: `${i * 30}ms`,
                        transform: `rotate(${i * 45}deg) translateY(-8px)`,
                    }} />
            ))}
        </div>
    );
}



// ── Hero Card ──
const HeroCard = memo(function HeroCard({ todayPct, todayDone, todayTotal, weekData, triggerKey }: {
    todayPct: number; todayDone: number; todayTotal: number;
    weekData: { label: string; pct: number; completed: number; total: number }[];
    triggerKey: number;
}) {
    const [animated, setAnimated] = useState(false);
    const [hoveredBar, setHoveredBar] = useState<number | null>(null);

    useEffect(() => {
        setAnimated(false);
        const t = setTimeout(() => setAnimated(true), 50);
        return () => clearTimeout(t);
    }, [triggerKey]);

    const weekAvg = Math.round(weekData.reduce((s, d) => s + d.pct, 0) / 7);
    const bestDay = weekData.reduce((a, b) => a.pct > b.pct ? a : b);
    const perfectDays = weekData.filter(d => d.pct === 100).length;
    const prevWeekAvg = 58; // Simulated — replace with real data later
    const trend = weekAvg - prevWeekAvg;

    return (
        <div className="widget !p-5 relative overflow-hidden hover:-translate-y-0.5 transition-transform duration-300" style={{
            background: 'linear-gradient(135deg, #0a0a16 0%, #0d0d1f 50%, #0a0a16 100%)',
            borderColor: 'rgba(0,212,255,0.15)',
        }}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-cyan-500/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-violet-500/5 blur-3xl" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[11px] font-semibold text-foreground/80 tracking-wide uppercase flex items-center gap-2">
                    <span className="text-base">🎯</span> Today's Forge
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            </div>

            <div className="flex items-center gap-6 relative z-10">
                {/* Progress Ring with Count Up */}
                <div className="relative w-20 h-20 shrink-0">
                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.4" />
                        <circle cx="40" cy="40" r="32" fill="none" stroke="url(#heroRingGrad)" strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={201} strokeDashoffset={201 * (1 - todayPct / 100)}
                            filter="url(#heroRingGlow)"
                            style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                        <defs>
                            <linearGradient id="heroRingGrad"><stop offset="0%" stopColor="#00d4ff" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
                            <filter id="heroRingGlow"><feGaussianBlur stdDeviation="2.5" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold font-mono text-cyan-400">{todayPct}%</span>
                        <span className="text-[8px] text-muted-foreground font-mono">{todayDone}/{todayTotal}</span>
                    </div>
                </div>

                {/* Mini Bar Chart with Hover Ripple + Best Day Highlight */}
                <div className="flex-1">
                    <div className="flex items-end gap-2 h-16 mb-2">
                        {weekData.map((d, i) => {
                            const isBest = d.pct === bestDay.pct && d.pct > 0;
                            return (
                                <div key={i} className="flex-1 h-full flex flex-col items-center gap-1.5"
                                    onMouseEnter={() => setHoveredBar(i)}
                                    onMouseLeave={() => setHoveredBar(null)}>
                                    <div className="w-full flex-1 flex justify-center">
                                        <div className={cn(
                                            'relative h-full flex items-end rounded-t-md overflow-hidden transition-all duration-300',
                                            hoveredBar === i ? 'scale-115' : '',
                                            isBest ? 'border border-amber-400/30' : 'border border-white/10',
                                        )} style={{ width: '40px', background: 'rgba(255,255,255,0.03)' }}>
                                            {isBest && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px]">👑</div>
                                            )}
                                            <div
                                                className="w-full rounded-t-md transition-all"
                                                style={{
                                                    height: animated ? `${d.pct}%` : '0%',
                                                    background: isBest
                                                        ? 'linear-gradient(to top, #f59e0b, #fbbf24)'
                                                        : 'linear-gradient(to top, #00d4ff, #8b5cf6)',
                                                    boxShadow: d.pct > 0
                                                        ? isBest
                                                            ? '0 0 10px rgba(245,158,11,0.5), 0 0 3px rgba(251,191,36,0.3)'
                                                            : '0 0 8px rgba(0,212,255,0.4), 0 0 3px rgba(139,92,246,0.3)'
                                                        : 'none',
                                                    transition: `height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 60}ms`,
                                                }}
                                            />
                                            {/* Hover ripple */}
                                            {hoveredBar === i && (
                                                <div className="absolute inset-0 bg-white/10 animate-pulse rounded-t-md" />
                                            )}
                                        </div>
                                    </div>
                                    <span className={cn('text-[8px] font-mono transition-colors',
                                        isBest ? 'text-amber-400 font-bold' : 'text-muted-foreground',
                                        hoveredBar === i && 'text-cyan-400'
                                    )}>{d.label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-3 text-[12px] font-mono text-muted-foreground justify-center">
                        <span>📊 Avg: <span className="text-cyan-400">{weekAvg}%</span></span>
                        <span className="flex items-center gap-1">
                            {trend >= 0 ? <TrendingUp className="w-2.5 h-2.5 text-green-400" /> : <TrendingDown className="w-2.5 h-2.5 text-red-400" />}
                            <span className={trend >= 0 ? 'text-green-400' : 'text-red-400'}>{trend >= 0 ? '+' : ''}{trend}%</span>
                            <span className="text-[8px]">vs last week</span>
                        </span>
                        <span>💯 <span className="text-green-400">{perfectDays}d</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
});

// ── Smooth Curve Timeline ──
const TimelineChart = memo(function TimelineChart({ forgeItems }: { forgeItems: ForgeItem[] }) {
    const [animated, setAnimated] = useState(false);
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setAnimated(true); }, []);

    const last30Days = useMemo(() => {
        const days: { date: string; pct: number; completed: number; total: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dailyItems = forgeItems.filter(item => item.type === 'daily');
            if (dailyItems.length === 0) { days.push({ date: dateStr, pct: 0, completed: 0, total: 0 }); continue; }
            const completed = dailyItems.filter(item => item.completions[dateStr]).length;
            days.push({ date: dateStr, pct: Math.round((completed / dailyItems.length) * 100), completed, total: dailyItems.length });
        }
        return days;
    }, [forgeItems]);

    const prevDataRef = useRef(last30Days);
    useEffect(() => {
        const prev = prevDataRef.current;
        if (prev.map(d => d.pct).join(',') !== last30Days.map(d => d.pct).join(',')) {
            setAnimated(false);
            requestAnimationFrame(() => setAnimated(true));
        }
        prevDataRef.current = last30Days;
    }, [last30Days]);

    if (last30Days.length === 0) return null;

    const width = 800; const height = 180;
    const padding = { top: 25, right: 15, bottom: 30, left: 30 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const points = last30Days.map((d, i) => ({
        x: padding.left + (i / (last30Days.length - 1)) * chartW,
        y: padding.top + chartH - (d.pct / 100) * chartH, ...d,
    }));
    const smoothPath = points.map((p, i, arr) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = arr[i - 1];
        return `C ${prev.x + (p.x - prev.x) / 3} ${prev.y} ${prev.x + (2 * (p.x - prev.x)) / 3} ${p.y} ${p.x} ${p.y}`;
    }).join(' ');
    const areaPath = smoothPath + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    const avgPct = Math.round(last30Days.reduce((s, d) => s + d.pct, 0) / last30Days.length);
    const bestPct = Math.max(...last30Days.map(d => d.pct));
    const dailyItems = forgeItems.filter(i => i.type === 'daily');
    const streak = dailyItems.length > 0 ? Math.max(...dailyItems.map(i => i.streak)) : 0;
    const todayIdx = points.length - 1;

    const handleHover = useCallback((e: React.MouseEvent) => {
        const svgRect = e.currentTarget.getBoundingClientRect();
        const containerRect = chartRef.current?.getBoundingClientRect();
        if (svgRect && containerRect) {
            const svgX = ((e.clientX - svgRect.left) / svgRect.width) * width;
            let closest = 0, minDist = Infinity;
            points.forEach((p, i) => { const dist = Math.abs(p.x - svgX); if (dist < minDist) { minDist = dist; closest = i; } });
            setHoveredPoint(closest);
            setTooltipPos({ x: e.clientX - containerRect.left, y: e.clientY - containerRect.top });
        }
    }, [points]);

    return (
        <div ref={chartRef} className="relative">
            <div className="flex items-center justify-between mb-2">
                <span className="widget-title">📈 Progress Timeline</span>
                <span className="text-[9px] text-muted-foreground font-mono">Last 30 Days</span>
            </div>
            {hoveredPoint !== null && points[hoveredPoint] && (
                <div className="absolute z-30 bg-card border border-cyan-400/30 rounded-xl px-3 py-2.5 shadow-2xl shadow-cyan-500/10 pointer-events-none min-w-[120px]"
                    style={{ left: `${Math.max(60, Math.min(tooltipPos.x, (chartRef.current?.clientWidth || 800) - 60))}px`, top: `${Math.max(tooltipPos.y - 20, 0)}px`, transform: 'translate(-50%, -100%)' }}>
                    <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00d4ff]" /><span className="text-[11px] font-semibold">{new Date(points[hoveredPoint].date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
                    <span className="text-xl font-bold font-mono text-cyan-400">{points[hoveredPoint].pct}%</span>
                    <span className="text-[9px] text-muted-foreground font-mono ml-1">done</span>
                    <div className="flex items-center gap-1 mt-1"><div className="flex-1 h-1.5 bg-section rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${points[hoveredPoint].pct}%`, boxShadow: '0 0 6px rgba(0,212,255,0.4)' }} /></div><span className="text-[8px] font-mono text-muted-foreground">{points[hoveredPoint].completed}/{points[hoveredPoint].total}</span></div>
                </div>
            )}
            <div className="overflow-x-auto overflow-y-hidden pb-1 custom-scrollbar">
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full min-w-[700px] cursor-crosshair" style={{ maxHeight: '180px' }} onMouseMove={handleHover} onMouseLeave={() => setHoveredPoint(null)}>
                    <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4ff" stopOpacity="0.15" /><stop offset="100%" stopColor="#00d4ff" stopOpacity="0" /></linearGradient>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#00d4ff" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#a78bfa" /></linearGradient>
                        <filter id="lineGlow"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    </defs>
                    {[0, 25, 50, 75, 100].map(v => (<g key={v}><line x1={padding.left} y1={padding.top + chartH - (v / 100) * chartH} x2={width - padding.right} y2={padding.top + chartH - (v / 100) * chartH} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 4" /><text x={padding.left - 4} y={padding.top + chartH - (v / 100) * chartH + 3} fill="hsl(var(--muted-foreground))" fontSize="8" textAnchor="end" fontFamily="monospace">{v}%</text></g>))}
                    <path d={areaPath} fill="url(#areaGrad)" opacity={animated ? 1 : 0} style={{ transition: 'opacity 1.5s ease 0.5s' }} />
                    <path d={smoothPath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" filter="url(#lineGlow)" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1200" strokeDashoffset={animated ? 0 : 1200} style={{ transition: 'stroke-dashoffset 2.5s ease' }} />
                    {hoveredPoint !== null && points[hoveredPoint] && <line x1={points[hoveredPoint].x} y1={padding.top} x2={points[hoveredPoint].x} y2={padding.top + chartH} stroke="#00d4ff" strokeWidth="1" strokeDasharray="5 3" opacity="0.5" />}
                    {/* Today marker */}
                    {points[todayIdx] && (
                        <circle cx={points[todayIdx].x} cy={points[todayIdx].y} r="5" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.8" className="animate-pulse" />
                    )}
                    {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={hoveredPoint === i ? 4 : (i === todayIdx ? 3 : 2)} fill={hoveredPoint === i ? '#fff' : (i === todayIdx ? '#f59e0b' : '#00d4ff')}
                            stroke={hoveredPoint === i ? '#8b5cf6' : 'transparent'} strokeWidth={hoveredPoint === i ? 2.5 : 0}
                            opacity={animated ? 1 : 0} style={{ transition: `opacity 0.3s ease 2s, r 0.25s ease` }} />
                    ))}
                    {points.filter((_, i) => i % 7 === 0).map((p, i) => <text key={i} x={p.x} y={height - 4} fill="hsl(var(--muted-foreground))" fontSize="8" textAnchor="middle" fontFamily="monospace">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>)}
                </svg>
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted-foreground justify-center">
                <span>📊 Avg: <span className="text-cyan-400">{avgPct}%</span></span>
                <span>🏆 Best: <span className="text-violet-400">{bestPct}%</span></span>
                <span>🔥 Streak: <span className="text-amber-400">{streak}d</span></span>
            </div>
        </div>
    );
});

// ── Mini Heatmap ──
const MiniHeatmap = memo(function MiniHeatmap({ completions }: { completions: Record<string, boolean> }) {
    const last14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d.toISOString().split('T')[0]; });
    return (
        <div className="flex gap-0.5">
            {last14.map(date => (<div key={date} className="w-2 h-2 rounded-sm" style={{ background: completions[date] ? '#22c55e' : '#1a1a24', boxShadow: completions[date] ? '0 0 3px rgba(34,197,94,0.4)' : 'none' }} title={date} />))}
        </div>
    );
});

// ── Habit Item ──
const HabitItem = memo(function HabitItem({ item, done, onToggle, onEdit, onDelete, onDragStart, onDragEnter, onDragEnd }: any) {
    const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
    const itemRef = useRef<HTMLDivElement>(null);

    const handleClick = (e: React.MouseEvent) => {
        if (!done) {
            const rect = itemRef.current?.getBoundingClientRect();
            if (rect) setBurst({ x: e.clientX, y: e.clientY });
            setTimeout(() => setBurst(null), 600);
        }
        onToggle();
    };

    return (
        <>
            {burst && <CheckParticles x={burst.x} y={burst.y} />}
            <div ref={itemRef} draggable onDragStart={onDragStart} onDragEnter={onDragEnter} onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer group hover:-translate-y-0.5 hover:shadow-lg', done ? 'bg-section/30 border-border/20' : 'bg-section/50 border-border/40 hover:border-cyan-500/30')}
                onClick={handleClick}>
                <GripVertical className="w-3 h-3 text-muted-foreground/20 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300', done ? 'bg-green-500 border-green-500 scale-100 animate-check-bounce' : 'border-muted-foreground/30 hover:scale-110')}>
                    {done && <span className="text-white text-[9px] font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                    <span className={cn('text-[12px]', done && 'line-through text-muted-foreground/50')}>{item.icon} {item.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <MiniHeatmap completions={item.completions} />
                        <span className="text-[8px] font-mono text-cyan-400 flex items-center gap-0.5"><Flame className="w-2 h-2" />{item.streak}</span>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all"><Pencil className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400 transition-all"><Trash2 className="w-3 h-3" /></button>
            </div>
        </>
    );
});

// ── Goal Item ──
const GoalItem = memo(function GoalItem({ item, onIncrement, onEdit, onDelete }: any) {
    const [floater, setFloater] = useState<{ x: number; y: number } | null>(null);
    const [barAnimated, setBarAnimated] = useState(false);
    const pct = item.targetCount ? Math.round(((item.currentCount || 0) / item.targetCount) * 100) : 0;
    const isMilestone = [25, 50, 75, 100].includes(pct) && pct > 0;

    useEffect(() => { setTimeout(() => setBarAnimated(true), 300); }, []);

    const handleIncrement = (e: React.MouseEvent) => {
        setFloater({ x: e.clientX, y: e.clientY });
        setTimeout(() => setFloater(null), 800);
        onIncrement();
    };

    return (
        <div className="group hover:-translate-y-0.5 transition-transform duration-300">
            {floater && <FloatingPlusOne x={floater.x} y={floater.y} />}
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px]">{item.icon} {item.name}</span>
                <div className="flex items-center gap-1">
                    <button onClick={handleIncrement} className="text-[9px] bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded-md font-mono hover:bg-cyan-500/25 transition-all">+1</button>
                    <button onClick={onEdit} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-foreground transition-all"><Pencil className="w-2.5 h-2.5" /></button>
                    <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-400 transition-all"><Trash2 className="w-2.5 h-2.5" /></button>
                </div>
            </div>
            <div className="h-2.5 bg-section rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-1000 ease-out', isMilestone && 'animate-shimmer')}
                    style={{ width: barAnimated ? `${pct}%` : '0%', boxShadow: pct > 0 ? '0 0 8px rgba(0,212,255,0.3)' : 'none' }} />
            </div>
            <div className="flex justify-between mt-1 text-[8px] font-mono text-muted-foreground">
                <span>{item.currentCount || 0} / {item.targetCount} {item.unit}</span>
                <span className="text-cyan-400">{pct}%</span>
            </div>
        </div>
    );
});

// ── Main ForgePage ──
export default function ForgePage() {
    const { forgeItems, addForgeItem, updateForgeItem, deleteForgeItem, toggleForgeItem, incrementTarget, reorderForgeItems } = useAppStore();
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemName, setItemName] = useState('');
    const [itemIcon, setItemIcon] = useState('🏃');
    const [itemColor, setItemColor] = useState('#00d4ff');
    const [itemType, setItemType] = useState<'daily' | 'target'>('daily');
    const [itemTarget, setItemTarget] = useState(10);
    const [itemUnit, setItemUnit] = useState('times');
    const [showDelete, setShowDelete] = useState<string | null>(null);
    const [celebrating, setCelebrating] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];
    const dailyItems = forgeItems.filter(i => i.type === 'daily').sort((a, b) => a.order - b.order);
    const targetItems = forgeItems.filter(i => i.type === 'target').sort((a, b) => a.order - b.order);
    const todayDone = dailyItems.filter(i => i.completions[todayStr]).length;
    const todayTotal = dailyItems.length;
    const todayPct = todayTotal === 0 ? 0 : Math.round((todayDone / todayTotal) * 100);

    const weekData = (() => {
        const days: { label: string; pct: number; completed: number; total: number }[] = [];
        const dailies = forgeItems.filter(i => i.type === 'daily');
        const total = dailies.length;
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const dateStr = d.toISOString().split('T')[0]; const completed = dailies.filter(item => item.completions[dateStr]).length; days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), pct: total === 0 ? 0 : Math.round((completed / total) * 100), completed, total }); }
        return days;
    })();

    useEffect(() => { if (todayPct === 100 && todayTotal > 0 && !celebrating) { setCelebrating(true); setTimeout(() => setCelebrating(false), 4000); } }, [todayPct]);

    const [streakPopup, setStreakPopup] = useState<{ name: string; streak: number } | null>(null);
    const prevStreaks = useRef<Record<string, number>>({});
    useEffect(() => { dailyItems.forEach(item => { const prev = prevStreaks.current[item.id] || 0; if (item.streak > prev && [7, 30, 60, 100, 365].includes(item.streak)) { setStreakPopup({ name: item.name, streak: item.streak }); setTimeout(() => setStreakPopup(null), 3000); } prevStreaks.current[item.id] = item.streak; }); }, [dailyItems]);

    const openAddModal = () => { setEditingId(null); setItemName(''); setItemIcon('🏃'); setItemColor('#00d4ff'); setItemType('daily'); setItemTarget(10); setItemUnit('times'); setShowModal(true); };
    const openEditModal = (item: ForgeItem) => { setEditingId(item.id); setItemName(item.name); setItemIcon(item.icon); setItemColor(item.color); setItemType(item.type); setItemTarget(item.targetCount || 10); setItemUnit(item.unit || 'times'); setShowModal(true); };
    const handleSave = () => { if (!itemName.trim()) return; const data: any = { name: itemName.trim(), icon: itemIcon, color: itemColor, type: itemType, targetCount: itemType === 'target' ? itemTarget : undefined, unit: itemType === 'target' ? itemUnit : undefined }; if (editingId) updateForgeItem(editingId, data); else addForgeItem(data); setShowModal(false); };

    const dragItem = useRef<string | null>(null); const dragOverItem = useRef<string | null>(null);
    const handleDragStart = (id: string) => { dragItem.current = id; };
    const handleDragEnter = (id: string) => { dragOverItem.current = id; };
    const handleDragEnd = () => { if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) return; const items = [...dailyItems].sort((a, b) => a.order - b.order); const from = items.findIndex(i => i.id === dragItem.current); const to = items.findIndex(i => i.id === dragOverItem.current); if (from === -1 || to === -1) return; const reordered = [...items]; const [moved] = reordered.splice(from, 1); reordered.splice(to, 0, moved); reorderForgeItems(reordered.map(i => i.id)); dragItem.current = null; dragOverItem.current = null; };

    return (
        <div className="space-y-5">
            {celebrating && <Confetti />}
            {streakPopup && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-cyan-500 text-black px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm animate-bounce">🔥 {streakPopup.streak} Day Streak! "{streakPopup.name}" is on fire!</div>}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-semibold flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-base">🔥</span>Forge</h2><p className="text-xs text-muted-foreground mt-0.5 ml-10">Forge your habits, achieve your goals</p></div>
                <button onClick={openAddModal} className="bg-cyan-500 text-black px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:shadow-[0_0_18px_rgba(0,212,255,0.4)] transition-all font-mono"><Plus className="w-3.5 h-3.5" /> New</button>
            </div>

            <HeroCard todayPct={todayPct} todayDone={todayDone} todayTotal={todayTotal} weekData={weekData} triggerKey={todayDone} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 widget !p-4">
                    <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">📋 Daily Habits</span><span className="text-[9px] text-muted-foreground font-mono">{todayDone}/{todayTotal} done</span></div>
                    <div className="space-y-1.5">
                        {dailyItems.length === 0 && <p className="text-center text-muted-foreground font-mono text-xs py-8">No habits yet</p>}
                        {dailyItems.map(item => (
                            <HabitItem key={item.id} item={item} done={!!item.completions[todayStr]}
                                onToggle={() => toggleForgeItem(item.id)}
                                onEdit={() => openEditModal(item)}
                                onDelete={() => setShowDelete(item.id)}
                                onDragStart={() => handleDragStart(item.id)}
                                onDragEnter={() => handleDragEnter(item.id)}
                                onDragEnd={handleDragEnd}
                            />
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 widget !p-4">
                    <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-mono uppercase tracking-wider text-violet-400">🎯 Goals</span><span className="text-[9px] text-muted-foreground font-mono">{targetItems.length} active</span></div>
                    <div className="space-y-3">
                        {targetItems.length === 0 && <p className="text-center text-muted-foreground font-mono text-xs py-8">No goals yet</p>}
                        {targetItems.map(item => (
                            <GoalItem key={item.id} item={item}
                                onIncrement={() => incrementTarget(item.id)}
                                onEdit={() => openEditModal(item)}
                                onDelete={() => setShowDelete(item.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="widget !p-4"><TimelineChart forgeItems={forgeItems} /></div>

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <form onSubmit={e => { e.preventDefault(); handleSave(); }} onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
                        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{editingId ? 'Edit' : 'New'} Item</h3><button type="button" onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button></div>
                        <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Name" maxLength={30} className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500" />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setItemType('daily')} className={cn('flex-1 py-2 rounded-lg text-[10px] font-mono border transition-all', itemType === 'daily' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' : 'border-border text-muted-foreground')}>📋 Daily</button>
                            <button type="button" onClick={() => setItemType('target')} className={cn('flex-1 py-2 rounded-lg text-[10px] font-mono border transition-all', itemType === 'target' ? 'bg-violet-500/15 border-violet-500/40 text-violet-400' : 'border-border text-muted-foreground')}>🎯 Target</button>
                        </div>
                        {itemType === 'target' && <div className="grid grid-cols-2 gap-2"><input type="number" value={itemTarget} onChange={e => setItemTarget(Math.max(1, +e.target.value))} placeholder="Target" className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500" /><input value={itemUnit} onChange={e => setItemUnit(e.target.value)} placeholder="Unit" className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-cyan-500" /></div>}
                        <div><label className="text-[9px] font-mono text-muted-foreground mb-1.5 block">Icon</label><div className="flex gap-1.5 flex-wrap">{ITEM_ICONS.map(icon => <button key={icon} type="button" onClick={() => setItemIcon(icon)} className={cn('w-7 h-7 rounded-lg text-sm', itemIcon === icon && 'bg-cyan-500/15 ring-1 ring-cyan-500/30')}>{icon}</button>)}</div></div>
                        <div><label className="text-[9px] font-mono text-muted-foreground mb-1.5 block">Color</label><div className="flex gap-1.5">{ITEM_COLORS.map(c => <button key={c} type="button" onClick={() => setItemColor(c)} className={cn('w-6 h-6 rounded-full', itemColor === c && 'ring-2 ring-white scale-110')} style={{ background: c }} />)}</div></div>
                        <button type="submit" className="w-full bg-cyan-500 text-black py-2.5 rounded-lg text-xs font-bold font-mono hover:shadow-[0_0_18px_rgba(0,212,255,0.4)] transition-all">{editingId ? 'Save' : 'Create'}</button>
                    </form>
                </div>
            )}

            {showDelete && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDelete(null)}>
                    <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center shadow-xl"><p className="text-sm">Delete this item?</p><div className="flex gap-2"><button onClick={() => setShowDelete(null)} className="flex-1 bg-section py-2.5 rounded-lg text-xs">Cancel</button><button onClick={() => { deleteForgeItem(showDelete); setShowDelete(null); }} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-xs">Delete</button></div></div>
                </div>
            )}
        </div>
    );
}