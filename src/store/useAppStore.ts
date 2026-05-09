import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface NoteFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  starred: boolean;
  deleted: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
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
// Module-level variable for the timer interval (cannot be in Zustand state)
let timerInterval: number | null = null;

interface AppState {
  tasks: Task[];
  logs: LogEntry[];
  pomoHistory: PomoSession[];
  pomoFocusMin: number;
  pomoBreakMin: number;
  pomoPhase: PomoPhase;
  pomoSeconds: number;
  pomoRunning: boolean;
  pomoSession: number;
  weatherCity: string;
  quickCategories: QuickCategory[];
  quickLinks: QuickLink[];
  calendarEvents: CalendarEvent[];
  notes: Note[];
  noteFolders: NoteFolder[];
  forgeItems: ForgeItem[];


  addForgeItem: (item: Omit<ForgeItem, 'id' | 'streak' | 'bestStreak' | 'completions' | 'currentCount' | 'order' | 'createdAt' | 'updatedAt'>) => void;
  updateForgeItem: (id: string, patch: Partial<ForgeItem>) => void;
  deleteForgeItem: (id: string) => void;
  toggleForgeItem: (id: string) => void;
  incrementTarget: (id: string) => void;
  reorderForgeItems: (orderedIds: string[]) => void;
  addNoteFolder: (folder: Omit<NoteFolder, 'id' | 'order'>) => void;
  deleteNoteFolder: (id: string) => void;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
  permanentDeleteNote: (id: string) => void;
  emptyTrash: () => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  setWeatherCity: (city: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'status' | 'completedAt'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  log: (type: LogType, msg: string, category: string) => void;
  clearLogs: () => void;
  addQuickCategory: (name: string, icon: string) => void;
  deleteQuickCategory: (id: string) => void;
  addQuickLink: (categoryId: string, name: string, url: string, icon: string) => void;
  deleteQuickLink: (id: string) => void;
  reorderLinks: (categoryId: string, orderedIds: string[]) => void;
  updateQuickLink: (id: string, patch: Partial<QuickLink>) => void;
  incrementClickCount: (id: string) => void;
  setPomoSettings: (focus: number, breakMin: number) => void;
  addPomoSession: (session: Omit<PomoSession, 'id' | 'completedAt'>) => void;
  togglePomo: () => void;
  resetPomo: () => void;
  switchPomoPhase: (phase: PomoPhase) => void;

}

const generateId = () => Math.random().toString(36).substring(2, 11);

const startTimer = (set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void, get: () => AppState) => {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = window.setInterval(() => {
    const state = get();
    const currentSeconds = state.pomoSeconds;
    const currentPhase = state.pomoPhase;
    const currentSession = state.pomoSession;

    if (currentSeconds <= 1) {
      // Session complete
      const completedDur = currentPhase === 'focus' ? state.pomoFocusMin : state.pomoBreakMin;
      const newSession: PomoSession = {
        id: generateId(),
        phase: currentPhase,
        durationMin: completedDur,
        completedAt: new Date().toISOString(),
      };
      set({ pomoHistory: [...state.pomoHistory, newSession] });

      // Log
      const logEntry: LogEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'pomodoro',
        category: 'Pomodoro',
        msg: `${currentPhase === 'focus' ? 'Focus' : 'Break'} session completed (${completedDur}m)`,
      };
      set({ logs: [...state.logs, logEntry] });

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${currentPhase === 'focus' ? 'Focus' : 'Break'} complete!`, {
          body: currentPhase === 'focus' ? 'Time for a break.' : 'Back to focus.',
        });
      }

      // Switch phase
      const nextPhase: PomoPhase = currentPhase === 'focus' ? 'break' : 'focus';
      const nextTotal = (nextPhase === 'focus' ? state.pomoFocusMin : state.pomoBreakMin) * 60;
      const nextSession = nextPhase === 'focus' ? currentSession + 1 : currentSession;

      set({
        pomoPhase: nextPhase,
        pomoSeconds: nextTotal,
        pomoRunning: false,
        pomoSession: nextSession,
      });
      stopTimer();
    } else {
      set({ pomoSeconds: currentSeconds - 1 });
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
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


      forgeItems: [
        { id: 'f1', name: 'Morning run', icon: '🏃', color: '#22c55e', type: 'daily', streak: 23, bestStreak: 45, completions: {}, order: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f2', name: 'Meditate 10min', icon: '🧘', color: '#8b5cf6', type: 'daily', streak: 15, bestStreak: 30, completions: {}, order: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f3', name: '8 glasses water', icon: '💧', color: '#3b82f6', type: 'daily', streak: 0, bestStreak: 12, completions: {}, order: 2, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f4', name: 'Read 30 minutes', icon: '📖', color: '#f59e0b', type: 'daily', streak: 42, bestStreak: 42, completions: {}, order: 3, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f5', name: 'Journal writing', icon: '✍️', color: '#ec4899', type: 'daily', streak: 3, bestStreak: 20, completions: {}, order: 4, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f6', name: 'No social media', icon: '🚫', color: '#ef4444', type: 'daily', streak: 8, bestStreak: 15, completions: {}, order: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f7', name: 'Sleep by 11pm', icon: '😴', color: '#14b8a6', type: 'daily', streak: 12, bestStreak: 25, completions: {}, order: 6, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f8', name: 'Read 12 books this year', icon: '📚', color: '#f59e0b', type: 'target', streak: 0, bestStreak: 0, completions: {}, targetCount: 12, currentCount: 3, unit: 'books', order: 7, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'f9', name: 'Exercise 100 times', icon: '💪', color: '#22c55e', type: 'target', streak: 0, bestStreak: 0, completions: {}, targetCount: 100, currentCount: 45, unit: 'times', order: 8, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
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

      calendarEvents: [
        { id: 'e1', title: 'Client Meeting', startDate: '2026-05-13', startTime: '10:00', endTime: '11:00', allDay: false, color: '#ef4444', reminder: true, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e2', title: 'Team Standup', startDate: '2026-05-13', startTime: '14:00', endTime: '14:30', allDay: false, color: '#22c55e', reminder: true, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e3', title: 'Code Review', startDate: '2026-05-13', startTime: '16:00', endTime: '17:00', allDay: false, color: '#3b82f6', reminder: false, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e4', title: 'Sprint Planning', startDate: '2026-05-15', startTime: '09:00', endTime: '10:30', allDay: false, color: '#00d4ff', reminder: true, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e5', title: 'Design Review', startDate: '2026-05-15', allDay: true, color: '#8b5cf6', reminder: false, category: 'event', createdAt: new Date().toISOString() },
        { id: 'e6', title: 'Buy groceries', startDate: '2026-05-13', startTime: '18:00', endTime: '18:30', allDay: false, color: '#f59e0b', reminder: true, category: 'reminder', createdAt: new Date().toISOString() },
      ],
      themeMode: 'dark',
      noteFolders: [],
      notes: [
        {
          id: 'seed1',
          title: 'Project Kickoff Notes',
          body: '<h1>Project Kickoff</h1><p>Key decisions made during the kickoff meeting. Timeline confirmed for Q2 delivery.</p><ul><li>Design review by May 15</li><li>Dev sprint starts May 20</li><li>Beta launch June 10</li></ul>',
          tags: ['work', 'planning'],
          pinned: true,
          starred: false,
          deleted: false,
          wordCount: 32,
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'seed2',
          title: 'Books to Read This Year',
          body: '<p>A curated list of books I want to finish before December.</p><ul><li>Atomic Habits — James Clear</li><li>Deep Work — Cal Newport</li><li>The Alchemist — Paulo Coelho</li><li>Thinking Fast and Slow — Kahneman</li></ul>',
          tags: ['reading', 'personal'],
          pinned: false,
          starred: true,
          deleted: false,
          wordCount: 28,
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'seed3',
          title: 'Weekend Recipe Ideas',
          body: '<p>Trying some new recipes this weekend. Need to grab ingredients Saturday morning.</p><p>Ideas: pasta carbonara, homemade pizza, banana bread for dessert. Maybe try that Thai curry too.</p>',
          tags: ['personal', 'food'],
          pinned: false,
          starred: false,
          deleted: false,
          wordCount: 30,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'seed4',
          title: 'Daily Standup Template',
          body: '<h2>Standup Format</h2><p><strong>Yesterday:</strong> What did I complete?</p><p><strong>Today:</strong> What will I work on?</p><p><strong>Blockers:</strong> Anything slowing me down?</p><blockquote>Keep it under 2 minutes.</blockquote>',
          tags: ['work', 'templates'],
          pinned: false,
          starred: false,
          deleted: false,
          wordCount: 24,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 'seed5',
          title: 'Old Draft — Archive',
          body: '<p>This was an old draft that never got finished. Moving to trash for cleanup.</p>',
          tags: ['archive'],
          pinned: false,
          starred: false,
          deleted: true,
          wordCount: 16,
          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        },
      ],
      addTask: (taskData) => {
        const newTask: Task = {
          ...taskData,
          id: generateId(),
          status: 'pending',
          completedAt: undefined,
        };
        set((state) => ({ tasks: [...state.tasks, newTask] }));
        get().log('task', `Task "${newTask.title}" added`, 'Task');
      },

      updateTask: (id, patch) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },
      setTaskStatus: (id, status) => {
        const task = get().tasks.find(t => t.id === id);
        if (!task) return;

        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const done = status === 'done' && t.status !== 'done';
            return {
              ...t,
              status,
              completedAt: done ? new Date().toISOString() : t.completedAt,
            };
          }),
        }));

        // Log the status change
        const statusLabels: Record<string, string> = {
          pending: 'Pending',
          in_progress: 'In Progress',
          done: 'Completed',
        };
        get().log('task', `"${task.title}" → ${statusLabels[status]}`, 'Task');
      },

      deleteTask: (id) => {
        const task = get().tasks.find(t => t.id === id);
        if (task) {
          get().log('task', `Task "${task.title}" deleted`, 'Task');
        }
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      },

      log: (type, msg, category) => {
        const entry: LogEntry = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          type,
          category,
          msg,
        };
        set((state) => ({ logs: [...state.logs, entry] }));
      },
      clearLogs: () => {
        set({ logs: [] });
      },

      addQuickCategory: (name, icon) => {
        const cat: QuickCategory = {
          id: generateId(),
          name,
          icon,
          order: get().quickCategories.length,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ quickCategories: [...state.quickCategories, cat] }));
        get().log('system', `Category "${name}" created`, 'QuickAccess');
      },

      deleteQuickCategory: (id) => {
        const cat = get().quickCategories.find(c => c.id === id);
        if (cat) get().log('system', `Category "${cat.name}" deleted`, 'QuickAccess');
        set((state) => ({
          quickCategories: state.quickCategories.filter(c => c.id !== id),
          quickLinks: state.quickLinks.filter(l => l.categoryId !== id),
        }));
      },

      addQuickLink: (categoryId, name, url, icon) => {
        const catLinks = get().quickLinks.filter(l => l.categoryId === categoryId);
        if (catLinks.length >= 10) return;
        const link: QuickLink = {
          id: generateId(),
          categoryId,
          name,
          url: url.startsWith('http') ? url : 'https://' + url,
          icon,
          order: catLinks.length,
          createdAt: new Date().toISOString(),
          clickCount: 0
        };
        set((state) => ({ quickLinks: [...state.quickLinks, link] }));
        get().log('system', `Link "${name}" added`, 'QuickAccess');
      },

      deleteQuickLink: (id) => {
        const link = get().quickLinks.find(l => l.id === id);
        if (link) get().log('system', `Link "${link.name}" deleted`, 'QuickAccess');
        set((state) => ({
          quickLinks: state.quickLinks.filter(l => l.id !== id),
        }));
      },

      reorderLinks: (categoryId, orderedIds) => {
        set((state) => ({
          quickLinks: state.quickLinks.map(l => {
            const idx = orderedIds.indexOf(l.id);
            if (l.categoryId === categoryId && idx !== -1) {
              return { ...l, order: idx };
            }
            return l;
          }),
        }));
      },

      addCalendarEvent: (event) => {
        const newEvent: CalendarEvent = { ...event, id: generateId(), createdAt: new Date().toISOString() };
        set((state) => ({ calendarEvents: [...state.calendarEvents, newEvent] }));
        get().log('system', `Event "${event.title}" created`, 'Calendar');
      },
      updateCalendarEvent: (id, patch) => {
        set((state) => ({ calendarEvents: state.calendarEvents.map(e => e.id === id ? { ...e, ...patch } : e) }));
      },
      deleteCalendarEvent: (id) => {
        const event = get().calendarEvents.find(e => e.id === id);
        if (event) get().log('system', `Event "${event.title}" deleted`, 'Calendar');
        set((state) => ({ calendarEvents: state.calendarEvents.filter(e => e.id !== id) }));
      },
      setThemeMode: (mode) => set({ themeMode: mode }),
      addNoteFolder: (folder) => {
        const newFolder: NoteFolder = { ...folder, id: generateId(), order: get().noteFolders.length };
        set((state) => ({ noteFolders: [...state.noteFolders, newFolder] }));
      },
      deleteNoteFolder: (id) => {
        set((state) => ({
          noteFolders: state.noteFolders.filter(f => f.id !== id),
        }));
      },
      addNote: (note) => {
        const newNote: Note = { ...note, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((state) => ({ notes: [newNote, ...state.notes] }));
      },
      updateNote: (id, patch) => {
        set((state) => ({
          notes: state.notes.map(n => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n),
        }));
      },
      deleteNote: (id) => {
        set((state) => ({ notes: state.notes.filter(n => n.id !== id) }));
      },
      trashNote: (id) => {
        set((state) => ({
          notes: state.notes.map(n => n.id === id ? { ...n, deleted: true, updatedAt: new Date().toISOString() } : n),
        }));
      },
      restoreNote: (id) => {
        set((state) => ({
          notes: state.notes.map(n => n.id === id ? { ...n, deleted: false, updatedAt: new Date().toISOString() } : n),
        }));
      },
      permanentDeleteNote: (id) => {
        set((state) => ({ notes: state.notes.filter(n => n.id !== id) }));
      },
      emptyTrash: () => {
        set((state) => ({ notes: state.notes.filter(n => !n.deleted) }));
      },
      updateQuickLink: (id, patch) => {
        set((state) => ({
          quickLinks: state.quickLinks.map(l => l.id === id ? { ...l, ...patch } : l),
        }));
      },

      incrementClickCount: (id) => {
        set((state) => ({
          quickLinks: state.quickLinks.map(l => l.id === id ? { ...l, clickCount: l.clickCount + 1 } : l),
        }));
      },

      setPomoSettings: (focus, breakMin) => {
        const state = get();
        if (state.pomoFocusMin !== focus || state.pomoBreakMin !== breakMin) {
          set({
            pomoFocusMin: focus,
            pomoBreakMin: breakMin,
            pomoSeconds: state.pomoPhase === 'focus' ? focus * 60 : breakMin * 60,
            pomoRunning: false,
          });
          stopTimer();
          get().log('pomodoro', `Settings changed: Focus ${focus}m, Break ${breakMin}m`, 'Pomodoro');
        }
      },

      addPomoSession: (session) => {
        const newSession: PomoSession = {
          ...session,
          id: generateId(),
          completedAt: new Date().toISOString(),
        };
        set((state) => ({ pomoHistory: [...state.pomoHistory, newSession] }));
        get().log('pomodoro', `${session.phase === 'focus' ? 'Focus' : 'Break'} session completed (${session.durationMin}m)`, 'Pomodoro');
      },

      togglePomo: () => {
        const state = get();
        if (state.pomoRunning) {
          // Pause
          set({ pomoRunning: false });
          stopTimer();
        } else {
          // Start
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
          set({ pomoRunning: true });
          startTimer(set, get);
        }
      },

      resetPomo: () => {
        stopTimer();
        const state = get();
        set({
          pomoPhase: 'focus',
          pomoSeconds: state.pomoFocusMin * 60,
          pomoRunning: false,
          pomoSession: 1,
        });
      },
      addForgeItem: (item) => {
        const newItem: ForgeItem = {
          ...item,
          id: generateId(),
          streak: 0,
          bestStreak: 0,
          completions: {},
          currentCount: item.type === 'target' ? 0 : undefined,
          order: get().forgeItems.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ forgeItems: [...state.forgeItems, newItem] }));
        get().log('system', `Forge item "${item.name}" created`, 'Forge');
      },

      updateForgeItem: (id, patch) => {
        set((state) => ({
          forgeItems: state.forgeItems.map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i),
        }));
      },

      deleteForgeItem: (id) => {
        const item = get().forgeItems.find(i => i.id === id);
        if (item) get().log('system', `Forge item "${item.name}" deleted`, 'Forge');
        set((state) => ({ forgeItems: state.forgeItems.filter(i => i.id !== id) }));
      },

      toggleForgeItem: (id) => {
        const today = new Date().toISOString().split('T')[0];
        set((state) => ({
          forgeItems: state.forgeItems.map(i => {
            if (i.id !== id) return i;
            const wasCompleted = i.completions[today];
            const newCompletions = { ...i.completions };
            if (wasCompleted) {
              delete newCompletions[today];
            } else {
              newCompletions[today] = true;
            }
            const newStreak = wasCompleted ? 0 : i.streak + 1;
            return {
              ...i,
              completions: newCompletions,
              streak: newStreak,
              bestStreak: Math.max(i.bestStreak, newStreak),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      incrementTarget: (id) => {
        set((state) => ({
          forgeItems: state.forgeItems.map(i => {
            if (i.id !== id || i.type !== 'target') return i;
            const newCount = (i.currentCount || 0) + 1;
            return { ...i, currentCount: Math.min(newCount, i.targetCount || 1), updatedAt: new Date().toISOString() };
          }),
        }));
      },

      reorderForgeItems: (orderedIds) => {
        set((state) => ({
          forgeItems: state.forgeItems.map(i => {
            const idx = orderedIds.indexOf(i.id);
            return idx !== -1 ? { ...i, order: idx } : i;
          }),
        }));
      },

      switchPomoPhase: (phase: PomoPhase) => {
        stopTimer();
        const state = get();
        const total = phase === 'focus' ? state.pomoFocusMin * 60 : state.pomoBreakMin * 60;
        set({
          pomoPhase: phase,
          pomoSeconds: total,
          pomoRunning: false,
        });
      },

      setWeatherCity: (city) => set({ weatherCity: city }),
    }),

    {
      name: 'productivity-dashboard-storage',
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Migrate old note schema (missing body/tags/starred/deleted/wordCount)
            state.notes = (state.notes ?? []).map((n: Partial<Note> & { content?: string }) => ({
              ...n,
              body: n.body ?? n.content ?? '',
              tags: Array.isArray(n.tags) ? n.tags : [],
              starred: n.starred ?? false,
              deleted: n.deleted ?? false,
              wordCount: n.wordCount ?? 0,
            }));
            // Restart pomo timer if it was running
            if (state.pomoRunning) {
              startTimer(useAppStore.setState, useAppStore.getState);
            }
          }
        };
      },
    }
  )
);

export function isOverdue(task: Task): boolean {
  if (!task.due || task.status === 'done') return false;
  return new Date(task.due) < new Date();
}

export function isAtRisk(task: Task): boolean {
  if (!task.due || task.status === 'done') return false;
  const now = new Date();
  const due = new Date(task.due);
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
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
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export function isUpcoming(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d > tomorrow;
}