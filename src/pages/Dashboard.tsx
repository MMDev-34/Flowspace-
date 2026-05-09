import { useAppStore } from "../store/useAppStore";
import { useEffect, useMemo, useState, useRef, memo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  Flame,
  Smile,
  CheckCircle2,
  Clock,
  Check,
} from "lucide-react";

const weekly = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 58 },
  { day: "Wed", value: 51 },
  { day: "Thu", value: 73 },
  { day: "Fri", value: 64 },
  { day: "Sat", value: 38 },
  { day: "Sun", value: 81 },
];

const allocation = [
  { name: "Coding", value: 45, color: "hsl(184 100% 50%)" },
  { name: "Meetings", value: 20, color: "hsl(263 84% 58%)" },
  { name: "Design", value: 18, color: "hsl(142 71% 45%)" },
  { name: "Other", value: 17, color: "hsl(38 92% 50%)" },
];

function StatCard({
  label,
  value,
  sub,
  trend,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  trend?: string;
  color?: string;
}) {
  return (
    <div className="widget">
      <div className="widget-title mb-3">{label}</div>
      <div className="stat-val" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>
      {trend && (
        <div className="text-[10px] mt-1.5 font-mono text-success flex items-center gap-1">
          <ArrowUp className="w-3 h-3" />
          {trend}
        </div>
      )}
    </div>
  );
}

