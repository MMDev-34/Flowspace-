import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, ListChecks, Timer, ScrollText, Zap, Calendar, FileText, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: ListChecks, label: 'Tasks' },
  { to: '/pomodoro', icon: Timer, label: 'Pomodoro' },
  { to: '/logs', icon: ScrollText, label: 'Logs' },
  { to: '/quick-access', icon: Zap, label: 'Quick Access' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/forge', icon: Flame, label: 'Forge' },
  { icon: '📈', label: 'Insights', path: '/insights' }
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - fixed */}
      <aside className="w-16 lg:w-56 border-r border-border bg-card flex flex-col gap-2 p-3 fixed top-0 left-0 h-full z-30 shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center text-background font-bold text-sm">
            F
          </div>
          <span className="hidden lg:inline font-semibold text-sm">FlowSpace</span>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <l.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:inline">{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area - scrollable with margin for fixed sidebar */}
      <main className="flex-1 ml-16 lg:ml-56 p-6 overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
}