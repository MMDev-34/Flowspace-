import { useAppStore, type LogType } from '../store/useAppStore';
import { useMemo, useState } from 'react';
import { Search, Trash2, Check, Info, AlertTriangle, Clock, Zap, Settings, Calendar, FileText, Flame, Link as LinkIcon, Filter, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

const typeMeta: Record<LogType, { icon: LucideIcon; color: string; border: string; bg: string; chip: string }> = {
  info: { icon: Info, color: 'text-blue-400', border: 'border-l-blue-400', bg: 'bg-blue-400/5', chip: 'chip-cyan' },
  task: { icon: Check, color: 'text-green-400', border: 'border-l-green-400', bg: 'bg-green-400/5', chip: 'chip-green' },
  pomodoro: { icon: Clock, color: 'text-cyan-400', border: 'border-l-cyan-400', bg: 'bg-cyan-400/5', chip: 'chip-cyan' },
  system: { icon: Settings, color: 'text-violet-400', border: 'border-l-violet-400', bg: 'bg-violet-400/5', chip: 'chip-violet' },
  warn: { icon: AlertTriangle, color: 'text-amber-400', border: 'border-l-amber-400', bg: 'bg-amber-400/5', chip: 'chip-amber' },
  error: { icon: Zap, color: 'text-red-400', border: 'border-l-red-400', bg: 'bg-red-400/5', chip: 'chip-red' },
  note: { icon: FileText, color: 'text-pink-400', border: 'border-l-pink-400', bg: 'bg-pink-400/5', chip: 'chip-pink' },
  calendar: { icon: Calendar, color: 'text-fuchsia-400', border: 'border-l-fuchsia-400', bg: 'bg-fuchsia-400/5', chip: 'chip-pink' },
  forge: { icon: Flame, color: 'text-orange-400', border: 'border-l-orange-400', bg: 'bg-orange-400/5', chip: 'chip-orange' },
  link: { icon: LinkIcon, color: 'text-sky-400', border: 'border-l-sky-400', bg: 'bg-sky-400/5', chip: 'chip-sky' },
};

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'range';

export default function LogsPage() {
  const { logs, clearLogs, logRetentionDays, setLogRetentionDays } = useAppStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LogType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 6 * 86400000;

    return [...logs].reverse().filter(l => {
      // Type filter
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;

      // Search
      if (search && !l.msg.toLowerCase().includes(search.toLowerCase())) return false;

      // Date filter
      const ts = new Date(l.timestamp).getTime();

      if (dateFilter === 'today') return ts >= todayStart;
      if (dateFilter === 'yesterday') return ts >= yesterdayStart && ts < todayStart;
      if (dateFilter === 'week') return ts >= weekStart;
      if (dateFilter === 'range') {
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
        return ts >= start && ts <= end;
      }

      return true;
    });
  }, [logs, search, typeFilter, dateFilter, startDate, endDate]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(l => {
      const d = new Date(l.timestamp);
      const key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });
    return groups;
  }, [filtered]);

  const types: (LogType | 'all')[] = ['all', 'info', 'task', 'note', 'calendar', 'forge', 'link', 'pomodoro', 'system', 'warn', 'error'];
  const dateFilters: { id: DateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'range', label: 'Range' },
  ];

  const handleClear = () => {
    clearLogs();
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">System Logs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtered.length} of {logs.length} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all",
              showSettings
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-section border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="w-3.5 h-3.5" /> Retention
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="bg-destructive/10 text-destructive border border-destructive/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-destructive/20 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="widget !p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary" /> Auto-Deletion Policy
            </h3>
            <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] text-muted-foreground">
              Keep your logs database light by automatically deleting entries older than a specific date.
              The cleanup runs every time the app starts.
            </p>
            <div className="flex flex-wrap gap-2">
              {[0, 7, 14, 30, 60, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setLogRetentionDays(days)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all",
                    logRetentionDays === days
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-section border-border text-muted-foreground hover:border-muted"
                  )}
                >
                  {days === 0 ? 'Never' : `${days} Days`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="widget !p-4">
        {/* Search + type filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-section border border-border rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'px-2 py-0.5 text-[9px] rounded-full font-mono uppercase tracking-wider border transition-colors',
                  typeFilter === t
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Date filters */}
        <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-border/40">
          <div className="flex flex-wrap gap-1.5">
            {dateFilters.map(df => (
              <button
                key={df.id}
                onClick={() => setDateFilter(df.id)}
                className={cn(
                  'px-3 py-1 text-[10px] rounded-full font-mono uppercase tracking-wider border transition-colors flex items-center gap-1.5',
                  dateFilter === df.id
                    ? 'bg-secondary/15 text-secondary border-secondary/40'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {df.id === 'range' && <Filter className="w-3 h-3" />}
                {df.label}
              </button>
            ))}
          </div>

          {dateFilter === 'range' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-section border border-border rounded-md px-2 py-1 text-[10px] font-mono outline-none focus:border-primary"
              />
              <span className="text-[10px] text-muted-foreground">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-section border border-border rounded-md px-2 py-1 text-[10px] font-mono outline-none focus:border-primary"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="p-1 hover:bg-hover rounded-md text-muted-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Log list grouped by date */}
        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-section flex items-center justify-center">
                <Search className="w-5 h-5 opacity-40" />
              </div>
              <p className="font-mono text-xs">No log entries found</p>
              <p className="text-[10px] mt-1">Try adjusting filters or clear search</p>
            </div>
          )}

          {Object.entries(grouped).map(([date, entries]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2 sticky top-0 bg-card z-10 py-1">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2">
                  {date}
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">
                  {entries.length}
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>

              {/* Entries */}
              <div className="space-y-1">
                {entries.map(l => {
                  const meta = typeMeta[l.type];
                  const Icon = meta.icon;
                  const logDate = new Date(l.timestamp);
                  const timeStr = logDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                  const dateStr = logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  return (
                    <div
                      key={l.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md border-l-2 transition-colors hover:bg-hover/30',
                        meta.border,
                        meta.bg
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', meta.color)} />
                      <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {dateStr} · {timeStr}
                      </span>
                      <span className={cn('chip text-[9px]', meta.chip)}>{l.category}</span>
                      <span className="text-xs truncate flex-1">{l.msg}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-widget border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-lg"
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-sm font-semibold">Clear All Logs?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                This will permanently delete all {logs.length} log entries. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-section border border-border text-muted-foreground px-4 py-2 rounded-lg text-xs font-medium hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="flex-1 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-xs font-medium hover:bg-destructive/90 transition-all"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}