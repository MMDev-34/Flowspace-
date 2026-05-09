import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due?: string;
  completedAt?: string;
  tags: string[];
}

export type LogType = 'info' | 'task' | 'pomodoro' | 'system' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  category: string;
  msg: string;
}

export interface PomoSession {
  id: string;
  phase: 'focus' | 'break';
  durationMin: number;
  completedAt: string;
}

export type PomoPhase = 'focus' | 'break';

export interface QuickCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
  createdAt: string;
}

export interface QuickLink {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  icon: string;
  order: number;
  createdAt: string;
  clickCount: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  color: string;
  taskId?: string;
  reminder: boolean;
  category: 'event' | 'task' | 'reminder';
  recurrence?: 'daily' | 'weekly' | 'monthly' | null;
  recurringEndDate?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;        // HTML content (Lexical)
  tags: string[];
  pinned: boolean;
  starred: boolean;
  deleted: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
}

export interface ForgeItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'daily' | 'target';
  streak: number;
  bestStreak: number;
  completions: Record<string, boolean>;
  targetCount?: number;
  currentCount?: number;
  unit?: string;
  reminder?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// APP STATE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

interface AppState {
  // Core data
  tasks: Task[];
  logs: LogEntry[];
  pomoHistory: PomoSession[];
  quickCategories: QuickCategory[];
  quickLinks: QuickLink[];
  calendarEvents: CalendarEvent[];
  notes: Note[];
  noteFolders: NoteFolder[];
  forgeItems: ForgeItem[];

  // Settings
  pomoFocusMin: number;
  pomoBreakMin: number;
  pomoPhase: PomoPhase;
  pomoSeconds: number;
  pomoRunning: boolean;
  pomoSession: number;
  weatherCity: string;
  themeMode: 'light' | 'dark';

