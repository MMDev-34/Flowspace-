export type ActivityModule =
    | 'tasks' | 'pomodoro' | 'logs' | 'quickAccess'
    | 'calendar' | 'notes' | 'forge' | 'dashboard';

export interface ActivityEvent {
    id: string;
    timestamp: number;
    date: string;
    module: ActivityModule;
    action: string;
    metadata?: Record<string, unknown>;
}

export interface DailyActivity {
    date: string;
    total: number;
    breakdown: Record<ActivityModule, number>;
}

export type HeatmapFilter = 'all' | ActivityModule;