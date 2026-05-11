import { motion, AnimatePresence } from 'motion/react';
import { useAppStore, type ForgeItem } from '../store/useAppStore';
import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { Plus, X, Trash2, Flame, Pencil, Check, ChevronDown, RotateCcw, TrendingUp, TrendingDown, Award, BarChart3, GripVertical } from 'lucide-react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';

const ITEM_COLORS = ['#00d4ff', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const ITEM_ICONS = ['🏃', '🧘', '💧', '📖', '✍️', '🚫', '😴', '💪', '📚', '🎯', '💻', '🎵', '🏋️', '🥗', '🚶', '🧠'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HABIT_TEMPLATES = [
    { name: 'Morning Run', icon: '🏃', color: '#22c55e', type: 'daily' as const },
    { name: 'Read 30min', icon: '📖', color: '#8b5cf6', type: 'daily' as const },
    { name: 'Drink 2L Water', icon: '💧', color: '#00d4ff', type: 'daily' as const },
    { name: 'Meditate', icon: '🧘', color: '#14b8a6', type: 'daily' as const },
    { name: 'No Sugar', icon: '🚫', color: '#ef4444', type: 'daily' as const },
    { name: 'Workout', icon: '🏋️', color: '#f59e0b', type: 'target' as const, targetCount: 4, unit: 'times/week' },
    { name: 'Sleep 8h', icon: '😴', color: '#ec4899', type: 'target' as const, targetCount: 7, unit: 'nights/week' },
];

/* ── Helpers ── */
function isToday(dateStr?: string): boolean {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/* ── Toast ── */
function Toast({ msg, action, onAction, onClose }: { msg: string; action?: string; onAction?: () => void; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-card border border-border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
            <span className="text-sm">{msg}</span>
            {action && onAction && <button onClick={onAction} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 font-mono">{action}</button>}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
    );
}

/* ── Header ── */
const ForgeHeader = memo(function ForgeHeader({ streak, onAdd, onReset }: { streak: number; onAdd: () => void; onReset: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        Forge
                        {streak > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono">
                                <Flame className="w-3 h-3" /> {streak}d
                            </span>
                        )}
                    </h2>
                    <p className="text-[11px] text-muted-foreground font-mono">Build habits. Hit targets. Stay consistent.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onReset} className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/20 transition-all font-mono" title="Reset All Data">
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={onAdd} className="bg-cyan-500 text-black px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-cyan-400 transition-all font-mono">
                    <Plus className="w-4 h-4" /> New
                </button>
            </div>
        </div>
    );
});

/* ── Multi-Color Progress Ring ── */
const MultiColorHabitRing = memo(function MultiColorHabitRing({
    items,
    totalCount,
    hoveredIndex,
    onHover
}: {
    items: { color: string; name: string; icon: string }[];
    totalCount: number;
    hoveredIndex: number | null;
    onHover: (index: number | null) => void;
}) {
    const circumference = 2 * Math.PI * 34;
    const completedCount = items.length;

    return (
        <div className="relative w-44 h-44 flex items-center justify-center">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90 filter drop-shadow-sm">
                {/* Background Ring */}
                <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    className="text-border/20"
                />

                {completedCount > 0 && items.map((item, i) => {
                    const segmentLength = (circumference / completedCount);
                    const gap = completedCount > 1 ? 2 : 0; // Small gap between segments
                    const offset = -i * segmentLength;
                    const isHovered = hoveredIndex === i;
                    const isAnyHovered = hoveredIndex !== null;

                    return (
                        <motion.circle
                            key={`${item.name}-${i}`}
                            cx="40"
                            cy="40"
                            r="34"
                            fill="none"
                            stroke={item.color}
                            strokeWidth={isHovered ? 9 : 7}
                            strokeDasharray={`${segmentLength - gap} ${circumference - (segmentLength - gap)}`}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{
                                strokeDashoffset: offset,
                                opacity: isAnyHovered ? (isHovered ? 1 : 0.4) : 1,
                                strokeWidth: isHovered ? 10 : 7
                            }}
                            onMouseEnter={() => onHover(i)}
                            onMouseLeave={() => onHover(null)}
                            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                            className="cursor-pointer"
                        />
                    );
                })}
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                    {hoveredIndex !== null ? (
                        <motion.div
                            key="tooltip"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="flex flex-col items-center"
                        >
                            <span className="text-sm font-bold text-foreground mb-0.5">{items[hoveredIndex].icon}</span>
                            <span className="text-[10px] font-bold text-foreground text-center px-4 leading-tight">
                                {items[hoveredIndex].name}
                            </span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex flex-col items-center"
                        >
                            <span className={cn(
                                "text-3xl font-bold font-mono tracking-tighter transition-colors duration-500",
                                completedCount > 0 ? "text-foreground" : "text-muted-foreground/30"
                            )}>
                                {completedCount}<span className="text-muted-foreground/40 text-lg font-normal mx-0.5">/</span>{totalCount}
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                                {Math.round((completedCount / (totalCount || 1)) * 100)}% Mastery
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});

/* ── Today Rings (Now Multi-Color Unified) ── */
const TodayRings = memo(function TodayRings({
    completedItems,
    totalCount
}: {
    completedItems: { name: string; color: string; icon: string }[];
    totalCount: number;
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className="widget p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Today&apos;s Mastery</span>
            </div>

            <div className="flex-1 flex items-center justify-center -my-2">
                <MultiColorHabitRing
                    items={completedItems}
                    totalCount={totalCount}
                    hoveredIndex={hoveredIndex}
                    onHover={setHoveredIndex}
                />
            </div>

            {completedItems.length === 0 ? (
                <p className="text-[10px] font-mono text-muted-foreground text-center mt-2 italic">
                    Finish a habit to start the ring
                </p>
            ) : (
                <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-2">
                    {completedItems.slice(0, 6).map((item, i) => (
                        <motion.div
                            key={i}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={cn(
                                "flex items-center gap-1.5 cursor-pointer transition-all",
                                hoveredIndex !== null && hoveredIndex !== i ? "opacity-30 scale-95" : "opacity-100 scale-100"
                            )}
                        >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{item.name}</span>
                        </motion.div>
                    ))}
                    {completedItems.length > 6 && (
                        <div className="text-[9px] font-mono text-muted-foreground/60 flex items-center">
                            +{completedItems.length - 6} more
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

/* ── This Week ── */
const WeekStrip = memo(function WeekStrip({ data }: { data: { label: string; pct: number; completed: number; total: number }[] }) {
    const avg = Math.round(data.reduce((s, d) => s + d.pct, 0) / 7);
    const best = data.reduce((a, b) => a.pct > b.pct ? a : b);
    const perfectDays = data.filter(d => d.pct === 100).length;

    return (
        <div className="widget p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Weekly Overview</span>
                <div className="flex items-center gap-2.5 text-[9px] font-mono text-muted-foreground">
                    <div className="flex flex-col items-end">
                        <span className="text-cyan-400 font-bold">{avg}% Avg</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-end gap-1.5 min-h-[80px] my-4">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="relative w-full flex-1 flex items-end justify-center">
                            {/* Bar Background */}
                            <div className="absolute inset-0 w-full max-w-[24px] mx-auto bg-border/20 rounded-t-sm" />
                            {/* Bar Fill */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${d.pct}%` }}
                                transition={{ type: 'spring', stiffness: 100, damping: 15, delay: i * 0.05 }}
                                className={cn(
                                    "w-full max-w-[24px] rounded-t-sm transition-colors duration-500 relative z-10",
                                    d.pct === 100 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" :
                                        d.pct > 50 ? "bg-cyan-500" :
                                            d.pct > 0 ? "bg-cyan-500/60" : "bg-transparent"
                                )}
                                style={{ minHeight: d.pct > 0 ? '4px' : '0' }}
                            />
                            {/* Tooltip on hover */}
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-section border border-border px-1.5 py-0.5 rounded text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                {d.completed}/{d.total} Done
                            </div>
                        </div>
                        <span className={cn(
                            "text-[9px] font-mono transition-colors",
                            d.label === new Date().toLocaleDateString('en-US', { weekday: 'short' }) ? "text-foreground font-bold" : "text-muted-foreground"
                        )}>
                            {d.label[0]}
                        </span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/30 mt-auto">
                <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-muted-foreground uppercase leading-none mb-1">Peak</span>
                    <span className="text-[11px] font-mono font-bold text-amber-400 capitalize">{best.pct}% Mastery</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-mono text-muted-foreground uppercase leading-none mb-1">Status</span>
                    <div className="flex items-center gap-1">
                        {avg >= 50 ? <TrendingUp className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                        <span className={cn("text-[10px] font-mono font-bold", avg >= 70 ? "text-green-400" : avg >= 40 ? "text-cyan-400" : "text-red-400")}>
                            {avg >= 70 ? 'Refining' : avg >= 40 ? 'Heating' : 'Cold'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

/* ── Goals Summary ── */
const GoalsSummary = memo(function GoalsSummary({ targetItems }: { targetItems: ForgeItem[] }) {
    const active = targetItems.length;
    const completed = targetItems.filter(i => i.targetCount && (i.currentCount || 0) >= i.targetCount).length;
    const avgPct = active > 0 ? Math.round(targetItems.reduce((s, i) => s + Math.min(100, Math.round(((i.currentCount || 0) / (i.targetCount || 1)) * 100)), 0) / active) : 0;

    const nearCompletion = targetItems.filter(i => {
        const pct = Math.round(((i.currentCount || 0) / (i.targetCount || 1)) * 100);
        return pct >= 80 && pct < 100;
    });

    const inProgress = targetItems.filter(i => {
        const pct = Math.round(((i.currentCount || 0) / (i.targetCount || 1)) * 100);
        return pct < 100;
    });

    let topGoal = null;
    if (inProgress.length > 0) {
        topGoal = [...inProgress].sort((a, b) => {
            const pa = ((a.currentCount || 0) / (a.targetCount || 1));
            const pb = ((b.currentCount || 0) / (b.targetCount || 1));
            return pb - pa;
        })[0];
    }

    const circumference = 2 * Math.PI * 28;
    const strokeDashoffset = circumference - (avgPct / 100) * circumference;

    return (
        <div className="widget p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Award className="w-3 h-3" /> Target Mastery
                </span>
                <span className="text-[10px] font-mono text-violet-400 font-bold">{completed} Done</span>
            </div>

            <div className="flex-1 flex gap-5 items-center">
                {/* Radial Progress */}
                <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="5" className="text-border/20" />
                        <motion.circle
                            cx="32" cy="32" r="28" fill="none" stroke="url(#goalGradient)" strokeWidth="5"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round"
                        />
                        <defs>
                            <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#d946ef" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold font-mono tracking-tighter leading-none">{avgPct}%</span>
                        <span className="text-[7px] font-mono text-muted-foreground uppercase">Avg</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">Active</span>
                        <span className="text-xs font-bold font-mono text-foreground">{active}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-mono">Closing In</span>
                            <span className="text-[8px] text-muted-foreground/60 font-mono italic">Near 100%</span>
                        </div>
                        <span className={cn("text-xs font-bold font-mono", nearCompletion.length > 0 ? "text-cyan-400" : "text-muted-foreground/40")}>
                            {nearCompletion.length}
                        </span>
                    </div>
                    <div className="pt-2 border-t border-border/20">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-muted-foreground font-mono">Momentum</span>
                            <TrendingUp className="w-2.5 h-2.5 text-green-500" />
                        </div>
                        <div className="text-[9px] font-mono text-violet-300 font-medium line-clamp-1 h-3 leading-none italic">
                            {completed > 0 ? `${completed} Mastered 🏆` : active > 0 ? "Building heat..." : "Set a goal"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Milestone */}
            {topGoal && (
                <div className="mt-4 bg-section/30 rounded-lg p-3 border border-border/10">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono text-muted-foreground uppercase flex items-center gap-1.5">
                            <BarChart3 className="w-2.5 h-2.5" /> Next Achievement
                        </span>
                        <span className="text-[9px] font-bold font-mono text-violet-400">
                            {Math.round(((topGoal.currentCount || 0) / (topGoal.targetCount || 1)) * 100)}%
                        </span>
                    </div>
                    <div className="text-[11px] font-medium truncate mb-2">
                        {topGoal.icon} {topGoal.name}
                    </div>
                    <div className="h-1 bg-border/20 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((topGoal.currentCount || 0) / (topGoal.targetCount || 1)) * 100}%` }}
                            className="h-full bg-violet-500 rounded-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

/* ── 30-Day Calendar Grid ── */
function HabitCalendar({ completions, color }: { completions: Record<string, boolean>; color: string }) {
    const days = useMemo(() => {
        return Array.from({ length: 30 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (29 - i));
            return d.toISOString().split('T')[0];
        });
    }, []);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                <span>Last 30 Days</span>
                <span>{days.filter(d => completions[d]).length} / 30</span>
            </div>
            <div className="grid grid-cols-10 gap-1">
                {days.map((date, i) => (
                    <div key={i} className={cn(
                        "aspect-square rounded-[3px] transition-colors",
                        completions[date] ? "border border-white/10" : "bg-border/20"
                    )} style={{ background: completions[date] ? color : undefined }} title={date} />
                ))}
            </div>
        </div>
    );
}

/* ── Habit Insights ── */
function HabitInsights({ completions, streak, bestStreak }: {
    completions: Record<string, boolean>; streak: number; bestStreak: number;
}) {
    const { strongest, weakest, trend } = useMemo(() => {
        const dayStats = WEEKDAYS.map((_, i) => ({
            day: WEEKDAYS[i],
            count: Object.entries(completions).filter(([date, done]) => done && new Date(date).getDay() === i).length
        }));
        const sorted = [...dayStats].sort((a, b) => b.count - a.count);
        const dates = Object.keys(completions).sort();
        const firstHalf = dates.slice(0, Math.floor(dates.length / 2)).filter(d => completions[d]).length;
        const secondHalf = dates.slice(Math.floor(dates.length / 2)).filter(d => completions[d]).length;
        const trend = secondHalf > firstHalf ? 'up' : secondHalf < firstHalf ? 'down' : 'stable';
        return { strongest: sorted[0]?.day, weakest: sorted[sorted.length - 1]?.day, trend };
    }, [completions]);

    return (
        <div className="grid grid-cols-2 gap-2">
            <div className="bg-section/50 rounded-lg p-2.5">
                <div className="text-[8px] font-mono text-muted-foreground uppercase">Best Streak</div>
                <div className="text-sm font-bold font-mono text-amber-400">{bestStreak}d</div>
            </div>
            <div className="bg-section/50 rounded-lg p-2.5">
                <div className="text-[8px] font-mono text-muted-foreground uppercase">Current</div>
                <div className="text-sm font-bold font-mono text-cyan-400">{streak}d</div>
            </div>
            <div className="bg-section/50 rounded-lg p-2.5">
                <div className="text-[8px] font-mono text-muted-foreground uppercase">Strongest</div>
                <div className="text-sm font-bold font-mono text-green-400">{strongest}</div>
            </div>
            <div className="bg-section/50 rounded-lg p-2.5">
                <div className="text-[8px] font-mono text-muted-foreground uppercase">Weakest</div>
                <div className="text-sm font-bold font-mono text-red-400">{weakest}</div>
            </div>
            <div className="col-span-2 bg-section/50 rounded-lg p-2.5 flex items-center gap-2">
                {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : trend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-red-400" /> : <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="text-[10px] font-mono">Trend: <span className={trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'}>{trend}</span></span>
            </div>
        </div>
    );
}

/* ── Habit Card ── */
const HabitCard = memo(function HabitCard({
    item, done, onToggle, onEdit, onDelete, onDragStart, onDragEnter, onDragEnd, isDragging, isDragOver
}: {
    item: ForgeItem; done: boolean;
    onToggle: () => void; onEdit: () => void; onDelete: () => void;
    onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void;
    isDragging?: boolean; isDragOver?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [checkAnim, setCheckAnim] = useState(false);

    const handleToggle = () => {
        if (!done) {
            setCheckAnim(true);
            setTimeout(() => setCheckAnim(false), 400);
        }
        onToggle();
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            className={cn(
                "rounded-xl border transition-all duration-200 overflow-hidden",
                done ? "bg-green-500/[0.03] border-green-500/20" : "bg-card border-border hover:border-cyan-500/20",
                isDragging && "opacity-40",
                isDragOver && "border-l-2 border-l-cyan-400"
            )}
        >
            {/* Main row */}
            <div className="flex items-center gap-3 px-4 py-3">
                <GripVertical className="w-3 h-3 text-muted-foreground/20 shrink-0 cursor-grab" />
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <button
                    onClick={handleToggle}
                    className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                        done ? "bg-green-500 border-green-500" : "border-muted-foreground/30 hover:border-cyan-400/50",
                        checkAnim && "scale-125"
                    )}
                >
                    {done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                    <span className={cn("text-sm", done && "line-through text-muted-foreground/60")}>{item.icon} {item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {item.streak > 2 && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                            <Flame className="w-3 h-3" /> {item.streak}
                        </span>
                    )}
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", expanded && "rotate-180")} />
                </div>
            </div>

            {/* Expanded area */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-border/40 pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <HabitCalendar completions={item.completions} color={item.color} />
                        <HabitInsights completions={item.completions} streak={item.streak} bestStreak={item.bestStreak} />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={onEdit} className="flex-1 py-2 text-xs bg-section rounded-lg hover:bg-hover transition-all flex items-center justify-center gap-1.5">
                            <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={onDelete} className="flex-1 py-2 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5">
                            <Trash2 className="w-3 h-3" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

/* ── Goal Card ── */
const GoalCard = memo(function GoalCard({
    item, onIncrement, onDecrement, onEdit, onDelete
}: {
    item: ForgeItem;
    onIncrement: () => void;
    onDecrement: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const pct = item.targetCount ? Math.round(((item.currentCount || 0) / item.targetCount) * 100) : 0;
    const isComplete = pct >= 100;
    const nextMilestone = [25, 50, 75, 100].find(m => m > pct) || 100;

    return (
        <div className={cn(
            "rounded-xl border transition-all duration-200 overflow-hidden relative",
            isComplete ? "bg-green-500/[0.03] border-green-500/20" : "bg-card border-border hover:border-cyan-500/20"
        )}>
            <div className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
                style={{
                    height: `${Math.min(pct, 100)}%`,
                    background: isComplete
                        ? 'linear-gradient(to top, rgba(34,197,94,0.08), rgba(34,197,94,0.02))'
                        : 'linear-gradient(to top, rgba(0,212,255,0.06), rgba(139,92,246,0.02))',
                }}
            />

            <div className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-sm font-medium">{item.name}</span>
                            {isComplete && <Award className="w-4 h-4 text-green-400" />}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{item.currentCount || 0} / {item.targetCount} {item.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onDecrement(); }} disabled={(item.currentCount || 0) <= 0}
                            className="w-7 h-7 rounded-lg bg-section flex items-center justify-center text-xs hover:bg-hover disabled:opacity-30 transition-all">−</button>
                        <button onClick={(e) => { e.stopPropagation(); onIncrement(); }}
                            className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs hover:bg-cyan-500/20 transition-all font-bold">+</button>
                    </div>
                </div>

                <div className="h-2 bg-section rounded-full overflow-hidden mb-2">
                    <div className={cn("h-full rounded-full transition-all duration-500", isComplete ? "bg-green-500" : "bg-gradient-to-r from-cyan-500 to-violet-500")}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className={cn(isComplete ? "text-green-400" : "text-cyan-400")}>{pct}%</span>
                    {!isComplete && <span className="text-muted-foreground">Next: {nextMilestone}%</span>}
                    <div className="flex gap-1">
                        <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-foreground transition-all"><Pencil className="w-3 h-3" /></button>
                        <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-red-400 transition-all"><Trash2 className="w-3 h-3" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
});

/* ── Timeline ── */
const Timeline = memo(function Timeline({ forgeItems }: { forgeItems: ForgeItem[] }) {
    const [days, setDays] = useState<30 | 90>(30);

    const data = useMemo(() => {
        const result: { date: string; label: string; habitsPct: number; goalsAvg: number; habitsDone: number; habitsTotal: number; goalsDone: number; goalsTotal: number }[] = [];
        const dailyItems = forgeItems.filter(i => i.type === 'daily');
        const targetItems = forgeItems.filter(i => i.type === 'target');
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const habitsDone = dailyItems.filter(item => item.completions[dateStr]).length;
            const habitsTotal = dailyItems.length;
            const habitsPct = habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : 0;

            let goalsDoneCount = 0;
            const goalsAvg = targetItems.length ? Math.round(targetItems.reduce((s, item) => {
                // Find latest count in history <= dateStr
                let countAtDate = 0;
                if (item.history) {
                    const sortedHistoryDates = Object.keys(item.history).filter(date => date <= dateStr).sort();
                    if (sortedHistoryDates.length > 0) {
                        countAtDate = item.history[sortedHistoryDates[sortedHistoryDates.length - 1]];
                    }
                }

                // Fallback for current day if not in history yet
                if (dateStr === todayStr && countAtDate === 0) {
                    countAtDate = item.currentCount || 0;
                }

                if (item.targetCount && countAtDate >= item.targetCount) {
                    goalsDoneCount++;
                }

                const pct = Math.round((countAtDate / (item.targetCount || 1)) * 100);
                return s + pct;
            }, 0) / targetItems.length) : 0;

            result.push({
                date: dateStr,
                label,
                habitsPct,
                goalsAvg,
                habitsDone,
                habitsTotal,
                goalsDone: goalsDoneCount,
                goalsTotal: targetItems.length
            });
        }
        return result;
    }, [forgeItems, days]);

    return (
        <div className="widget p-5">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Timeline</span>
                <div className="flex gap-1">
                    <button onClick={() => setDays(30)} className={cn("px-2 py-1 rounded-md text-[10px] font-mono transition-all", days === 30 ? 'bg-cyan-500/10 text-cyan-400' : 'text-muted-foreground hover:text-foreground')}>30d</button>
                    <button onClick={() => setDays(90)} className={cn("px-2 py-1 rounded-md text-[10px] font-mono transition-all", days === 90 ? 'bg-cyan-500/10 text-cyan-400' : 'text-muted-foreground hover:text-foreground')}>90d</button>
                </div>
            </div>
            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="forgeHabitGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={Math.floor(days / 6)} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <RechartsTooltip
                            content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const p = payload[0].payload;
                                return (
                                    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs space-y-1">
                                        <div className="font-mono text-muted-foreground text-[10px]">{p.label}</div>
                                        <div className="text-cyan-400 font-mono">Habits: {p.habitsDone}/{p.habitsTotal} ({p.habitsPct}%)</div>
                                        <div className="text-violet-400 font-mono">Goal Progress: {p.goalsAvg}%</div>
                                    </div>
                                );
                            }}
                        />
                        <Area type="monotone" dataKey="habitsPct" stroke="#00d4ff" strokeWidth={2} fill="url(#forgeHabitGradient)" />
                        <Line type="monotone" dataKey="goalsAvg" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

/* ── Slide-over Panel ── */
function AddPanel({ open, onClose, editingId, onSave, forgeItems }: {
    open: boolean; onClose: () => void; editingId: string | null;
    onSave: (data: any) => void; forgeItems: ForgeItem[];
}) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('🏃');
    const [color, setColor] = useState('#00d4ff');
    const [type, setType] = useState<'daily' | 'target'>('daily');
    const [target, setTarget] = useState(10);
    const [unit, setUnit] = useState('times');
    const [showTemplates, setShowTemplates] = useState(false);
    const [error, setError] = useState('');
    const [colorWarning, setColorWarning] = useState('');

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            if (editingId) {
                const item = forgeItems.find(i => i.id === editingId);
                if (item) {
                    setName(item.name); setIcon(item.icon); setColor(item.color);
                    setType(item.type); setTarget(item.targetCount || 10); setUnit(item.unit || 'times');
                }
            } else {
                // Reset for new item
                setName(''); setIcon('🏃'); setType('daily');
                // Suggest a unique color
                const usedColors = new Set(forgeItems.map(i => i.color));
                const availableColor = ITEM_COLORS.find(c => !usedColors.has(c)) || ITEM_COLORS[forgeItems.length % ITEM_COLORS.length];
                setColor(availableColor);
            }
        }
        else {
            document.body.style.overflow = '';
            setColorWarning('');
        }
        return () => { document.body.style.overflow = ''; };
    }, [open, editingId, forgeItems]);

    // Check color uniqueness
    useEffect(() => {
        if (!open) return;
        const colorLower = color.toLowerCase();
        const conflict = forgeItems.find(i => i.id !== editingId && i.color.toLowerCase() === colorLower);
        if (conflict) {
            setColorWarning(conflict.name);
        } else {
            setColorWarning('');
        }
    }, [color, forgeItems, editingId, open]);

    const handleSave = () => {
        if (!name.trim()) { setError('Name is required'); return; }
        onSave({ name: name.trim(), icon, color, type, targetCount: type === 'target' ? target : undefined, unit: type === 'target' ? unit : undefined });
        onClose();
    };

    const applyTemplate = (t: typeof HABIT_TEMPLATES[0]) => {
        setName(t.name); setIcon(t.icon); setColor(t.color); setType(t.type);
        if (t.targetCount) setTarget(t.targetCount);
        if (t.unit) setUnit(t.unit);
        setShowTemplates(false);
    };

    return (
        <>
            <div className={cn("fixed inset-0 bg-black/50 z-50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={onClose} />
            <div className={cn("fixed inset-y-0 right-0 w-80 bg-card border-l border-border z-50 transition-transform duration-300 ease-out flex flex-col", open ? "translate-x-0" : "translate-x-full")}>
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="text-sm font-semibold tracking-tight">{editingId ? 'Edit' : 'New'} Item</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-section rounded-lg transition-all"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    {colorWarning && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3"
                        >
                            <div className="flex gap-2">
                                <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-amber-500 font-mono uppercase leading-none">Color Conflict</p>
                                    <p className="text-[9px] text-muted-foreground font-mono leading-tight">
                                        This color is already used by <span className="text-amber-400 font-bold">"{colorWarning}"</span>.
                                        Please use a different color for clarity.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {!editingId && (
                        <button onClick={() => setShowTemplates(!showTemplates)} className="w-full text-[10px] font-mono text-muted-foreground hover:text-foreground bg-section rounded-lg py-2.5 transition-all border border-border/10">
                            {showTemplates ? 'Hide' : 'Use'} Templates
                        </button>
                    )}
                    {showTemplates && (
                        <div className="grid grid-cols-2 gap-2">
                            {HABIT_TEMPLATES.map((t, i) => (
                                <button key={i} onClick={() => applyTemplate(t)} className="p-2.5 rounded-lg bg-section hover:bg-hover border border-transparent hover:border-border transition-all text-left">
                                    <div className="text-lg mb-1">{t.icon}</div>
                                    <div className="text-[10px] font-medium">{t.name}</div>
                                    <div className="text-[8px] text-muted-foreground font-mono">{t.type}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Name</label>
                            <input value={name} onChange={e => { setName(e.target.value); setError(''); }}
                                className={cn("w-full bg-section border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-cyan-500 transition-colors", error ? 'border-red-500' : 'border-border')}
                                placeholder="e.g., Morning Run" />
                            {error && <p className="text-[10px] text-red-400 font-mono mt-1">{error}</p>}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setType('daily')} className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-mono border transition-all", type === 'daily' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'border-border text-muted-foreground')}>📋 Daily</button>
                            <button onClick={() => setType('target')} className={cn("flex-1 py-2.5 rounded-lg text-[10px] font-mono border transition-all", type === 'target' ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'border-border text-muted-foreground')}>🎯 Target</button>
                        </div>

                        {type === 'target' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Target</label><input type="number" value={target} onChange={e => setTarget(Math.max(1, +e.target.value))} className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500" /></div>
                                <div><label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Unit</label><input value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500" /></div>
                            </div>
                        )}

                        <div><label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Icon</label><div className="flex gap-1.5 flex-wrap">{ITEM_ICONS.map(ic => <button key={ic} onClick={() => setIcon(ic)} className={cn("w-8 h-8 rounded-lg text-sm transition-all", icon === ic && "bg-cyan-500/10 ring-1 ring-cyan-500/30")}>{ic}</button>)}</div></div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono text-muted-foreground block">Identity Color</label>
                            <div className="flex gap-2.5 flex-wrap bg-section/30 p-3 rounded-xl border border-border/20">
                                {ITEM_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={cn("w-7 h-7 rounded-full transition-all hover:scale-110", color === c && "ring-2 ring-white scale-110 shadow-lg")}
                                        style={{ background: c }}
                                    />
                                ))}

                                <div className="w-full pt-2 flex items-center justify-between border-t border-border/10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: color }} />
                                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{color}</span>
                                    </div>
                                    <label className="relative flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-cyan-500/50 cursor-pointer transition-all shadow-sm">
                                        <Plus className="w-3 h-3 text-cyan-400" />
                                        <span className="text-[9px] font-mono font-bold uppercase">Custom Color</span>
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={e => setColor(e.target.value)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-border">
                    <button
                        onClick={handleSave}
                        disabled={!!colorWarning}
                        className={cn(
                            "w-full py-3 rounded-xl text-xs font-bold font-mono transition-all",
                            colorWarning
                                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                : "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        )}
                    >
                        {colorWarning ? 'Resolve Conflict' : (editingId ? 'Save Changes' : 'Create Item')}
                    </button>
                </div>
            </div>
        </>
    );
}

/* ── Main Page ── */
export default function ForgePage() {
    const { forgeItems, addForgeItem, updateForgeItem, deleteForgeItem, toggleForgeItem, incrementTarget, decrementTarget, reorderForgeItems } = useAppStore();
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showDelete, setShowDelete] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; action?: string; onAction?: () => void } | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);

    const todayStr = new Date().toISOString().split('T')[0];
    const dailyItems = forgeItems.filter(i => i.type === 'daily').sort((a, b) => a.order - b.order);
    const targetItems = forgeItems.filter(i => i.type === 'target').sort((a, b) => a.order - b.order);

    // Stats for ring and summaries
    const habitsDone = dailyItems.filter(i => i.completions[todayStr]).length;
    const habitsTotal = dailyItems.length;
    const goalsDone = targetItems.filter(i => i.targetCount && (i.currentCount || 0) >= i.targetCount).length;
    const goalsTotal = targetItems.length;

    // Unified completion data for the multi-color ring (Habits ONLY)
    const completedItems = useMemo(() => {
        return dailyItems.filter(i => i.completions[todayStr]).map(item => ({
            name: item.name,
            color: item.color,
            icon: item.icon
        }));
    }, [dailyItems, todayStr]);

    // Weekly summary still uses daily items
    const weekData = useMemo(() => {
        const days: { label: string; pct: number; completed: number; total: number }[] = [];
        const dailies = forgeItems.filter(i => i.type === 'daily');
        const total = dailies.length;
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const completed = dailies.filter(item => item.completions[dateStr]).length;
            days.push({ label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), pct: total === 0 ? 0 : Math.round((completed / total) * 100), completed, total });
        }
        return days;
    }, [forgeItems]);

    // Bulk actions
    const handleCheckAll = () => dailyItems.forEach(item => { if (!item.completions[todayStr]) toggleForgeItem(item.id); });
    const handleUncheckAll = () => dailyItems.forEach(item => { if (item.completions[todayStr]) toggleForgeItem(item.id); });

    // Undo delete
    const deletedItemRef = useRef<ForgeItem | null>(null);
    const handleDelete = (id: string) => {
        const item = forgeItems.find(i => i.id === id);
        if (item) deletedItemRef.current = item;
        deleteForgeItem(id);
        setShowDelete(null);
        setToast({ msg: `"${item?.name}" deleted`, action: 'Undo', onAction: () => { if (deletedItemRef.current) { addForgeItem(deletedItemRef.current); deletedItemRef.current = null; } setToast(null); } });
    };

    // Drag
    const handleDragStart = (id: string) => setDraggingId(id);
    const handleDragEnter = (id: string) => setDragOverId(id);
    const handleDragEnd = () => {
        if (!draggingId || !dragOverId || draggingId === dragOverId) { setDraggingId(null); setDragOverId(null); return; }
        const items = [...dailyItems].sort((a, b) => a.order - b.order);
        const from = items.findIndex(i => i.id === draggingId);
        const to = items.findIndex(i => i.id === dragOverId);
        if (from === -1 || to === -1) { setDraggingId(null); setDragOverId(null); return; }
        const reordered = [...items];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        reorderForgeItems(reordered.map(i => i.id));
        setDraggingId(null); setDragOverId(null);
    };

    // Panel
    const openAdd = () => { setEditingId(null); setPanelOpen(true); };
    const openEdit = (item: ForgeItem) => { setEditingId(item.id); setPanelOpen(true); };
    const handleSave = (data: any) => {
        if (editingId) updateForgeItem(editingId, data);
        else addForgeItem(data);
    };

    // Reset
    const handleReset = () => {
        const { resetForge } = useAppStore.getState();
        resetForge();
        useAppStore.setState({ activityEvents: [] });
        useAppStore.setState((state) => ({
            logs: state.logs.filter(l => !['forge', 'habit', 'goal'].includes(l.type))
        }));
        setResetStep(0);
        setToast({ msg: 'All Forge data has been reset' });
    };

    return (
        <div className="space-y-5 max-w-5xl mx-auto">
            {toast && <Toast msg={toast.msg} action={toast.action} onAction={toast.onAction} onClose={() => setToast(null)} />}

            <ForgeHeader streak={dailyItems.length > 0 ? Math.max(...dailyItems.map(i => i.streak)) : 0} onAdd={openAdd} onReset={() => setResetStep(1)} />

            {/* Top row: Unified mastery ring and summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TodayRings completedItems={completedItems} totalCount={dailyItems.length} />
                <WeekStrip data={weekData} />
                <GoalsSummary targetItems={targetItems} />
            </div>

            {/* Habits + Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Habits column */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Daily Habits</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-muted-foreground">{habitsDone}/{habitsTotal}</span>
                            {habitsTotal > 0 && (
                                <>
                                    <button onClick={handleCheckAll} className="p-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all" title="Check all">
                                        <Check className="w-3 h-3" />
                                    </button>
                                    <button onClick={handleUncheckAll} className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all" title="Uncheck all">
                                        <RotateCcw className="w-3 h-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="bg-widget border border-border rounded-xl p-3">
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {dailyItems.length === 0 && (
                                <div className="py-12 text-center space-y-3">
                                    <div className="text-4xl">📋</div>
                                    <p className="text-sm text-muted-foreground">No habits yet</p>
                                    <button onClick={openAdd} className="text-xs text-cyan-400 hover:text-cyan-300 font-mono">Create your first habit →</button>
                                </div>
                            )}
                            {dailyItems.map(item => (
                                <HabitCard key={item.id} item={item} done={!!item.completions[todayStr]}
                                    onToggle={() => toggleForgeItem(item.id)}
                                    onEdit={() => openEdit(item)}
                                    onDelete={() => setShowDelete(item.id)}
                                    onDragStart={() => handleDragStart(item.id)}
                                    onDragEnter={() => handleDragEnter(item.id)}
                                    onDragEnd={handleDragEnd}
                                    isDragging={draggingId === item.id}
                                    isDragOver={dragOverId === item.id}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Goals column */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Goals</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{targetItems.length} active</span>
                    </div>
                    <div className="bg-widget border border-border rounded-xl p-3">
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {targetItems.length === 0 && (
                                <div className="py-12 text-center space-y-3">
                                    <div className="text-4xl">🎯</div>
                                    <p className="text-sm text-muted-foreground">No goals yet</p>
                                    <button onClick={openAdd} className="text-xs text-violet-400 hover:text-violet-300 font-mono">Set your first goal →</button>
                                </div>
                            )}
                            {targetItems.map(item => (
                                <GoalCard key={item.id} item={item}
                                    onIncrement={() => incrementTarget(item.id)}
                                    onDecrement={() => decrementTarget(item.id)}
                                    onEdit={() => openEdit(item)}
                                    onDelete={() => setShowDelete(item.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <Timeline forgeItems={forgeItems} />

            {/* Slide-over panel */}
            <AddPanel open={panelOpen} onClose={() => setPanelOpen(false)} editingId={editingId} onSave={handleSave} forgeItems={forgeItems} />

            {/* Delete confirmation */}
            {showDelete && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDelete(null)}>
                    <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center shadow-xl">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-sm font-medium">Delete this item?</p>
                        <p className="text-[10px] text-muted-foreground font-mono">This cannot be undone</p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowDelete(null)} className="flex-1 bg-section py-2.5 rounded-lg text-xs hover:bg-hover transition-all">Cancel</button>
                            <button onClick={() => handleDelete(showDelete)} className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-xs hover:bg-red-600 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset modals */}
            {resetStep > 0 && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setResetStep(0)}>
                    <div onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center shadow-xl">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-sm font-medium">
                            {resetStep === 1 ? 'Are you sure?' : 'Final warning'}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                            {resetStep === 1
                                ? 'This will delete all habits, goals, and history.'
                                : 'This cannot be undone. All streaks, progress, and activity data will be permanently lost.'}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setResetStep(0)} className="flex-1 bg-section py-2.5 rounded-lg text-xs hover:bg-hover transition-all">Cancel</button>
                            <button
                                onClick={() => resetStep === 1 ? setResetStep(2) : handleReset()}
                                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg text-xs hover:bg-red-600 transition-all"
                            >
                                {resetStep === 1 ? "Yes, I'm Sure" : 'Permanently Delete Everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