  // ── Task actions ──────────────────────────────────────────────────────────
  addTask: (task: Omit<Task, 'id' | 'status' | 'completedAt'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;

  // ── Log actions ───────────────────────────────────────────────────────────
  log: (type: LogType, msg: string, category: string) => void;
  clearLogs: () => void;

  // ── Quick Access actions ──────────────────────────────────────────────────
  addQuickCategory: (name: string, icon: string) => void;
  deleteQuickCategory: (id: string) => void;
  addQuickLink: (categoryId: string, name: string, url: string, icon: string) => void;
  deleteQuickLink: (id: string) => void;
  reorderLinks: (categoryId: string, orderedIds: string[]) => void;
  updateQuickLink: (id: string, patch: Partial<QuickLink>) => void;
  incrementClickCount: (id: string) => void;

  // ── Calendar actions ──────────────────────────────────────────────────────
  addCalendarEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  // ── Notes actions ─────────────────────────────────────────────────────────
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
  permanentDeleteNote: (id: string) => void;
  addNoteFolder: (folder: Omit<NoteFolder, 'id' | 'order'>) => void;
  deleteNoteFolder: (id: string) => void;

  // ── Forge actions ─────────────────────────────────────────────────────────
  addForgeItem: (item: Omit<ForgeItem, 'id' | 'streak' | 'bestStreak' | 'completions' | 'currentCount' | 'order' | 'createdAt' | 'updatedAt'>) => void;
  updateForgeItem: (id: string, patch: Partial<ForgeItem>) => void;
  deleteForgeItem: (id: string) => void;
  toggleForgeItem: (id: string) => void;
  incrementTarget: (id: string) => void;
  reorderForgeItems: (orderedIds: string[]) => void;

  // ── Pomodoro actions ──────────────────────────────────────────────────────
  setPomoSettings: (focus: number, breakMin: number) => void;
  addPomoSession: (session: Omit<PomoSession, 'id' | 'completedAt'>) => void;
  togglePomo: () => void;
  resetPomo: () => void;
  switchPomoPhase: (phase: PomoPhase) => void;

  // ── Settings actions ──────────────────────────────────────────────────────
  setThemeMode: (mode: 'light' | 'dark') => void;
  setWeatherCity: (city: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const generateId = (): string => Math.random().toString(36).substring(2, 11);

/** Generate realistic-looking dummy completions for Forge habits */
const generateDummyCompletions = (probability: number): Record<string, boolean> => {
  const completions: Record<string, boolean> = {};
  for (let i = 0; i < 35; i++) {
    const p = i < 2 ? probability + 0.3 : probability;
    if (Math.random() < p) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      completions[d.toISOString().split('T')[0]] = true;
    }
  }
  return completions;
};

// ─────────────────────────────────────────────────────────────────────────────
// POMODORO TIMER (module-level)
// ─────────────────────────────────────────────────────────────────────────────

let timerInterval: number | null = null;

const stopTimer = (): void => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const startTimer = (
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
): void => {
  stopTimer();

  timerInterval = window.setInterval(() => {
    const state = get();
    const secs = state.pomoSeconds;
    const phase = state.pomoPhase;
    const session = state.pomoSession;

    if (secs <= 1) {
      // Session complete
      const completedDur = phase === 'focus' ? state.pomoFocusMin : state.pomoBreakMin;
      const newSession: PomoSession = {
        id: generateId(),
        phase,
        durationMin: completedDur,
        completedAt: new Date().toISOString(),
      };
      set({ pomoHistory: [...state.pomoHistory, newSession] });

      set({
        logs: [...state.logs, {
          id: generateId(),
          timestamp: new Date().toISOString(),
          type: 'pomodoro',
          category: 'Pomodoro',
          msg: `${phase === 'focus' ? 'Focus' : 'Break'} session completed (${completedDur}m)`,
        }],
      });

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${phase === 'focus' ? 'Focus' : 'Break'} complete!`, {
          body: phase === 'focus' ? 'Time for a break.' : 'Back to focus.',
        });
      }

      const nextPhase: PomoPhase = phase === 'focus' ? 'break' : 'focus';
      const nextTotal = (nextPhase === 'focus' ? state.pomoFocusMin : state.pomoBreakMin) * 60;
      const nextSession = nextPhase === 'focus' ? session + 1 : session;

      set({
        pomoPhase: nextPhase,
        pomoSeconds: nextTotal,
        pomoRunning: false,
        pomoSession: nextSession,
      });
      stopTimer();
    } else {
      set({ pomoSeconds: secs - 1 });
    }
  }, 1000);
};

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({

      // ── Initial state ─────────────────────────────────────────────────────

      tasks: [],
      logs: [],
      pomoHistory: [],
      pomoFocusMin: 25,
      pomoBreakMin: 5,
      pomoPhase: 'focus',
      pomoSeconds: 25 * 60,
      pomoRunning: false,
      pomoSession: 1,
      weatherCity: 'Bangalore',
      themeMode: 'dark',

      // Quick Access
      quickCategories: [
        { id: 'dev', name: 'Development', icon: '💻', order: 0, createdAt: new Date().toISOString() },
        { id: 'design', name: 'Design', icon: '🎨', order: 1, createdAt: new Date().toISOString() },
        { id: 'social', name: 'Social', icon: '📱', order: 2, createdAt: new Date().toISOString() },
      ],
      quickLinks: [
        { id: 'l1', categoryId: 'dev', name: 'GitHub', url: 'https://github.com', icon: '🐙', order: 0, createdAt: new Date().toISOString(), clickCount: 0 },
        { id: 'l2', categoryId: 'dev', name: 'StackOverflow', url: 'https://stackoverflow.com', icon: '🔧', order: 1, createdAt: new Date().toISOString(), clickCount: 0 },
        { id: 'l3', categoryId: 'dev', name: 'npm', url: 'https://npmjs.com', icon: '📦', order: 2, createdAt: new Date().toISOString(), clickCount: 0 },
        { id: 'l4', categoryId: 'design', name: 'Figma', url: 'https://figma.com', icon: '🎨', order: 0, createdAt: new Date().toISOString(), clickCount: 0 },
        { id: 'l5', categoryId: 'design', name: 'Unsplash', url: 'https://unsplash.com', icon: '🖼️', order: 1, createdAt: new Date().toISOString(), clickCount: 0 },
        { id: 'l6', categoryId: 'social', name: 'Gmail', url: 'https://gmail.com', icon: '📧', order: 0, createdAt: new Date().toISOString(), clickCount: 0 },
        { id: 'l7', categoryId: 'social', name: 'Twitter', url: 'https://twitter.com', icon: '🐦', order: 1, createdAt: new Date().toISOString(), clickCount: 0 },
      ],

      // Calendar
      calendarEvents: [
        { id: 'e1', title: 'Client Meeting', startDate: '2026-05-13', startTime: '10:00', endTime: '11:00', allDay: false, color: '#ef4444', reminder: true, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e2', title: 'Team Standup', startDate: '2026-05-13', startTime: '14:00', endTime: '14:30', allDay: false, color: '#22c55e', reminder: true, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e3', title: 'Code Review', startDate: '2026-05-13', startTime: '16:00', endTime: '17:00', allDay: false, color: '#3b82f6', reminder: false, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e4', title: 'Sprint Planning', startDate: '2026-05-15', startTime: '09:00', endTime: '10:30', allDay: false, color: '#00d4ff', reminder: true, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e5', title: 'Design Review', startDate: '2026-05-15', allDay: true, color: '#8b5cf6', reminder: false, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e6', title: 'Buy groceries', startDate: '2026-05-13', startTime: '18:00', endTime: '18:30', allDay: false, color: '#f59e0b', reminder: true, category: 'reminder', createdAt: new Date().toISOString() },
      ],

      // Notes
      noteFolders: [],
      notes: [
        { id: 'seed1', title: 'Project Kickoff Notes', body: '<h1>Project Kickoff</h1><p>Key decisions made during the kickoff meeting. Timeline confirmed for Q2 delivery.</p><ul><li>Design review by May 15</li><li>Dev sprint starts May 20</li><li>Beta launch June 10</li></ul>', tags: ['work', 'planning'], pinned: true, starred: false, deleted: false, wordCount: 32, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date(Date.now() - 3600000).toISOString() },
        { id: 'seed2', title: 'Books to Read This Year', body: '<p>A curated list of books I want to finish before December.</p><ul><li>Atomic Habits — James Clear</li><li>Deep Work — Cal Newport</li><li>The Alchemist — Paulo Coelho</li><li>Thinking Fast and Slow — Kahneman</li></ul>', tags: ['reading', 'personal'], pinned: false, starred: true, deleted: false, wordCount: 28, createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), updatedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'seed3', title: 'Weekend Recipe Ideas', body: '<p>Trying some new recipes this weekend. Need to grab ingredients Saturday morning.</p><p>Ideas: pasta carbonara, homemade pizza, banana bread for dessert. Maybe try that Thai curry too.</p>', tags: ['personal', 'food'], pinned: false, starred: false, deleted: false, wordCount: 30, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 7200000).toISOString() },
        { id: 'seed4', title: 'Daily Standup Template', body: '<h2>Standup Format</h2><p><strong>Yesterday:</strong> What did I complete?</p><p><strong>Today:</strong> What will I work on?</p><p><strong>Blockers:</strong> Anything slowing me down?</p><blockquote>Keep it under 2 minutes.</blockquote>', tags: ['work', 'templates'], pinned: false, starred: false, deleted: false, wordCount: 24, createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: 'seed5', title: 'Old Draft — Archive', body: '<p>This was an old draft that never got finished. Moving to trash for cleanup.</p>', tags: ['archive'], pinned: false, starred: false, deleted: true, wordCount: 16, createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 14).toISOString() },
      ],

      // Forge
      forgeItems: [
        { id: 'f1', name: 'Morning run', icon: '🏃', color: '#22c55e', type: 'daily', streak: 23, bestStreak: 45, completions: generateDummyCompletions(0.8), order: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f2', name: 'Meditate 10min', icon: '🧘', color: '#8b5cf6', type: 'daily', streak: 15, bestStreak: 30, completions: generateDummyCompletions(0.6), order: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f3', name: '8 glasses water', icon: '💧', color: '#3b82f6', type: 'daily', streak: 0, bestStreak: 12, completions: generateDummyCompletions(0.3), order: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f4', name: 'Read 30 minutes', icon: '📖', color: '#f59e0b', type: 'daily', streak: 42, bestStreak: 42, completions: generateDummyCompletions(0.9), order: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f5', name: 'Journal writing', icon: '✍️', color: '#ec4899', type: 'daily', streak: 3, bestStreak: 20, completions: generateDummyCompletions(0.4), order: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f6', name: 'No social media', icon: '🚫', color: '#ef4444', type: 'daily', streak: 8, bestStreak: 15, completions: generateDummyCompletions(0.7), order: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f7', name: 'Sleep by 11pm', icon: '😴', color: '#14b8a6', type: 'daily', streak: 12, bestStreak: 25, completions: generateDummyCompletions(0.5), order: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f8', name: 'Read 12 books this year', icon: '📚', color: '#f59e0b', type: 'target', streak: 0, bestStreak: 0, completions: {}, targetCount: 12, currentCount: 3, unit: 'books', order: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f9', name: 'Exercise 100 times', icon: '💪', color: '#22c55e', type: 'target', streak: 0, bestStreak: 0, completions: {}, targetCount: 100, currentCount: 45, unit: 'times', order: 8, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],

      // ── Task actions ──────────────────────────────────────────────────────
      addTask: (taskData) => {
        const task: Task = { ...taskData, id: generateId(), status: 'pending', completedAt: undefined };
        set((s) => ({ tasks: [...s.tasks, task] }));
        get().log('task', `Task "${task.title}" added`, 'Task');
      },
      updateTask: (id, patch) => {
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      },
      setTaskStatus: (id, status) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const done = status === 'done' && t.status !== 'done';
            return { ...t, status, completedAt: done ? new Date().toISOString() : t.completedAt };
          }),
        }));
        get().log('task', `"${task.title}" → ${status}`, 'Task');
      },
      deleteTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (task) get().log('task', `Task "${task.title}" deleted`, 'Task');
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      },

      // ── Log actions ───────────────────────────────────────────────────────
      log: (type, msg, category) => {
        set((s) => ({ logs: [...s.logs, { id: generateId(), timestamp: new Date().toISOString(), type, category, msg }] }));
      },
      clearLogs: () => set({ logs: [] }),

      // ── Quick Access ──────────────────────────────────────────────────────
      addQuickCategory: (name, icon) => {
        const cat: QuickCategory = { id: generateId(), name, icon, order: get().quickCategories.length, createdAt: new Date().toISOString() };
        set((s) => ({ quickCategories: [...s.quickCategories, cat] }));
      },
      deleteQuickCategory: (id) => {
        set((s) => ({ quickCategories: s.quickCategories.filter((c) => c.id !== id), quickLinks: s.quickLinks.filter((l) => l.categoryId !== id) }));
      },
      addQuickLink: (categoryId, name, url, icon) => {
        const catLinks = get().quickLinks.filter((l) => l.categoryId === categoryId);
        if (catLinks.length >= 10) return;
        const link: QuickLink = { id: generateId(), categoryId, name, url: url.startsWith('http') ? url : `https://${url}`, icon, order: catLinks.length, createdAt: new Date().toISOString(), clickCount: 0 };
        set((s) => ({ quickLinks: [...s.quickLinks, link] }));
      },
      deleteQuickLink: (id) => set((s) => ({ quickLinks: s.quickLinks.filter((l) => l.id !== id) })),
      reorderLinks: (categoryId, orderedIds) => {
        set((s) => ({ quickLinks: s.quickLinks.map((l) => (l.categoryId === categoryId ? { ...l, order: orderedIds.indexOf(l.id) } : l)) }));
      },
      updateQuickLink: (id, patch) => set((s) => ({ quickLinks: s.quickLinks.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      incrementClickCount: (id) => set((s) => ({ quickLinks: s.quickLinks.map((l) => (l.id === id ? { ...l, clickCount: l.clickCount + 1 } : l)) })),

      // ── Calendar ──────────────────────────────────────────────────────────
      addCalendarEvent: (event) => {
        const ev: CalendarEvent = { ...event, id: generateId(), createdAt: new Date().toISOString() };
        set((s) => ({ calendarEvents: [...s.calendarEvents, ev] }));
      },
      updateCalendarEvent: (id, patch) => set((s) => ({ calendarEvents: s.calendarEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      deleteCalendarEvent: (id) => set((s) => ({ calendarEvents: s.calendarEvents.filter((e) => e.id !== id) })),

      // ── Notes ─────────────────────────────────────────────────────────────
      addNote: (note) => {
        const n: Note = { ...note, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((s) => ({ notes: [n, ...s.notes] }));
      },
      updateNote: (id, patch) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)) })),
      trashNote: (id) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, deleted: true, updatedAt: new Date().toISOString() } : n)) })),
      restoreNote: (id) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, deleted: false, updatedAt: new Date().toISOString() } : n)) })),
      permanentDeleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      addNoteFolder: (folder) => {
        const f: NoteFolder = { ...folder, id: generateId(), order: get().noteFolders.length };
        set((s) => ({ noteFolders: [...s.noteFolders, f] }));
      },
      deleteNoteFolder: (id) => set((s) => ({ noteFolders: s.noteFolders.filter((f) => f.id !== id) })),

      // ── Forge ─────────────────────────────────────────────────────────────
      addForgeItem: (item) => {
        const fi: ForgeItem = { ...item, id: generateId(), streak: 0, bestStreak: 0, completions: {}, currentCount: 0, order: get().forgeItems.length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((s) => ({ forgeItems: [...s.forgeItems, fi] }));
      },
      updateForgeItem: (id, patch) => set((s) => ({ forgeItems: s.forgeItems.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i)) })),
      deleteForgeItem: (id) => set((s) => ({ forgeItems: s.forgeItems.filter((i) => i.id !== id) })),
      toggleForgeItem: (id) => {
        const today = new Date().toISOString().split('T')[0];
        set((s) => ({
          forgeItems: s.forgeItems.map((i) => {
            if (i.id !== id) return i;
            const done = i.completions[today];
            const next = { ...i.completions };
            done ? delete next[today] : (next[today] = true);
            const newStreak = done ? 0 : i.streak + 1;
            return { ...i, completions: next, streak: newStreak, bestStreak: Math.max(i.bestStreak, newStreak), updatedAt: new Date().toISOString() };
          }),
        }));
      },
      incrementTarget: (id) => set((s) => ({
        forgeItems: s.forgeItems.map((i) => (i.id === id && i.type === 'target' ? { ...i, currentCount: Math.min((i.currentCount ?? 0) + 1, i.targetCount ?? 1), updatedAt: new Date().toISOString() } : i)),
      })),
      reorderForgeItems: (orderedIds) => set((s) => ({
        forgeItems: s.forgeItems.map((i) => ({ ...i, order: orderedIds.indexOf(i.id) })),
      })),

      // ── Pomodoro ──────────────────────────────────────────────────────────
      setPomoSettings: (focus, breakMin) => {
        const s = get();
        if (s.pomoFocusMin === focus && s.pomoBreakMin === breakMin) return;
        stopTimer();
        set({ pomoFocusMin: focus, pomoBreakMin: breakMin, pomoSeconds: (s.pomoPhase === 'focus' ? focus : breakMin) * 60, pomoRunning: false });
      },
      addPomoSession: (session) => {
        set((s) => ({ pomoHistory: [...s.pomoHistory, { ...session, id: generateId(), completedAt: new Date().toISOString() }] }));
      },
      togglePomo: () => {
        const s = get();
        if (s.pomoRunning) { stopTimer(); set({ pomoRunning: false }); }
        else {
          if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
          set({ pomoRunning: true });
          startTimer(set, get);
        }
      },
      resetPomo: () => { stopTimer(); set({ pomoPhase: 'focus', pomoSeconds: get().pomoFocusMin * 60, pomoRunning: false, pomoSession: 1 }); },
      switchPomoPhase: (phase) => { stopTimer(); set({ pomoPhase: phase, pomoSeconds: (phase === 'focus' ? get().pomoFocusMin : get().pomoBreakMin) * 60, pomoRunning: false }); },

      // ── Settings ──────────────────────────────────────────────────────────
      setThemeMode: (mode) => set({ themeMode: mode }),
      setWeatherCity: (city) => set({ weatherCity: city }),
    }),

    {
      name: 'productivity-dashboard-storage',
      onRehydrateStorage: (state) => {
        if (!state) return;

        // Migrate old notes to new schema
        state.notes = (state.notes ?? []).map((n: any) => ({
          ...n,
          body: n.body ?? n.content ?? '',
          tags: Array.isArray(n.tags) ? n.tags : [],
          starred: n.starred ?? false,
          deleted: n.deleted ?? false,
          wordCount: n.wordCount ?? 0,
        }));

        // Inject dummy completions for Forge if missing
        if (state.forgeItems?.length > 0) {
          const totalCompletions = state.forgeItems.reduce((acc: number, item: any) => acc + Object.keys(item.completions ?? {}).length, 0);
          if (totalCompletions === 0) {
            state.forgeItems = state.forgeItems.map((item: any) => {
              if (item.type === 'daily') return { ...item, completions: generateDummyCompletions(0.5) };
              return item;
            });
          }
        }

        // Resume Pomodoro if was running
        if (state.pomoRunning) {
          startTimer(useAppStore.setState, useAppStore.getState);
        }
      },
    },
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// TASK HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function isOverdue(task: Task): boolean {
  if (!task.due || task.status === 'done') return false;
  return new Date(task.due) < new Date();
}

export function isAtRisk(task: Task): boolean {
  if (!task.due || task.status === 'done') return false;
  const diffHours = (new Date(task.due).getTime() - Date.now()) / 3600000;
  return diffHours <= 24 && diffHours > 0;
}

export function effectivePriority(task: Task): TaskPriority {
  if (isOverdue(task)) return 'high';
  if (isAtRisk(task)) return task.priority === 'low' ? 'medium' : task.priority;
  return task.priority;
}

export function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function isUpcoming(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return d > tomorrow;
}