function LivePomodoroDots() {
  const { pomoSeconds, pomoRunning, pomoPhase, pomoFocusMin, pomoBreakMin } =
    useAppStore();

  const totalSeconds =
    (pomoPhase === "focus" ? pomoFocusMin : pomoBreakMin) * 60;
  const remainingSeconds = pomoSeconds;
  const elapsedSeconds = totalSeconds - remainingSeconds;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

  const totalDots = 20;
  const actualFilledDots = Math.round((1 - progress) * totalDots);
  const actualPct = Math.round((1 - progress) * 100);
  const [filledDots, setFilledDots] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const mountedRef = useRef(true);

  // Entrance animation: fill dots one by one from 0 to actual
  useEffect(() => {
    mountedRef.current = true;
    setFilledDots(0);
    setDisplayPct(0);

    let dot = 0;
    const interval = setInterval(() => {
      dot++;
      if (dot > actualFilledDots) {
        clearInterval(interval);
        mountedRef.current = false;
        return;
      }
      if (mountedRef.current) {
        setFilledDots(dot);
        setDisplayPct(Math.round((dot / totalDots) * 100));
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Smooth updates after entrance
  useEffect(() => {
    if (!mountedRef.current) {
      setFilledDots(actualFilledDots);
      setDisplayPct(actualPct);
    }
  }, [actualFilledDots, actualPct]);

  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const ss = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div className="widget relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-blue-400/5 blur-3xl pointer-events-none" />

      <div className="flex items-start justify-between mb-3 relative z-10">
        <div>
          <div className="widget-title">Focus Timer</div>
          <div className="text-[8px] text-muted-foreground font-mono mt-0.5">
            {pomoRunning ? "● Running" : "○ Paused"}
          </div>
        </div>
        <span
          className={`text-[8px] font-bold font-mono px-2 py-0.5 rounded-full border ${pomoPhase === "focus"
            ? "bg-primary/10 text-primary border-primary/30"
            : "bg-secondary/10 text-secondary border-secondary/30"
            }`}
        >
          {pomoPhase === "focus" ? "FOCUS" : "BREAK"}
        </span>
      </div>

      <div className="text-center mb-4 relative z-10">
        <div
          className="text-3xl font-mono font-bold tabular-nums transition-all duration-300"
          style={{
            color: pomoPhase === "focus" ? "#60a5fa" : "#a78bfa",
            textShadow: pomoRunning
              ? `0 0 25px ${pomoPhase === "focus" ? "rgba(96,165,250,0.6)" : "rgba(167,139,250,0.6)"}, 0 0 8px ${pomoPhase === "focus" ? "rgba(59,130,246,0.4)" : "rgba(139,92,246,0.4)"}`
              : "none",
          }}
        >
          {mm}
          <span className="text-xl text-white/30 mx-0.5">:</span>
          {ss}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-1">
          {pomoPhase === "focus"
            ? `${pomoFocusMin}m focus`
            : `${pomoBreakMin}m break`}
        </div>
      </div>

      <div className="flex gap-[4px] items-center relative z-10 px-1">
        {Array.from({ length: totalDots }).map((_, i) => {
          const isFilled = i < filledDots;
          return (
            <div
              key={i}
              className="flex-1 transition-all duration-700 ease-out"
              style={{
                height: "8px",
                borderRadius: "4px",
                background: isFilled
                  ? "linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%)"
                  : "#0f0f1a",
                border: isFilled
                  ? "1px solid rgba(96,165,250,0.3)"
                  : "1px solid rgba(255,255,255,0.1)",
                boxShadow: isFilled
                  ? "0 0 10px rgba(59,130,246,0.6), 0 0 3px rgba(96,165,250,0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
                  : "none",
                transform: isFilled ? "scaleY(1)" : "scaleY(0.85)",
                opacity: isFilled ? 1 : 0.5,
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-2.5 relative z-10">
        <span
          className="text-[10px] font-mono font-bold"
          style={{ color: "#60a5fa" }}
        >
          {displayPct}%
        </span>
        <span className="text-[9px] font-mono text-muted-foreground">
          {elapsedSeconds}s elapsed · {remainingSeconds}s left
        </span>
      </div>

      {pomoRunning && (
        <div className="flex items-center gap-1.5 mt-2 justify-center relative z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="text-[8px] font-mono text-blue-400 tracking-wider uppercase">
            Live
          </span>
        </div>
      )}
    </div>
  );
}

function ArcRacerGauge({
  tasks,
}: {
  tasks: import("../store/useAppStore").Task[];
}) {
  const totalDone = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const actualPct =
    totalTasks === 0 ? 0 : Math.round((totalDone / totalTasks) * 100);
  const [displayPct, setDisplayPct] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Reset on mount (refresh)
    mountedRef.current = true;
    setDisplayPct(0);

    const t1 = setTimeout(() => {
      if (mountedRef.current) setDisplayPct(98);
    }, 98);

    const t2 = setTimeout(() => {
      if (mountedRef.current) {
        setDisplayPct(actualPct);
        mountedRef.current = false; // lock after entrance
      }
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Smooth updates after entrance animation is done
  useEffect(() => {
    if (!mountedRef.current) {
      setDisplayPct(actualPct);
    }
  }, [actualPct]);

  const CX = 100,
    CY = 100,
    R = 72;

  const arcPath = (percent: number) => {
    if (percent <= 0) return "";
    const p = Math.min(percent, 99.99);
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const startAngle = 180;
    const endAngle = 180 - (p / 100) * 180;
    const x1 = CX + R * Math.cos(toRad(startAngle));
    const y1 = CY - R * Math.sin(toRad(startAngle));
    const x2 = CX + R * Math.cos(toRad(endAngle));
    const y2 = CY - R * Math.sin(toRad(endAngle));
    const large = p > 50 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  const needleDeg = -90 + (displayPct / 100) * 180;

  const statusInfo =
    displayPct >= 70
      ? {
        label: "GOOD",
        cls: "bg-[#22d17a]/15 text-[#22d17a] border-[#22d17a]/40",
      }
      : displayPct >= 35
        ? {
          label: "OKAY",
          cls: "bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40",
        }
        : {
          label: "LOW",
          cls: "bg-[#ff4d6d]/15 text-[#ff4d6d] border-[#ff4d6d]/40",
        };

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const d = new Date();
  const dateStr = `${days[d.getDay()]} · ${d.getDate()} ${months[d.getMonth()]}`;

  return (
    <div className="widget relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="widget-title">Tasks Done</div>
          <div className="text-[8px] text-muted-foreground font-mono mt-0.5">
            {dateStr}
          </div>
        </div>
        <span
          className={`text-[8px] font-bold font-mono px-2 py-0.5 rounded-full border ${statusInfo.cls}`}
        >
          {statusInfo.label}
        </span>
      </div>
      <div className="relative w-full max-w-[220px] aspect-[2/1.1] mx-auto">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[100px] h-[55px] top-[20px] -left-[10px] rounded-full bg-[#22d17a] opacity-[0.06] blur-[20px] transition-all duration-1000" />
          <div className="absolute w-[100px] h-[55px] top-[20px] -right-[10px] rounded-full bg-[#ff4d6d] opacity-[0.04] blur-[20px] transition-all duration-1000" />
        </div>
        <svg className="relative z-10 w-full h-full" viewBox="0 0 200 130">
          <defs>
            <filter id="arcGlowDash2">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="#1a040400"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R * Math.cos((108 * Math.PI) / 180)} ${CY - R * Math.sin((108 * Math.PI) / 180)}`}
            fill="none"
            stroke="#420404"
            strokeWidth="10"
            opacity="0.4"
            strokeLinecap="butt"
          />
          <path
            d={`M ${CX + R * Math.cos((108 * Math.PI) / 180)} ${CY - R * Math.sin((108 * Math.PI) / 180)} A ${R} ${R} 0 0 1 ${CX + R * Math.cos((72 * Math.PI) / 180)} ${CY - R * Math.sin((72 * Math.PI) / 180)}`}
            fill="none"
            stroke="#032930"
            strokeWidth="10"
            opacity="0.4"
            strokeLinecap="butt"
          />
          <path
            d={`M ${CX + R * Math.cos((72 * Math.PI) / 180)} ${CY - R * Math.sin((72 * Math.PI) / 180)} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="#054a05"
            strokeWidth="10"
            opacity="0.4"
            strokeLinecap="butt"
          />

          <g stroke="#0cc330" strokeWidth="2" strokeLinecap="round">
            {[0, 25, 50, 75, 100].map((pp) => {
              const aDeg = 180 - (pp / 100) * 180;
              const aRad = (aDeg * Math.PI) / 180;
              const ir = R - 6,
                or = R + 2;
              const ix = CX + ir * Math.cos(aRad),
                iy = CY - ir * Math.sin(aRad);
              const ox = CX + or * Math.cos(aRad),
                oy = CY - or * Math.sin(aRad);
              return <line key={pp} x1={ix} y1={iy} x2={ox} y2={oy} />;
            })}
          </g>
          {[0, 25, 50, 75, 100].map((pp) => {
            const aDeg = 180 - (pp / 100) * 180;
            const aRad = (aDeg * Math.PI) / 180;
            const lr = R + 12;
            const lx = CX + lr * Math.cos(aRad),
              ly = CY - lr * Math.sin(aRad) + 3;
            return (
              <text
                key={pp}
                x={lx}
                y={ly}
                fill="#ffffff"
                fontSize="10"
                fontFamily="JetBrains Mono,monospace"
                textAnchor="middle"
              >
                {pp}
              </text>
            );
          })}
        </svg>
        <div
          className="absolute w-[2px] bg-gradient-to-t from-[#a78bfa] to-[#e8dcff] left-1/2 -ml-[1px] rounded-t-sm z-20"
          style={{
            height: "68px",
            bottom: "14px",
            transformOrigin: "50% 100%",
            transform: `rotate(${needleDeg}deg)`,
            boxShadow:
              "0 0 5px rgba(167,139,250,0.5), 0 0 12px rgba(167,139,250,0.2)",
            transition:
              displayPct === 100 || displayPct === 0
                ? "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "transform 0.7s ease-out",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/40 to-transparent rounded-t-sm" />
          <div
            className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle, #ffffff 0%, #a78bfa 45%, #16162a 100%)",
              boxShadow:
                "0 0 6px rgba(167,139,250,0.5), 0 0 14px rgba(167,139,250,0.3)",
            }}
          />
        </div>
        <div className="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none">
          <div
            className="text-[24px] font-bold font-mono leading-none -tracking-[1px]"
            style={{
              background:
                "linear-gradient(160deg, #ffffff 0%, #ffffff 55%, #0e6281 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {displayPct}%
          </div>
          <div
            style={{ position: "relative", top: "22px", color: "#00acbf" }}
            className="text-[13px] font-mono mt-0.5"
          >
            {totalDone} / {totalTasks}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { tasks, logs, log, pomoHistory, quickLinks, calendarEvents, forgeItems } = useAppStore();

  useEffect(() => {
    log("system", "Dashboard loaded", "System");
  }, []);

  const upcoming = useMemo(
    () => tasks.filter((t) => t.status === "pending").slice(0, 5),
    [tasks],
  );
  const [heatmap, setHeatmap] = useState<number[]>([]);
  useEffect(() => {
    setHeatmap(Array.from({ length: 16 * 7 }, () => Math.floor(Math.random() * 5)));
  }, []);
  const recentLogs = useMemo(
    () =>
      [...logs]
        .reverse()
        .filter((l) => !(l.type === "system" && l.msg === "Dashboard loaded"))
        .slice(0, 5),
    [logs],
  );

  const [hasRecentLog, setHasRecentLog] = useState(false);
  const [totalLogsToday, setTotalLogsToday] = useState(0);

  useEffect(() => {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    setTotalLogsToday(logs.filter((l) => l.type !== "system" && new Date(l.timestamp).getTime() >= todayStart).length);

    const checkRecent = () => {
      const recent = logs.some((l) => l.type !== "system" && (Date.now() - new Date(l.timestamp).getTime() < 5000));
      setHasRecentLog(recent);
    };
    checkRecent();
    const interval = setInterval(checkRecent, 1000);
    return () => clearInterval(interval);
  }, [logs]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Dashboard Home</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Welcome back, Madhusudan
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ArcRacerGauge tasks={tasks} />
        <LivePomodoroDots />
        <StatCard
          label="Habit Streak"
          value={
            <span className="flex items-center gap-1">
              12
              <Flame className="w-6 h-6 text-warning" />
            </span>
          }
          sub="Days"
          trend="Personal best"
          color="hsl(var(--warning))"
        />
        <StatCard
          label="Mood"
          value={<Smile className="w-8 h-8 text-success" />}
          sub="Today"
          color="hsl(var(--success))"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="widget lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <span className="widget-title">Weekly Activity</span>
            <span className="chip chip-cyan">7 DAYS</span>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={weekly}
                margin={{ top: 5, right: 5, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00eeff" />
                    <stop offset="100%" stopColor="hsl(263 84% 58%)" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#lineGrad)"
                  strokeWidth={2.5}
                  dot={{ fill: "hsl(var(--primary))", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="widget">
          <div className="widget-title mb-4">Time Allocation</div>
          <div className="flex items-center gap-3">
            <div className="w-[110px] h-[110px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    innerRadius={32}
                    outerRadius={50}
                    paddingAngle={2}
                  >
                    {allocation.map((e, i) => (
                      <Cell key={i} fill={e.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {allocation.map((a) => (
                <div key={a.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: a.color }}
                  />
                  <span className="flex-1 text-muted-foreground">{a.name}</span>
                  <span className="font-mono">{a.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Heatmap + Upcoming + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="widget lg:col-span-2">
          <div className="widget-title mb-4">Activity Heatmap</div>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}
          >
            {heatmap.map((v, i) => {
              const colors = [
                "hsl(240 8% 10%)",
                "hsl(184 100% 50% / 0.2)",
                "hsl(184 100% 50% / 0.4)",
                "hsl(184 100% 50% / 0.7)",
                "hsl(184 100% 50%)",
              ];
              return (
                <div
                  key={i}
                  className="aspect-square rounded-sm"
                  style={{ background: colors[v] }}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-4">

          <div className="widget !p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="widget-title text-[10px]">Tasks</span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {tasks.filter(t => t.status !== 'done').length} open
              </span>
            </div>


            <div className="space-y-0.5">
              {upcoming.length === 0 && tasks.filter(t => t.status === 'done').length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-6 h-6 text-muted-foreground opacity-30 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground font-mono">No tasks yet</p>
                </div>
              )}

              {/* Pending tasks first */}
              {upcoming.map((t) => {
                const borderColor =
                  t.priority === "high" ? "border-l-red-400" :
                    t.priority === "medium" ? "border-l-amber-400" :
                      "border-l-blue-400";
                const dotColor =
                  t.priority === "high" ? "bg-red-400" :
                    t.priority === "medium" ? "bg-amber-400" :
                      "bg-blue-400";

                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-section/40 border-l-2 ${borderColor} text-[11px] hover:bg-hover/30 transition-all group cursor-pointer`}
                    onClick={() => useAppStore.getState().setTaskStatus(t.id, 'done')}
                    title="Click to mark done"
                  >
                    <div className="w-3.5 h-3.5 rounded border border-muted-foreground/40 flex items-center justify-center shrink-0 hover:border-primary transition-all" />
                    <span className="flex-1 truncate">{t.title}</span>
                    {t.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[8px] font-mono text-muted-foreground/60 border border-border/50 px-1.5 py-0.5 rounded-full truncate max-w-[60px]">
                        {tag}
                      </span>
                    ))}
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} title={t.priority} />
                  </div>
                );
              })}

              {/* Fill remaining slots with completed tasks */}
              {upcoming.length < 5 && tasks.filter(t => t.status === 'done').slice(0, 5 - upcoming.length).map((t) => {
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-section/40 border-l-2 border-l-green-400/50 text-[11px] hover:bg-hover/30 transition-all group cursor-pointer opacity-70"
                    onClick={() => useAppStore.getState().setTaskStatus(t.id, 'pending')}
                    title="Click to reopen"
                  >
                    <div className="w-3.5 h-3.5 rounded bg-green-500/80 border-green-500 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="flex-1 truncate line-through text-muted-foreground">{t.title}</span>
                    {t.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[8px] font-mono text-muted-foreground/40 border border-border/30 px-1.5 py-0.5 rounded-full truncate max-w-[60px]">
                        {tag}
                      </span>
                    ))}
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-green-400/60" />
                  </div>
                );
              })}
            </div>

            {tasks.length > 5 && (
              <Link
                to="/tasks"
                className="block text-[9px] text-primary font-mono hover:opacity-70 text-center mt-2 pt-2 border-t border-border/50"
              >
                +{tasks.length - 5} more →
              </Link>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="widget !p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="widget-title text-[10px]">📅 Upcoming Events</span>
              <span className="text-[9px] font-mono text-muted-foreground">{calendarEvents.length}</span>
            </div>
            {calendarEvents.filter(e => e.startDate >= new Date().toISOString().split('T')[0]).slice(0, 4).length === 0 ? (
              <p className="text-[10px] text-muted-foreground font-mono py-2 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-1.5">
                {calendarEvents.filter(e => e.startDate >= new Date().toISOString().split('T')[0]).sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 4).map(e => {
                  const eventDate = new Date(e.startDate);
                  const isToday = eventDate.toDateString() === new Date().toDateString();
                  const isTomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString() === eventDate.toDateString();
                  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div key={e.id} className="flex items-center gap-2 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color }} />
                      <span className="flex-1 truncate">{e.title}</span>
                      <span className="text-[8px] font-mono text-muted-foreground whitespace-nowrap">
                        {dateLabel}{e.startTime ? ` · ${e.startTime}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <Link to="/calendar" className="block text-[9px] text-primary font-mono hover:opacity-70 text-center mt-2 pt-2 border-t border-border/50">View Calendar →</Link>
          </div>

          {/* Live feed - compact */}
          <div className="widget !p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="widget-title text-[10px]">Live Feed</span>
              <div className="flex items-center gap-1.5">
                {(() => {
                  return (
                    <>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${totalLogsToday === 0
                          ? "bg-muted-foreground/30"
                          : hasRecentLog
                            ? "bg-green-400 animate-pulse"
                            : "bg-green-400/60"
                          }`}
                      />
                      <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">
                        {totalLogsToday}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="space-y-1 max-h-[160px] overflow-y-auto">
              {recentLogs.filter(
                (l) => !(l.type === "system" && l.msg === "Dashboard loaded"),
              ).length === 0 && (
                  <div className="text-[10px] text-muted-foreground py-4 text-center font-mono">
                    Waiting for events...
                  </div>
                )}
              {recentLogs
                .filter(
                  (l) => !(l.type === "system" && l.msg === "Dashboard loaded"),
                )
                .slice(0, 5)
                .map((l) => {
                  const d = new Date(l.timestamp);
                  const timeStr = d.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });
                  const dateStr = d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const borderColor =
                    l.type === "error"
                      ? "border-l-red-400"
                      : l.type === "warn"
                        ? "border-l-amber-400"
                        : l.type === "task"
                          ? "border-l-green-400"
                          : l.type === "pomodoro"
                            ? "border-l-cyan-400"
                            : "border-l-violet-400";
                  const textColor =
                    l.type === "error"
                      ? "text-red-400"
                      : l.type === "warn"
                        ? "text-amber-400"
                        : l.type === "task"
                          ? "text-green-400"
                          : l.type === "pomodoro"
                            ? "text-cyan-400"
                            : "text-violet-400";
                  const typeLabel =
                    l.type === "error"
                      ? "ERR"
                      : l.type === "warn"
                        ? "WRN"
                        : l.type === "task"
                          ? "TSK"
                          : l.type === "pomodoro"
                            ? "POM"
                            : l.type === "system"
                              ? "SYS"
                              : "INF";
                  return (
                    <div
                      key={l.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md bg-section/40 border-l-2 ${borderColor} text-[10px] hover:bg-hover/30 transition-colors`}
                    >
                      <span
                        className={`font-mono font-bold text-[8px] whitespace-nowrap ${textColor}`}
                      >
                        {typeLabel}
                      </span>
                      <span className="font-mono text-muted-foreground whitespace-nowrap text-[8px]">
                        {dateStr} {timeStr}
                      </span>{" "}
                      <span className="truncate text-white text-muted-foreground">
                        {l.msg}
                      </span>
                    </div>
                  );
                })}
            </div>
            <Link
              to="/logs"
              className="block text-[9px] text-primary font-mono hover:opacity-70 text-center mt-2 pt-2 border-t border-border/50"
            >
              View all →
            </Link>
          </div>
          {/* Forge Widget */}
          <div className="widget !p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="widget-title text-[10px]">🔥 Forge</span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const dailyItems = forgeItems.filter(i => i.type === 'daily');
                  const done = dailyItems.filter(i => i.completions[todayStr]).length;
                  return `${done}/${dailyItems.length}`;
                })()}
              </span>
            </div>
            {forgeItems.filter(i => i.type === 'daily').length === 0 ? (
              <p className="text-[10px] text-muted-foreground font-mono py-2 text-center">No habits yet</p>
            ) : (
              <div className="space-y-1">
                {forgeItems.filter(i => i.type === 'daily').slice(0, 5).map(item => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const done = item.completions[todayStr];
                  const { toggleForgeItem } = useAppStore.getState();
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-[10px] cursor-pointer hover:bg-hover/20 rounded px-1.5 py-1 transition-colors"
                      onClick={() => toggleForgeItem(item.id)}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'}`}>
                        {done && <span className="text-white text-[7px] font-bold">✓</span>}
                      </div>
                      <span className="flex-1 truncate">{item.icon} {item.name}</span>
                      <span className="text-[8px] font-mono text-amber-400 flex items-center gap-0.5"><Flame className="w-2 h-2" />{item.streak}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <Link to="/forge" className="block text-[9px] text-primary font-mono hover:opacity-70 text-center mt-2 pt-2 border-t border-border/50">View Forge →</Link>
          </div>

          {/* Quick Picks */}
          <div className="widget !p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="widget-title text-[10px]">Quick Picks</span>
              <span className="text-[9px] font-mono text-muted-foreground">
                {quickLinks.length} links
              </span>
            </div>
            {quickLinks.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-[10px] text-muted-foreground font-mono">No links yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {[...quickLinks]
                  .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
                  .slice(0, 6)
                  .map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => useAppStore.getState().incrementClickCount(link.id)}
                      className="block bg-section/40 border border-border/50 hover:border-primary/30 rounded-lg p-2 text-center transition-all hover:bg-hover/30 cursor-pointer"
                    >
                      <span className="text-lg block">{link.icon}</span>
                      <span className="text-[8px] font-mono text-muted-foreground truncate block mt-0.5">{link.name}</span>
                    </a>
                  ))}
              </div>
            )}
            <Link to="/quick-access" className="block text-[9px] text-primary font-mono hover:opacity-70 text-center mt-2 pt-2 border-t border-border/50">
              View all →
            </Link>
          </div>


        </div>
      </div>
    </div>
  );

}
