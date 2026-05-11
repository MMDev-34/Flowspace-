import { useMemo, useState, useCallback, memo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ActivityModule, HeatmapFilter, DailyActivity } from '@/types/activity';

/* ── Color palettes ─────────────────────────────────────────────────────── */
const MODULE_COLORS: Record<HeatmapFilter, string[]> = {
    all: ['#131415ff', '#0e4429', '#006d32', '#26a641', '#39d353'],
    tasks: ['#131415ff', '#3d1f00', '#7a3e00', '#b85c00', '#f57c00'],
    pomodoro: ['#131415ff', '#1a237e', '#283593', '#3949ab', '#5c6bc0'],
    forge: ['#131415ff', '#4a148c', '#6a1b9a', '#8e24aa', '#ab47bc'],
    notes: ['#131415ff', '#e65100', '#ef6c00', '#f57c00', '#ff9800'],
    calendar: ['#131415ff', '#b71c1c', '#d32f2f', '#e53935', '#f44336'],
    logs: ['#131415ff', '#1b5e20', '#2e7d32', '#388e3c', '#43a047'],
    quickAccess: ['#131415ff', '#006064', '#00838f', '#0097a7', '#00bcd4'],
    dashboard: ['#131415ff', '#37474f', '#546e7a', '#78909c', '#90a4ae'],
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LEVEL_LABELS = ['No activity', '1–2', '3–5', '6–8', '9+'];

/* ── Memoized Cell Component ──────────────────────────────────────────── */
interface HeatmapCellProps {
    day: DailyActivity;
    color: string;
    count: number;
    isToday: boolean;
    isHovered: boolean;
    onEnter: (e: React.MouseEvent, day: DailyActivity) => void;
    onMove: (e: React.MouseEvent) => void;
    onLeave: () => void;
    size: number;
}

const HeatmapCell = memo(function HeatmapCell({
    day,
    color,
    count,
    isToday,
    isHovered,
    onEnter,
    onMove,
    onLeave,
    size,
}: HeatmapCellProps) {
    return (
        <div
            className="relative cursor-pointer"
            style={{ width: size, height: size }}
            onMouseEnter={(e) => onEnter(e, day)}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            role="gridcell"
            tabIndex={0}
            aria-label={`${day.date}: ${count} activities`}
        >
            {/* Base cell — never changes size */}
            <div
                className={`w-full h-full rounded-[3px] transition-colors duration-150 ${isToday ? 'ring-[1.5px] ring-[#f59e0b] ring-offset-[1px] ring-offset-background' : ''
                    }`}
                style={{
                    backgroundColor: color,
                    border: count === 0 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                }}
            />

            {/* Hover overlay — scales without affecting layout */}
            {isHovered && (
                <div
                    className="absolute inset-0 rounded-[3px] pointer-events-none"
                    style={{
                        backgroundColor: color,
                        transform: 'scale(1.3)',
                        transformOrigin: 'center center',
                        boxShadow: `0 0 6px ${color}66`,
                        zIndex: 20,
                    }}
                />
            )}
        </div>
    );
});

/* ── Props ──────────────────────────────────────────────────────────────── */
interface ActivityHeatmapProps {
    days?: number;
    showFilters?: boolean;
    showLegend?: boolean;
    showSummary?: boolean;
    showMonthLabels?: boolean;
    cellSize?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ActivityHeatmap({
    days = 365,
    showFilters = true,
    showLegend = true,
    showSummary = true,
    showMonthLabels = true,
    cellSize = 'md',
    className = '',
}: ActivityHeatmapProps) {
    const [filter, setFilter] = useState<HeatmapFilter>('all');
    const [hoveredCell, setHoveredCell] = useState<DailyActivity | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const getDailyActivity = useAppStore((s) => s.getDailyActivity);
    const getActivityStreak = useAppStore((s) => s.getActivityStreak);
    const activityEvents = useAppStore((s) => s.activityEvents);

    const data = useMemo(() => getDailyActivity(days), [getDailyActivity, days, activityEvents.length]);
    const { current, longest } = useMemo(() => getActivityStreak(), [getActivityStreak, activityEvents.length]);

    const todayStr = new Date().toISOString().split('T')[0];

    /* ── Grid layout ──────────────────────────────────────────────────────── */
    const weeks = useMemo(() => {
        const w: DailyActivity[][] = [];
        for (let i = 0; i < data.length; i += 7) {
            w.push(data.slice(i, i + 7));
        }
        return w;
    }, [data]);

    /* ── Month labels ─────────────────────────────────────────────────────── */
    const monthLabels = useMemo(() => {
        if (!showMonthLabels) return [];
        const labels: { text: string; index: number }[] = [];
        weeks.forEach((week, wi) => {
            const firstDay = week[0];
            if (!firstDay) return;
            const d = new Date(firstDay.date);
            if (d.getDate() <= 7) {
                const month = MONTHS[d.getMonth()];
                if (!labels.length || labels[labels.length - 1].text !== month) {
                    labels.push({ text: month, index: wi });
                }
            }
        });
        return labels;
    }, [weeks, showMonthLabels]);

    /* ── Helpers ──────────────────────────────────────────────────────────── */
    const getIntensity = useCallback((count: number): number => {
        if (count === 0) return 0;
        if (count <= 2) return 1;
        if (count <= 5) return 2;
        if (count <= 8) return 3;
        return 4;
    }, []);

    const getCellColor = useCallback(
        (day: DailyActivity) => {
            const count = filter === 'all' ? day.total : day.breakdown[filter as ActivityModule];
            const intensity = getIntensity(count);
            return MODULE_COLORS[filter][intensity];
        },
        [filter, getIntensity]
    );

    const getCount = useCallback(
        (day: DailyActivity) => (filter === 'all' ? day.total : day.breakdown[filter as ActivityModule]),
        [filter]
    );

    /* ── Tooltip handlers ─────────────────────────────────────────────────── */
    const handleCellEnter = (e: React.MouseEvent, day: DailyActivity) => {
        setHoveredCell(day);
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    const handleCellMove = (e: React.MouseEvent) => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    /* ── Cell sizing ──────────────────────────────────────────────────────── */
    const sizeMap = { sm: 9, md: 11, lg: 13 };
    const gapMap = { sm: 2, md: 3, lg: 4 };
    const cellSizePx = sizeMap[cellSize];
    const gapSizePx = gapMap[cellSize];

    /* ── Stats ────────────────────────────────────────────────────────────── */
    const totalContributions = useMemo(
        () => data.reduce((sum, d) => sum + (filter === 'all' ? d.total : d.breakdown[filter as ActivityModule]), 0),
        [data, filter]
    );

    const mostActiveDay = useMemo(() => {
        let max = 0;
        let day = '';
        data.forEach((d) => {
            const count = filter === 'all' ? d.total : d.breakdown[filter as ActivityModule];
            if (count > max) {
                max = count;
                day = d.date;
            }
        });
        return max > 0 ? { date: day, count: max } : null;
    }, [data, filter]);

    const filters: HeatmapFilter[] = ['all', 'tasks', 'pomodoro', 'forge', 'notes', 'calendar'];

    return (
        <div className={`space-y-5 ${className}`}>
            {/* ── Header ───────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground widget-title">
                        Activity
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2">
                        <span className="text-success font-semibold">{current} day streak</span>
                        <span className="text-border">·</span>
                        <span>{longest} best</span>
                        <span className="text-border">·</span>
                        <span>{totalContributions} total</span>
                    </p>
                </div>

                {showFilters && (
                    <div className="flex gap-1 flex-wrap">
                        {filters.map((mod) => (
                            <button
                                key={mod}
                                onClick={() => setFilter(mod)}
                                className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-md transition-all duration-200 ${filter === mod
                                    ? 'bg-primary/15 text-primary border border-primary/30 shadow-[0_0_8px_rgba(0,212,255,0.1)]'
                                    : 'text-muted-foreground border border-transparent hover:text-foreground hover:bg-hover'
                                    }`}
                            >
                                {mod === 'all' ? 'All' : mod}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Summary bar ──────────────────────────────────────────────────── */}
            {showSummary && (
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground font-mono">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span>{totalContributions} contributions</span>
                    </div>
                    {mostActiveDay && (
                        <div className="flex items-center gap-1.5">
                            <span>🔥</span>
                            <span>
                                Best day: {(() => {
                                    const d = new Date(mostActiveDay.date);
                                    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
                                })()} ({mostActiveDay.count})
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>Longest streak: {longest} days</span>
                    </div>
                </div>
            )}

            {/* ── Heatmap Grid ─────────────────────────────────────────────────── */}
            <div className="overflow-x-auto pb-2 scrollbar-none">
                <div className="flex flex-col gap-0">
                    {/* Month labels */}
                    {showMonthLabels && (
                        <div className="relative h-4 mb-1" style={{ marginLeft: cellSizePx * 3 + gapSizePx * 2 }}>
                            {monthLabels.map((label) => (
                                <span
                                    key={label.index}
                                    className="absolute text-[9px] text-muted-foreground/40 font-mono uppercase"
                                    style={{ left: label.index * (cellSizePx + gapSizePx) }}
                                >
                                    {label.text}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Grid */}
                    <div className="flex" style={{ gap: gapSizePx }} role="grid">
                        {/* Weekday labels */}
                        <div className="flex flex-col" style={{ gap: gapSizePx, marginRight: gapSizePx * 2 }}>
                            {WEEKDAYS.map((d, i) => (
                                <div
                                    key={d}
                                    className="text-[9px] text-muted-foreground/30 leading-none font-mono text-right"
                                    style={{ height: cellSizePx, lineHeight: `${cellSizePx}px`, width: cellSizePx * 2 }}
                                >
                                    {i % 2 === 1 ? d.slice(0, 1) : ''}
                                </div>
                            ))}
                        </div>

                        {/* Weeks */}
                        {weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col" style={{ gap: gapSizePx }} role="row">
                                {week.map((day, di) => {
                                    const count = getCount(day);
                                    const color = getCellColor(day);
                                    const isToday = day.date === todayStr;
                                    const isHovered = hoveredCell?.date === day.date;

                                    return (
                                        <HeatmapCell
                                            key={di}
                                            day={day}
                                            color={color}
                                            count={count}
                                            isToday={isToday}
                                            isHovered={isHovered}
                                            onEnter={handleCellEnter}
                                            onMove={handleCellMove}
                                            onLeave={() => setHoveredCell(null)}
                                            size={cellSizePx}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Legend ───────────────────────────────────────────────────────── */}
            {showLegend && (
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 font-mono">
                        <span>Less</span>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="rounded-[3px] transition-colors duration-200"
                                style={{
                                    width: cellSizePx,
                                    height: cellSizePx,
                                    backgroundColor: MODULE_COLORS[filter][i],
                                }}
                                title={LEVEL_LABELS[i]}
                            />
                        ))}
                        <span>More</span>
                    </div>

                    <div className="flex gap-3 text-[10px] text-muted-foreground/30 font-mono">
                        {LEVEL_LABELS.map((label, i) => (
                            <span key={i} className="flex items-center gap-1">
                                <span
                                    className="inline-block rounded-[2px]"
                                    style={{
                                        width: 8,
                                        height: 8,
                                        backgroundColor: MODULE_COLORS[filter][i],
                                    }}
                                />
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Tooltip (always rendered, opacity toggle) ────────────────────── */}
            <div
                className={`fixed z-[100] pointer-events-none bg-card border border-border rounded-lg px-3.5 py-2.5 shadow-2xl shadow-black/40 text-xs transition-opacity duration-150 ${hoveredCell ? 'opacity-100' : 'opacity-0'
                    }`}
                style={{
                    left: tooltipPos.x,
                    top: hoveredCell ? tooltipPos.y - 100 : -9999,
                    transform: 'translateX(-50%)',
                    minWidth: 180,
                }}
            >
                <div className="text-muted-foreground text-[10px] font-mono mb-1 flex items-center gap-1.5">
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: hoveredCell ? getCellColor(hoveredCell) : 'transparent' }}
                    />
                    {(() => {
                        if (!hoveredCell) return '';
                        const d = new Date(hoveredCell.date);
                        const isToday = hoveredCell.date === todayStr;
                        return `${isToday ? 'Today' : ''} ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                    })()}
                </div>
                <div className="font-semibold text-foreground text-sm">
                    {(() => {
                        if (!hoveredCell) return '';
                        const count = getCount(hoveredCell);
                        return count === 0 ? 'No activity' : `${count} contribution${count > 1 ? 's' : ''}`;
                    })()}
                </div>
                {hoveredCell && filter === 'all' && hoveredCell.total > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        {Object.entries(hoveredCell.breakdown)
                            .filter(([, v]) => v > 0)
                            .map(([k, v]) => (
                                <span key={k} className="flex items-center gap-1">
                                    <span
                                        className="w-1 h-1 rounded-full"
                                        style={{ backgroundColor: MODULE_COLORS[k as HeatmapFilter][2] }}
                                    />
                                    {v} {k}
                                </span>
                            ))}
                    </div>
                )}
                <div
                    className="absolute left-1/2 -translate-x-1/2 top-full"
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid hsl(var(--color-border))',
                    }}
                />
            </div>
        </div>
    );
}