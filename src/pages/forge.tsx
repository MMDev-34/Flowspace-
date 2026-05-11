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
const ForgeHeader = memo(function ForgeHeader({ streak, onAdd }: { streak: number; onAdd: () => void }) {
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
            <button onClick={onAdd} className="bg-cyan-500 text-black px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-cyan-400 transition-all font-mono">
                <Plus className="w-4 h-4" /> New
            </button>
        </div>
    );
});

/* ── Progress Ring ── */
const ProgressRing = memo(function ProgressRing({
    pct, color, label, done, total
}: {
    pct: number; color: string; label: string; done: number; total: number;
}) {
    const circumference = 2 * Math.PI * 36;
    const offset = circumference * (1 - pct / 100);
    return (
        <div className="group relative flex flex-col items-center gap-2">
            <div className="relative w-20 h-20">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity={0.3} />
                    <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 rounded-full">
                    <span className="text-xs font-mono font-bold" style={{ color }}>{done}/{total}</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity">
                    <span className="text-lg font-bold font-mono" style={{ color }}>{pct}%</span>
                </div>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
    );
});

/* ── Today Rings ── */
const TodayRings = memo(function TodayRings({
    tasksDone, tasksTotal, habitsDone, habitsTotal, goalsDone, goalsTotal
}: {
    tasksDone: number; tasksTotal: number;
    habitsDone: number; habitsTotal: number;
    goalsDone: number; goalsTotal: number;
}) {
    return (
        <div className="widget p-5 h-full flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4">Today&apos;s Progress</span>
            <div className="flex-1 flex items-center justify-center gap-4">
                <ProgressRing pct={tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0} color="#22c55e" label="Tasks" done={tasksDone} total={tasksTotal} />
                <ProgressRing pct={habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : 0} color="#00d4ff" label="Habits" done={habitsDone} total={habitsTotal} />
                <ProgressRing pct={goalsTotal ? Math.round((goalsDone / goalsTotal) * 100) : 0} color="#8b5cf6" label="Goals" done={goalsDone} total={goalsTotal} />
            </div>
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
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">This Week</span>
                <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                    <span>Avg: <span className="text-cyan-400">{avg}%</span></span>
                    <span>Best: <span className="text-amber-400">{best.pct}%</span></span>
                </div>
            </div>

            <div className="flex items-end gap-1.5 h-16 mb-3">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <div className="text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity h-4">
                            {d.pct}%
                        </div>
                        <div className="w-full flex items-end justify-center" style={{ height: '40px' }}>
                            <div className={cn(
                                "w-full max-w-[36px] rounded-t-md transition-all duration-500",
                                d.pct === 100 ? "bg-green-500" : d.pct > 0 ? "bg-cyan-500" : "bg-border/50"
                            )} style={{ height: `${d.pct}%`, minHeight: d.pct > 0 ? '4px' : '0' }} />
                        </div>
                        <span className={cn("text-[9px] font-mono", d.pct === 100 ? 'text-green-400 font-bold' : 'text-muted-foreground')}>{d.label}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-2 border-t border-border/30 mt-auto">
                <span className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-400" /> {perfectDays} perfect {perfectDays === 1 ? 'day' : 'days'}
                </span>
                <span className="flex items-center gap-1">
                    {avg >= 50 ? <TrendingUp className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                    <span className={avg >= 50 ? 'text-green-400' : 'text-red-400'}>{avg >= 50 ? 'On track' : 'Needs work'}</span>
                </span>
            </div>
        </div>
    );
});

/* ── Goals Summary ── */
const GoalsSummary = memo(function GoalsSummary({ targetItems }: { targetItems: ForgeItem[] }) {
    const active = targetItems.length;
    const completed = targetItems.filter(i => i.targetCount && (i.currentCount || 0) >= i.targetCount).length;
    const avgPct = active > 0 ? Math.round(targetItems.reduce((s, i) => s + Math.round(((i.currentCount || 0) / (i.targetCount || 1)) * 100), 0) / active) : 0;

    const inProgress = targetItems.filter(i => {
        const pct = Math.round(((i.currentCount || 0) / (i.targetCount || 1)) * 100);
        return pct < 100;
    });

    let nextMilestoneLabel = '';
    if (inProgress.length > 0) {
        const sorted = [...inProgress].sort((a, b) => {
            const pa = ((a.currentCount || 0) / (a.targetCount || 1));
            const pb = ((b.currentCount || 0) / (b.targetCount || 1));
            return pb - pa;
        });
        const top = sorted[0];
        const pct = Math.round(((top.currentCount || 0) / (top.targetCount || 1)) * 100);
        const next = [25, 50, 75, 100].find(m => m > pct) || 100;
        nextMilestoneLabel = `${top.name} → ${next}%`;
    }

    return (
        <div className="widget p-5 h-full flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4">🎯 Goals</span>
            <div className="flex-1 flex flex-col justify-center gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">Active</span>
                    <span className="text-sm font-bold font-mono text-violet-400">{active}</span>
                </div>
                <div>
                    <div className="h-2 bg-section rounded-full overflow-hidden mb-1.5">
                        <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${avgPct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>Total Progress</span>
                        <span className="text-violet-400">{avgPct}%</span>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">Completed</span>
                    <span className="text-sm font-bold font-mono text-green-400">{completed} 🏆</span>
                </div>
                {nextMilestoneLabel && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">Next</span>
                        <span className="text-[10px] font-mono text-violet-300 truncate max-w-[140px]" title={nextMilestoneLabel}>{nextMilestoneLabel}</span>
                    </div>
                )}
            </div>
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
        const result: { date: string; label: string; habitsPct: number; goalsAvg: number; habitsDone: number; habitsTotal: number }[] = [];
        const dailies = forgeItems.filter(i => i.type === 'daily');
        const targets = forgeItems.filter(i => i.type === 'target');

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const habitsDone = dailies.filter(item => item.completions[dateStr]).length;
            const habitsTotal = dailies.length;
            const habitsPct = habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : 0;

            const goalsAvg = targets.length ? Math.round(targets.reduce((s, item) => {
                const pct = Math.round(((item.currentCount || 0) / (item.targetCount || 1)) * 100);
                return s + pct;
            }, 0) / targets.length) : 0;

            result.push({ date: dateStr, label, habitsPct, goalsAvg, habitsDone, habitsTotal });
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
                                        <div className="text-violet-400 font-mono">Goals avg: {p.goalsAvg}%</div>
                                    </div>
                                );
                            }}
                        />
                        <Area type="monotone" dataKey="habitsPct" stroke="#00d4ff" strokeWidth={2} fill="url(#forgeHabitGradient)" />
                        <Line type="monotone" dataKey="goalsAvg" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

/* ── Slide-over Panel ── */
function AddPanel({ open, onClose, editingId, onSave }: {
    open: boolean; onClose: () => void; editingId: string | null;
    onSave: (data: any) => void;
}) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('🏃');
    const [color, setColor] = useState('#00d4ff');
    const [type, setType] = useState<'daily' | 'target'>('daily');
    const [target, setTarget] = useState(10);
    const [unit, setUnit] = useState('times');
    const [showTemplates, setShowTemplates] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

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
                    <h3 className="text-sm font-semibold">{editingId ? 'Edit' : 'New'} Item</h3>
                    <button onClick={onClose} className="p-1 hover:bg-section rounded-lg transition-all"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {!editingId && (
                        <button onClick={() => setShowTemplates(!showTemplates)} className="w-full text-[10px] font-mono text-muted-foreground hover:text-foreground bg-section rounded-lg py-2.5 transition-all">
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
                    <div><label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Color</label><div className="flex gap-2">{ITEM_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={cn("w-7 h-7 rounded-full transition-transform", color === c && "ring-2 ring-white scale-110")} style={{ background: c }} />)}</div></div>
                </div>
                <div className="p-5 border-t border-border">
                    <button onClick={handleSave} className="w-full bg-cyan-500 text-black py-3 rounded-xl text-xs font-bold font-mono hover:bg-cyan-400 transition-all">{editingId ? 'Save Changes' : 'Create Item'}</button>
                </div>
            </div>
        </>
    );
}

