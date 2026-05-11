import {
  useAppStore,
  type Task,
  type TaskPriority,
  type TaskStatus,
  isOverdue,
  isAtRisk,
  effectivePriority,
  isToday,
  isUpcoming,
} from '../store/useAppStore';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, Check, Trash2, X, Clock, AlertTriangle,
  Flame, Calendar as CalendarIcon, Tag, ChevronRight, Inbox, ListChecks,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Button } from '../components/ui/button';
import { motion, AnimatePresence } from 'motion/react';

type View = 'today' | 'upcoming' | 'overdue' | 'completed' | 'all';

const VIEWS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: CalendarIcon },
  { id: 'upcoming', label: 'Upcoming', icon: ChevronRight },
  { id: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { id: 'completed', label: 'Completed', icon: Check },
  { id: 'all', label: 'All', icon: Inbox },
];

const fmtDue = (iso?: string, allDay?: boolean) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const day = 86400000;
  const sameDay = isToday(iso);
  const time = allDay ? '' : ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (sameDay) return `Today${time}`;
  if (diff > 0 && diff < day) return `Tomorrow${time}`;
  if (diff > -day && diff < 0) return `Yesterday${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + time;
};

const priorityChip = (p: TaskPriority) =>
  p === 'high' ? 'chip-red' : p === 'medium' ? 'chip-amber' : 'chip-cyan';

const statusMeta: Record<TaskStatus, { label: string; chip: string }> = {
  pending: { label: 'Pending', chip: 'chip-violet' },
  in_progress: { label: 'In Progress', chip: 'chip-cyan' },
  done: { label: 'Completed', chip: 'chip-green' },
};

const todayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseDateStr = (s: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const emptyDraft = () => ({
  title: '',
  description: '',
  priority: 'medium' as TaskPriority,
  due: todayDateStr(),
  dueTime: '',
  allDay: true,
  tags: [] as string[],
});

export default function TasksPage() {
  const {
    tasks, addTask, updateTask, setTaskStatus, deleteTask,
    customTags, addCustomTag, removeCustomTag, resetTaskData
  } = useAppStore();

  const [view, setView] = useState<View>('today');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // keyboard shortcut: 'n' to add
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setDraft(emptyDraft());
        setShowAdd(true);
      }
      if (e.key === 'Escape') {
        setShowAdd(false);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (showAdd) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [showAdd]);

  const counts = useMemo(() => ({
    today: tasks.filter(t => t.status !== 'done' && isToday(t.due)).length,
    upcoming: tasks.filter(t => t.status !== 'done' && isUpcoming(t.due)).length,
    overdue: tasks.filter(isOverdue).length,
    completed: tasks.filter(t => t.status === 'done').length,
    all: tasks.length,
  }), [tasks]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    customTags.forEach(t => s.add(t));
    tasks.forEach(t => t.tags.forEach(tag => s.add(tag)));
    return Array.from(s).sort();
  }, [tasks, customTags]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (view === 'today') list = list.filter(t => t.status !== 'done' && isToday(t.due));
    else if (view === 'upcoming') list = list.filter(t => t.status !== 'done' && isUpcoming(t.due));
    else if (view === 'overdue') list = list.filter(isOverdue);
    else if (view === 'completed') list = list.filter(t => t.status === 'done');

    if (tagFilter) list = list.filter(t => t.tags.includes(tagFilter));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }

    const order = { high: 0, medium: 1, low: 2 } as const;
    return [...list].sort((a, b) => {
      if (a.status !== b.status) {
        const s = { in_progress: 0, pending: 1, done: 2 } as const;
        return s[a.status] - s[b.status];
      }
      const op = order[effectivePriority(a)] - order[effectivePriority(b)];
      if (op !== 0) return op;
      const ad = a.due ? new Date(a.due).getTime() : Infinity;
      const bd = b.due ? new Date(b.due).getTime() : Infinity;
      return ad - bd;
    });
  }, [tasks, view, tagFilter, query]);

  const selected = useMemo(
    () => tasks.find(t => t.id === selectedId) ?? null,
    [tasks, selectedId]
  );

  const todayDone = tasks.filter(t => t.status === 'done' && t.completedAt && isToday(new Date(t.completedAt).toISOString())).length;
  const todayTotal = tasks.filter(t => isToday(t.due) || (t.completedAt && isToday(new Date(t.completedAt).toISOString()))).length;
  const dailyPct = todayTotal === 0 ? 0 : Math.round((todayDone / todayTotal) * 100);

  const streak = useMemo(() => {
    const days = new Set<string>();
    tasks.forEach(t => {
      if (t.completedAt) {
        const d = new Date(t.completedAt);
        days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    });
    let s = 0;
    const cur = new Date();
    while (days.has(`${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`)) {
      s++;
      cur.setDate(cur.getDate() - 1);
    }
    return s;
  }, [tasks]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    let due: string | undefined;
    if (draft.due) {
      if (draft.allDay) {
        // Use noon to avoid timezone edge cases while keeping it "all day"
        due = new Date(`${draft.due}T12:00:00`).toISOString();
      } else {
        due = new Date(`${draft.due}T${draft.dueTime || '09:00'}`).toISOString();
      }
    }
    addTask({
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      priority: draft.priority,
      tags: draft.tags,
      due,
      allDay: draft.allDay,
    });
    setDraft(emptyDraft());
    setShowAdd(false);
  };

  const toggleDraftTag = (tag: string) =>
    setDraft(d => ({ ...d, tags: d.tags.includes(tag) ? d.tags.filter(x => x !== tag) : [...d.tags, tag] }));

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDraft(dr => ({ ...dr, due: toDateStr(d) }));
  };

  const draftDateObj = parseDateStr(draft.due);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" /> Tasks
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Plan, focus, ship. Press <kbd className="px-1.5 py-0.5 bg-section border border-border rounded text-[10px] font-mono">N</kbd> to add.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search..."
            className="bg-section border border-border rounded-lg px-3 py-1.5 text-xs focus:border-primary outline-none w-44"
          />
          <button
            onClick={() => setShowResetConfirm(true)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all group"
            title="Reset Tasks"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setDraft(emptyDraft());
              setShowAdd(true);
            }}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:shadow-glow-cyan transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>
      </div>

      {/* Smart view tabs + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="widget lg:col-span-2 !p-3">
          <div className="flex flex-wrap gap-1">
            {VIEWS.map(v => {
              const Icon = v.icon;
              const c = counts[v.id];
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors',
                    view === v.id
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-hover'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{v.label}</span>
                  <span className="font-mono text-[10px] opacity-70">{c}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="widget !p-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="widget-title">Daily Progress</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-mono text-2xl font-bold">{dailyPct}%</span>
              <span className="text-[10px] text-muted-foreground">{todayDone}/{todayTotal}</span>
            </div>
            <div className="h-1.5 bg-section rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-gradient-brand transition-all" style={{ width: `${dailyPct}%` }} />
            </div>
          </div>
          <div className="text-center px-3 border-l border-border">
            <div className="widget-title">Streak</div>
            <div className="flex items-center gap-1 justify-center mt-1">
              <Flame className="w-5 h-5 text-warning" />
              <span className="font-mono text-2xl font-bold">{streak}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tag filter strip */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-subtle" />
        <button
          onClick={() => setTagFilter(null)}
          className={cn(
            'px-2.5 py-0.5 text-[10px] rounded-full font-mono uppercase tracking-wider border transition-colors',
            !tagFilter ? 'bg-secondary/15 text-secondary-foreground border-secondary/40' : 'border-border text-muted-foreground hover:border-secondary/30'
          )}
        >
          All
        </button>
        {allTags.map(tag => (
          <div key={tag} className="group relative flex items-center">
            <button
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              className={cn(
                'px-2.5 py-0.5 text-[10px] rounded-full font-mono uppercase tracking-wider border transition-colors pr-6',
                tagFilter === tag
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'border-border text-muted-foreground hover:border-primary/30'
              )}
            >
              #{tag}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCustomTag(tag);
                if (tagFilter === tag) setTagFilter(null);
              }}
              className="absolute right-1.5 opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
              title="Remove Tag"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {isAddingTag ? (
          <div className="flex items-center gap-1 border border-primary/30 rounded-full px-2 py-0.5 bg-section">
            <input
              autoFocus
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  addCustomTag(newTagName);
                  setNewTagName('');
                  setIsAddingTag(false);
                }
                if (e.key === 'Escape') setIsAddingTag(false);
              }}
              placeholder="Tag name"
              className="bg-transparent text-[10px] outline-none w-20 px-1"
            />
            <button onClick={() => { addCustomTag(newTagName); setNewTagName(''); setIsAddingTag(false); }}>
              <Check className="w-3 h-3 text-primary" />
            </button>
            <button onClick={() => setIsAddingTag(false)}>
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingTag(true)}
            className="px-2 py-0.5 text-[10px] rounded-full border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center gap-1"
          >
            <Plus className="w-2.5 h-2.5" /> New Tag
          </button>
        )}
      </div>

      {/* Main grid: list + side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List — scrollable */}
        <div className="widget !p-0 overflow-hidden lg:col-span-2 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-10 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Inbox className="w-8 h-8 opacity-40" />
              No tasks here. Press <kbd className="px-1.5 py-0.5 bg-section border border-border rounded text-[10px] font-mono">N</kbd> to add one.
            </div>
          )}
          {filtered.map(t => {
            const overdue = isOverdue(t);
            const atRisk = isAtRisk(t);
            const eff = effectivePriority(t);
            const accent =
              t.status === 'done' ? 'border-l-success' :
                overdue ? 'border-l-destructive' :
                  atRisk ? 'border-l-warning' :
                    t.status === 'in_progress' ? 'border-l-primary' :
                      eff === 'high' ? 'border-l-destructive' :
                        eff === 'medium' ? 'border-l-warning' :
                          'border-l-border';
            return (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 border-l-2 hover:bg-hover/40 transition-colors group cursor-pointer',
                  accent,
                  selectedId === t.id && 'bg-hover/40'
                )}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setTaskStatus(t.id, t.status === 'done' ? 'pending' : 'done'); }}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0',
                    t.status === 'done' ? 'bg-success border-success' : 'border-border hover:border-primary'
                  )}
                  aria-label={t.status === 'done' ? 'Mark pending' : 'Mark done'}
                >
                  {t.status === 'done' && <Check className="w-3 h-3 text-background" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-sm truncate flex items-center gap-2',
                    t.status === 'done' && 'line-through text-muted-foreground'
                  )}>
                    {t.title}
                    {atRisk && !overdue && t.status !== 'done' && (
                      <span title="At risk" className="text-warning"><AlertTriangle className="w-3 h-3" /></span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-mono">
                    {t.due && (
                      <span className={cn(
                        'flex items-center gap-1',
                        overdue ? 'text-destructive' : isToday(t.due) ? 'text-warning' : 'text-subtle'
                      )}>
                        <Clock className="w-3 h-3" />
                        {fmtDue(t.due, t.allDay)}
                      </span>
                    )}
                    {t.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-secondary-foreground/70">#{tag}</span>
                    ))}
                  </div>
                </div>

                <span className={cn('chip hidden sm:inline-flex', statusMeta[t.status].chip)}>
                  {statusMeta[t.status].label}
                </span>
                <span className={cn('chip', priorityChip(eff))}>{eff}</span>

                <button
                  onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {selected ? (
            <DetailPanel
              key={selected.id}
              task={selected}
              allTags={allTags}
              onClose={() => setSelectedId(null)}
              onUpdate={(patch) => updateTask(selected.id, patch)}
              onStatus={(s) => setTaskStatus(selected.id, s)}
            />
          ) : (
            <div className="widget !p-4 space-y-3">
              <div className="widget-title flex items-center justify-between">
                <span>This Week</span>
                <span className="font-mono text-[10px] text-primary">
                  {(() => {
                    const now = new Date();
                    const days = new Set<string>();
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date(now);
                      d.setDate(d.getDate() - i);
                      days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
                    }
                    const weekDone = tasks.filter(t => t.status === 'done' && t.completedAt && days.has(
                      `${new Date(t.completedAt).getFullYear()}-${new Date(t.completedAt).getMonth()}-${new Date(t.completedAt).getDate()}`
                    )).length;
                    const weekTotal = tasks.filter(t => {
                      const d = t.due ? new Date(t.due) : (t.completedAt ? new Date(t.completedAt) : null);
                      if (!d) return false;
                      return days.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
                    }).length;
                    return `${weekDone}/${weekTotal} done`;
                  })()}
                </span>
              </div>
              <div className="space-y-2.5">
                {(() => {
                  const now = new Date();
                  const todayIdx = (now.getDay() + 6) % 7;
                  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  return dayNames.map((dayName, idx) => {
                    const date = new Date(now);
                    date.setDate(date.getDate() - (todayIdx - idx));
                    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                    const dayTasks = tasks.filter(t => {
                      const d = t.due ? new Date(t.due) : (t.completedAt ? new Date(t.completedAt) : null);
                      if (!d) return false;
                      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === dateKey;
                    });
                    const done = dayTasks.filter(t => t.status === 'done').length;
                    const total = dayTasks.length;
                    const isToday = idx === todayIdx;
                    const maxStones = Math.max(total, 1);
                    const stoneArray = Array.from({ length: Math.min(maxStones, 8) }, (_, i) => i < done);
                    return (
                      <div key={dayName} className={`flex items-center gap-2.5 ${isToday ? 'bg-primary/5 -mx-2 px-2 py-1.5 rounded-lg border border-primary/10' : ''}`}>
                        <span className={`w-8 text-[11px] font-mono text-right ${isToday ? 'text-white font-bold' : 'text-muted-foreground'}`}>{dayName}</span>
                        <div className="flex-1 flex gap-1">
                          {stoneArray.length === 0 ? (
                            <div className="h-2 flex-1 rounded bg-section border border-border/50" />
                          ) : (
                            stoneArray.map((isDoneStone, i) => (
                              <div
                                key={i}
                                className="h-2 flex-1 rounded transition-all duration-300"
                                style={{
                                  background: isDoneStone ? '#22c55e' : '#1a1a24',
                                  border: isDoneStone ? 'none' : '1px solid #2a2a38',
                                  boxShadow: isDoneStone ? '0 0 6px rgba(34,197,94,0.4)' : 'none',
                                }}
                              />
                            ))
                          )}
                        </div>
                        <span className={`w-10 text-[10px] font-mono text-right ${isToday ? 'text-white font-bold' : 'text-muted-foreground'}`}>
                          {done}/{total || '-'}{isToday && done === total && total > 0 && ' ✓'}{isToday && total > 0 && done < total && ' ⚡'}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex gap-3 pt-1 border-t border-border/50">
                <span className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
                  <span className="w-2.5 h-1.5 rounded" style={{ background: '#22c55e', boxShadow: '0 0 4px rgba(34,197,94,0.4)' }} />Done
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
                  <span className="w-2.5 h-1.5 rounded" style={{ background: '#1a1a24', border: '1px solid #2a2a38' }} />Pending
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground text-center pt-1">Tap a task to see details</div>
            </div>
          )}
          <div className="widget">
            <div className="widget-title mb-3">Smart Nudges</div>
            <div className="space-y-2">
              {tasks.filter(isAtRisk).slice(0, 4).map(t => (
                <div key={t.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-warning/5 border border-warning/20">
                  <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-[10px] font-mono text-warning">at risk</span>
                </div>
              ))}
              {tasks.filter(isAtRisk).length === 0 && (
                <div className="text-xs text-muted-foreground py-2 text-center">All clear ✨</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              onSubmit={submit}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="relative bg-widget border border-border rounded-xl p-5 w-full max-w-md space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> New Task
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="p-1 rounded-md hover:bg-hover text-muted-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  ref={titleRef}
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  maxLength={140}
                  className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all placeholder:text-muted-foreground/40"
                />

                <textarea
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  placeholder="Add notes..."
                  maxLength={500}
                  rows={2}
                  className="w-full bg-section border border-border rounded-lg px-3 py-2 text-xs focus:border-primary outline-none resize-none transition-all placeholder:text-muted-foreground/40"
                />
              </div>

              <div className="space-y-4 pt-1">
                {/* Schedule Row */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Schedule</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'flex-1 flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-section text-xs transition-all hover:border-primary/40',
                              !draft.due && 'text-muted-foreground'
                            )}
                          >
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                            <span>{draftDateObj ? format(draftDateObj, 'MMM d, yyyy') : 'No Date'}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[60]" align="start">
                          <Calendar
                            mode="single"
                            selected={draftDateObj}
                            onSelect={(d) => {
                              if (d) setDraft(dr => ({ ...dr, due: toDateStr(d) }));
                              setCalendarOpen(false);
                            }}
                            initialFocus
                            className="p-2 bg-widget border-border shadow-2xl rounded-xl"
                          />
                        </PopoverContent>
                      </Popover>

                      <div className="flex items-center bg-section border border-border rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, allDay: !d.allDay }))}
                          className={cn(
                            "h-7 px-3 rounded-md text-[10px] font-bold uppercase transition-all",
                            draft.allDay
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          All Day
                        </button>
                        {!draft.allDay && (
                          <input
                            type="time"
                            value={draft.dueTime}
                            onChange={e => setDraft(d => ({ ...d, dueTime: e.target.value }))}
                            className="bg-transparent border-none text-[10px] px-2 py-1 outline-none w-20"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {[{ l: 'Today', d: 0 }, { l: 'Tomorrow', d: 1 }, { l: 'Mon', d: (8 - new Date().getDay()) % 7 || 7 }].map(q => (
                        <button
                          key={q.l}
                          type="button"
                          onClick={() => setQuickDate(q.d)}
                          className="px-2 py-0.5 text-[9px] rounded-md border border-border bg-section text-muted-foreground hover:border-primary/40 transition-colors whitespace-nowrap"
                        >
                          {q.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Priority */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Priority</label>
                    <div className="flex bg-section p-0.5 rounded-lg border border-border">
                      {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, priority: p }))}
                          className={cn(
                            'flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border',
                            draft.priority === p
                              ? p === 'high' ? 'bg-destructive border-destructive text-white shadow-sm shadow-destructive/20'
                                : p === 'medium' ? 'bg-warning border-warning text-black shadow-sm shadow-warning/20'
                                  : 'bg-primary border-primary text-white shadow-sm shadow-primary/20'
                              : 'bg-transparent border-border text-muted-foreground hover:bg-hover hover:border-muted-foreground/30'
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-0.5">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleDraftTag(tag)}
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[9px] border transition-all',
                            draft.tags.includes(tag)
                              ? 'bg-primary/20 text-primary border-primary/30'
                              : 'bg-section border-border text-muted-foreground hover:border-primary/30'
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium border border-border hover:bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-primary text-primary-foreground py-2 rounded-lg text-xs font-bold shadow-lg shadow-primary/10 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Task
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative bg-widget border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">Reset Task Data?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                This will permanently delete all tasks and reset custom tags. Notes, habits, and other data will not be affected. This action cannot be undone.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resetTaskData();
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 bg-destructive text-white py-2 rounded-lg text-xs font-bold shadow-lg shadow-destructive/20 hover:brightness-110 transition-all"
                >
                  Yes, Reset Tasks
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailPanel({
  task, allTags, onClose, onUpdate, onStatus,
}: {
  task: Task;
  allTags: string[];
  onClose: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onStatus: (s: TaskStatus) => void;
}) {
  const overdue = isOverdue(task);
  const atRisk = isAtRisk(task);
  return (
    <div className="widget space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="widget-title mb-1">Task Details</div>
          <input
            value={task.title}
            onChange={e => onUpdate({ title: e.target.value })}
            className="bg-transparent text-sm font-medium w-full outline-none border-b border-transparent focus:border-primary/40 pb-1"
          />
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {(overdue || atRisk) && (
        <div className={cn(
          'flex items-center gap-2 text-xs p-2 rounded-md border',
          overdue ? 'bg-destructive/10 border-destructive/30 text-destructive' : 'bg-warning/10 border-warning/30 text-warning'
        )}>
          <AlertTriangle className="w-3.5 h-3.5" />
          {overdue ? 'This task is overdue' : 'At risk — touch it soon or it slips'}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {(['pending', 'in_progress', 'done'] as TaskStatus[]).map(s => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={cn(
              'px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
              task.status === s
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-section border border-border text-muted-foreground hover:border-primary/30'
            )}
          >
            {statusMeta[s].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Notes</label>
        <textarea
          value={task.description ?? ''}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="Add specific details about this task..."
          rows={3}
          className="w-full bg-section border border-border rounded-xl px-3 py-2.5 text-xs focus:border-primary outline-none resize-none transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Priority</label>
          <div className="flex bg-section p-0.5 rounded-lg border border-border">
            {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
              <button
                key={p}
                onClick={() => onUpdate({ priority: p })}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all',
                  task.priority === p
                    ? p === 'high' ? 'bg-destructive text-white'
                      : p === 'medium' ? 'bg-warning text-black'
                        : 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-hover'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Deadline</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal text-[10px] h-9 bg-section border-border rounded-lg',
                  !task.due && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3 text-primary" />
                {task.due ? format(new Date(task.due), 'MMM d, yyyy') : 'No date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[60]" align="end">
              <Calendar
                mode="single"
                selected={task.due ? new Date(task.due) : undefined}
                onSelect={(d) => {
                  if (d) {
                    const current = task.due ? new Date(task.due) : new Date();
                    current.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                    onUpdate({ due: current.toISOString() });
                  } else {
                    onUpdate({ due: undefined });
                  }
                }}
                initialFocus
                className="p-2 bg-widget border-border shadow-2xl rounded-xl"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-center justify-between p-2.5 bg-section rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-semibold">Time Sensitive</span>
        </div>
        <div className="flex items-center gap-2">
          {!task.allDay && (
            <input
              type="time"
              value={task.due ? new Date(task.due).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
              onChange={e => {
                const [h, m] = e.target.value.split(':');
                const d = task.due ? new Date(task.due) : new Date();
                d.setHours(Number(h), Number(m));
                onUpdate({ due: d.toISOString(), allDay: false });
              }}
              className="bg-widget border border-border rounded px-1.5 py-1 text-[10px] outline-none focus:border-primary"
            />
          )}
          <button
            onClick={() => onUpdate({ allDay: !task.allDay })}
            className={cn(
              "px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all",
              task.allDay ? "bg-primary/20 text-primary border border-primary/20" : "bg-hover text-muted-foreground border border-transparent"
            )}
          >
            {task.allDay ? 'All Day' : 'Timed'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Tags</label>
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-0.5">
          {allTags.map((tag: string) => {
            const on = task.tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() =>
                  onUpdate({ tags: on ? task.tags.filter(x => x !== tag) : [...task.tags, tag] })
                }
                className={cn(
                  'px-2.5 py-1 text-[10px] rounded-lg font-medium border transition-all',
                  on ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-section border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}