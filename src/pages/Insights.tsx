import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';

export default function InsightsPage() {
    const {
        tasks,
        pomoHistory,
        forgeItems,
        notes,
        calendarEvents,
        quickLinks,
    } = useAppStore();

    const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

    const now = new Date();
    const rangeDays = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[range];
    const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const isInRange = (iso: string) => new Date(iso) >= cutoff;
    const todayStr = now.toISOString().split('T')[0];

    const stats = useMemo(() => {
        const doneTasks = tasks.filter(t => t.status === 'done');
        const doneRecently = doneTasks.filter(t => t.completedAt && isInRange(t.completedAt));
        const pendingHigh = tasks.filter(t => t.status !== 'done' && t.priority === 'high').length;

        const recentSessions = pomoHistory.filter(s => isInRange(s.completedAt));
        const focusMinutes = recentSessions
            .filter(s => s.phase === 'focus')
            .reduce((acc, s) => acc + (s.durationMin || 25), 0);

        const dailyHabits = forgeItems.filter(i => i.type === 'daily');
        const habitsDoneToday = dailyHabits.filter(i => i.completions[todayStr]).length;
        const avgStreak = dailyHabits.length
            ? Math.round(dailyHabits.reduce((a, i) => a + i.streak, 0) / dailyHabits.length)
            : 0;

        const recentNotes = notes.filter(n => !n.deleted && isInRange(n.updatedAt));
        const upcomingEvents = calendarEvents.filter(e => e.startDate >= todayStr);
        const totalClicks = quickLinks.reduce((a, l) => a + l.clickCount, 0);

        const taskScore = Math.min(doneRecently.length * 5, 30);
        const focusScore = Math.min(Math.floor(focusMinutes / 30), 30);
        const habitScore = dailyHabits.length
            ? Math.min(Math.floor((habitsDoneToday / dailyHabits.length) * 25), 25)
            : 0;
        const noteScore = Math.min(recentNotes.length * 2, 15);
        const productivityScore = Math.min(taskScore + focusScore + habitScore + noteScore, 100);
        const trend = productivityScore > 60 ? 'up' : productivityScore > 30 ? 'flat' : 'down';

        return {
            doneRecently: doneRecently.length,
            pendingHigh,
            focusMinutes,
            focusSessions: recentSessions.filter(s => s.phase === 'focus').length,
            habitsDoneToday,
            totalHabits: dailyHabits.length,
            avgStreak,
            recentNotes: recentNotes.length,
            upcomingEvents: upcomingEvents.length,
            totalClicks,
            productivityScore,
            trend,
        };
    }, [tasks, pomoHistory, forgeItems, notes, calendarEvents, quickLinks, rangeDays, todayStr]);

    const StatCard = ({
        label,
        value,
        sub,
        accent,
        icon,
    }: {
        label: string;
        value: string | number;
        sub?: string;
        accent?: string;
        icon?: string;
    }) => (
        <div className="widget flex flex-col gap-1 min-w-[140px]">
            <div className="flex items-center justify-between">
                <span className="widget-title">{label}</span>
                {icon && <span className="text-sm">{icon}</span>}
            </div>
            <div className="stat-val" style={{ color: accent || 'inherit' }}>
                {value}
            </div>
            {sub && <span className="text-[10px] text-muted-foreground font-mono">{sub}</span>}
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your productivity, visualised.
                    </p>
                </div>

                <div className="flex bg-section rounded-lg p-0.5 border border-border">
                    {(['7d', '30d', '90d', '1y'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${range === r
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : '1 Year'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Productivity Score */}
            <div className="widget flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(220,13%,15%)" strokeWidth="8" />
                        <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke={stats.productivityScore >= 70 ? 'hsl(142,71%,45%)' : stats.productivityScore >= 40 ? 'hsl(38,92%,50%)' : 'hsl(0,63%,51%)'}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${stats.productivityScore * 2.64} 264`}
                            className="transition-all duration-700"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold font-mono">{stats.productivityScore}</span>
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold">Productivity Score</h2>
                    <p className="text-sm text-muted-foreground">
                        Based on tasks completed, focus time, habits & notes.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`chip ${stats.trend === 'up' ? 'chip-green' : stats.trend === 'flat' ? 'chip-amber' : 'chip-red'
                            }`}>
                            {stats.trend === 'up' ? '↑ Trending up' : stats.trend === 'flat' ? '→ Stable' : '↓ Needs attention'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <StatCard label="Tasks Done" value={stats.doneRecently} sub={`${stats.pendingHigh} high priority pending`} accent="hsl(142,71%,45%)" icon="✓" />
                <StatCard label="Focus Time" value={`${Math.floor(stats.focusMinutes / 60)}h ${stats.focusMinutes % 60}m`} sub={`${stats.focusSessions} sessions`} accent="hsl(184,100%,50%)" icon="◉" />
                <StatCard label="Habits Today" value={`${stats.habitsDoneToday}/${stats.totalHabits}`} sub={`avg streak ${stats.avgStreak}`} accent="hsl(263,84%,58%)" icon="🔥" />
                <StatCard label="Notes Active" value={stats.recentNotes} sub="edited this period" accent="hsl(38,92%,50%)" icon="📝" />
                <StatCard label="Upcoming" value={stats.upcomingEvents} sub="calendar events" accent="hsl(0,63%,51%)" icon="📅" />
                <StatCard label="Link Clicks" value={stats.totalClicks} sub="all time" accent="hsl(187,100%,42%)" icon="🔗" />
            </div>

            {/* Heatmap */}
            <section className="widget space-y-4">
                <ActivityHeatmap
                    days={range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365}
                    showFilters={true}
                    showLegend={true}
                />
            </section>
        </div>
    );
}