/* ── Main Page ── */
export default function ForgePage() {
    const { forgeItems, addForgeItem, updateForgeItem, deleteForgeItem, toggleForgeItem, incrementTarget, decrementTarget, reorderForgeItems } = useAppStore();
    const tasks = useAppStore(s => s.tasks);
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

    // Stats for rings
    const tasksDoneToday = tasks.filter(t => t.status === 'done' && isToday(t.completedAt)).length;
    const tasksTotal = tasks.length;
    const habitsDone = dailyItems.filter(i => i.completions[todayStr]).length;
    const habitsTotal = dailyItems.length;
    const goalsDone = targetItems.filter(i => i.targetCount && (i.currentCount || 0) >= i.targetCount).length;
    const goalsTotal = targetItems.length;

    // Week data
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
        useAppStore.setState({ forgeItems: [] });
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

            <ForgeHeader streak={dailyItems.length > 0 ? Math.max(...dailyItems.map(i => i.streak)) : 0} onAdd={openAdd} />

            {/* Top row: 3 equal widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TodayRings
                    tasksDone={tasksDoneToday}
                    tasksTotal={tasksTotal}
                    habitsDone={habitsDone}
                    habitsTotal={habitsTotal}
                    goalsDone={goalsDone}
                    goalsTotal={goalsTotal}
                />
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
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {dailyItems.length === 0 && (
                            <div className="widget py-12 text-center space-y-3">
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

                {/* Goals column */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Goals</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{targetItems.length} active</span>
                    </div>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {targetItems.length === 0 && (
                            <div className="widget py-12 text-center space-y-3">
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

            {/* Timeline */}
            <Timeline forgeItems={forgeItems} />

            {/* Reset */}
            <div className="flex justify-center pt-2 pb-4">
                <button onClick={() => setResetStep(1)} className="text-[10px] font-mono text-muted-foreground hover:text-red-400 transition-all flex items-center gap-1.5">
                    <RotateCcw className="w-3 h-3" /> Reset All Forge Data
                </button>
            </div>

            {/* Slide-over panel */}
            <AddPanel open={panelOpen} onClose={() => setPanelOpen(false)} editingId={editingId} onSave={handleSave} />

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