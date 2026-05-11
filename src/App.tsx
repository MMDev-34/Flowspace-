import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Pomodoro from './pages/Pomodoro';
import Logs from './pages/Logs';
import QuickAccess from './pages/QuickAccess';
import Calendar from './pages/Calendar';
import Notes from './pages/Notes';
import { useAppStore } from './store/useAppStore';
import { useEffect } from 'react';
import Forge from './pages/forge';
import Insights from './pages/Insights';

export default function App() {
  // Inside App or a ThemeWrapper component:
  const themeMode = useAppStore(s => s.themeMode);
  useEffect(() => {
    document.documentElement.className = themeMode;
  }, [themeMode]);
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/quick-access" element={<QuickAccess />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/forge" element={<Forge />} />
          <Route path="/insights" element={<Insights />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}