import { useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Coffee,
  Clock,
  Calendar,
  Brain,
  BatteryCharging,
} from "lucide-react";
import { cn } from "../lib/utils";

export default function PomodoroPage() {
  const {
    pomoFocusMin,
    pomoBreakMin,
    setPomoSettings,
    pomoHistory,
    pomoPhase,
    pomoSeconds,
    pomoRunning,
    togglePomo,
    resetPomo,
    switchPomoPhase,
  } = useAppStore();

  const totalSeconds =
    (pomoPhase === "focus" ? pomoFocusMin : pomoBreakMin) * 60;

  const toggle = useCallback(() => {
    togglePomo();
  }, [togglePomo]);

  const reset = useCallback(() => {
    resetPomo();
  }, [resetPomo]);

  const switchToFocus = useCallback(() => {
    switchPomoPhase("focus");
  }, [switchPomoPhase]);

  const switchToBreak = useCallback(() => {
    switchPomoPhase("break");
  }, [switchPomoPhase]);

  const mm = String(Math.floor(pomoSeconds / 60)).padStart(2, "0");
  const ss = String(pomoSeconds % 60).padStart(2, "0");

  // Circular progress
  const radius = 95;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? pomoSeconds / totalSeconds : 1;
  const offset = circumference * (1 - progress);
  const svgSize = 240;
  const center = svgSize / 2;

  // Dot position on the circle
  // const dotAngle = (-progress * 360 + 90) * (Math.PI / 180);

  // Session history grouped by date
  const groupedHistory = pomoHistory.reduce(
    (acc, session) => {
      const date = new Date(session.completedAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(session);
      return acc;
    },
    {} as Record<string, typeof pomoHistory>,
  );

  const focusSessions = pomoHistory.filter((s) => s.phase === "focus").length;
  const totalFocusMin = pomoHistory
    .filter((s) => s.phase === "focus")
    .reduce((sum, s) => sum + s.durationMin, 0);
  const totalBreakMin = pomoHistory
    .filter((s) => s.phase === "break")
    .reduce((sum, s) => sum + s.durationMin, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Pomodoro Timer</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Focus with intention
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timer */}
        <div className="widget lg:col-span-2 flex flex-col items-center py-8">
          {/* Phase selector buttons */}
          <div className="flex items-center gap-2 mb-6 p-1 bg-section rounded-lg">
            <button
              onClick={switchToFocus}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all",
                pomoPhase === "focus"
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Brain className="w-3.5 h-3.5" />
              Focus
            </button>
            <button
              onClick={switchToBreak}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all",
                pomoPhase === "break"
                  ? "bg-secondary/20 text-secondary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BatteryCharging className="w-3.5 h-3.5" />
              Break
            </button>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={cn(
                "chip flex items-center gap-1.5",
                pomoPhase === "focus" ? "chip-cyan" : "chip-violet",
              )}
            >
              {pomoPhase === "focus" ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Coffee className="w-3 h-3" />
              )}
              {pomoPhase.toUpperCase()}
            </span>
            <span
              className={cn(
                "text-xs font-mono px-2 py-0.5 rounded-full",
                pomoRunning
                  ? "bg-success/10 text-success animate-pulse"
                  : "bg-muted/50 text-muted-foreground",
              )}
            >
              {pomoRunning ? "Running" : "Paused"}
            </span>
          </div>

          {/* Circular timer */}
          <div className="relative mb-6">
            {/* Outer glow ring */}
            <div
              className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-all duration-1000",
                pomoPhase === "focus" ? "bg-primary/30" : "bg-secondary/30",
              )}
              style={{
                width: "180px",
                height: "180px",
                opacity: pomoRunning ? 0.5 : 0.15,
              }}
            />

            <svg
              width={svgSize}
              height={svgSize}
              className="-rotate-90 relative z-10"
              style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.5))" }}
            >
              <defs>
                <linearGradient
                  id="progressGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop
                    offset="0%"
                    stopColor={
                      pomoPhase === "focus"
                        ? "hsl(var(--primary))"
                        : "hsl(var(--secondary))"
                    }
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      pomoPhase === "focus"
                        ? "hsl(184 100% 65%)"
                        : "hsl(263 84% 70%)"
                    }
                  />
                </linearGradient>

                {/* 3D Glass Reflection Gradients */}
                <linearGradient id="glassGlare" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="30%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="80%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                </linearGradient>
                <linearGradient id="glassRim" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                </linearGradient>

                {/* Trough shadow */}
                <filter id="troughShadow">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#000" floodOpacity="0.8" />
                </filter>

                {/* Glow filter for the progress line */}
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation={pomoRunning ? "5" : "2"} result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Thick 3D Glass Body */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="hsl(var(--background) / 0.5)"
                strokeWidth="28"
              />

              {/* Glass Specular Glare (The shiny curve) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="url(#glassGlare)"
                strokeWidth="28"
              />

              {/* Inner Glossy Rim */}
              <circle
                cx={center}
                cy={center}
                r={radius - 14}
                fill="none"
                stroke="url(#glassRim)"
                strokeWidth="1.5"
              />

              {/* Outer Glossy Rim */}
              <circle
                cx={center}
                cy={center}
                r={radius + 14}
                fill="none"
                stroke="url(#glassRim)"
                strokeWidth="1.5"
              />

              {/* Dark Trough for the Progress Line */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="10"
                filter="url(#troughShadow)"
              />

              {/* Progress liquid (The neon glow) */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                filter="url(#neonGlow)"
                className="transition-all duration-1000 ease-linear"
              />

              {/* The Orbiting Lead Orb */}
              {progress < 1 && progress > 0 && (
                <circle
                  cx={center + radius * Math.cos(progress * 2 * Math.PI)}
                  cy={center + radius * Math.sin(progress * 2 * Math.PI)}
                  r="5"
                  fill="white"
                  className="transition-all duration-1000 ease-linear"
                  filter="url(#neonGlow)"
                />
              )}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <div
                className={cn(
                  "text-6xl font-mono font-bold tabular-nums tracking-tight transition-colors duration-500",
                  pomoPhase === "focus" ? "text-primary" : "text-secondary",
                )}
              >
                {mm}
                <span className="text-3xl text-muted-foreground mx-0.5">:</span>
                {ss}
              </div>
              {/* Progress bar below timer */}
              <div className="w-32 flex items-center gap-[3px] mt-2 justify-center">
                {Array.from({ length: 20 }).map((_, i) => {
                  const dotProgress = i / 19;
                  const isActive = dotProgress <= 1 - progress;
                  return (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-500"
                      style={{
                        width: "6px",
                        height: "6px",
                        backgroundColor: isActive
                          ? pomoPhase === "focus"
                            ? "hsl(184 100% 50%)"
                            : "hsl(263 84% 58%)"
                          : "transparent",
                        border: isActive
                          ? "none"
                          : "1px solid rgba(255,255,255,0.3)",
                        boxShadow: isActive
                          ? pomoPhase === "focus"
                            ? "0 0 8px hsl(184 100% 50% / 0.7), 0 0 2px hsl(184 100% 50% / 0.4)"
                            : "0 0 8px hsl(263 84% 58% / 0.7), 0 0 2px hsl(263 84% 58% / 0.4)"
                          : "none",
                        transform: isActive ? "scale(1.15)" : "scale(1)",
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {Math.round((1 - progress) * 100)}% complete
                </span>
              </div>

              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-mono">
                  {pomoPhase === "focus"
                    ? `${pomoFocusMin}min focus`
                    : `${pomoBreakMin}min break`}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={toggle}
              className={cn(
                "px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
                pomoRunning
                  ? "bg-warning/20 text-warning border border-warning/30 hover:bg-warning/30"
                  : pomoPhase === "focus"
                    ? "bg-primary text-primary-foreground hover:shadow-glow-cyan"
                    : "bg-secondary text-secondary-foreground hover:shadow-glow-cyan",
              )}
            >
              {pomoRunning ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {pomoRunning
                ? "Pause"
                : pomoPhase === "focus"
                  ? "Start Focus"
                  : "Start Break"}
            </button>
            <button
              onClick={reset}
              className="bg-transparent border border-border text-muted-foreground px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:border-primary hover:text-primary transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-xs">
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                Focus (min)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={pomoFocusMin}
                onChange={(e) =>
                  setPomoSettings(
                    Math.max(1, +e.target.value || 1),
                    pomoBreakMin,
                  )
                }
                className="w-full bg-section border border-border rounded-lg px-3 py-1.5 text-sm font-mono mt-1 focus:border-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                Break (min)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={pomoBreakMin}
                onChange={(e) =>
                  setPomoSettings(
                    pomoFocusMin,
                    Math.max(1, +e.target.value || 1),
                  )
                }
                className="w-full bg-section border border-border rounded-lg px-3 py-1.5 text-sm font-mono mt-1 focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* History panel */}
        <div className="widget flex flex-col max-h-[600px]">
          <div className="widget-title mb-4">Session History</div>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-section rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground font-mono uppercase">
                Focus
              </div>
              <div className="text-xl font-mono font-bold text-primary mt-0.5">
                {focusSessions}
              </div>
            </div>
            <div className="bg-section rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground font-mono uppercase">
                Focus min
              </div>
              <div className="text-xl font-mono font-bold text-primary mt-0.5">
                {totalFocusMin}
              </div>
            </div>
            <div className="bg-section rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground font-mono uppercase">
                Break min
              </div>
              <div className="text-xl font-mono font-bold text-secondary mt-0.5">
                {totalBreakMin}
              </div>
            </div>
          </div>

          {/* History list grouped by date */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {Object.keys(groupedHistory).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-8">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No sessions yet. Start your first focus session!
              </div>
            )}
            {Object.entries(groupedHistory).map(([date, sessions]) => (
              <div key={date}>
                <div className="flex items-center gap-1.5 mb-2 sticky top-0 bg-card py-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {date}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · {sessions.length} session{sessions.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-section/60 text-xs hover:bg-hover/40 transition-colors"
                    >
                      <span
                        className={cn(
                          "chip flex items-center gap-1",
                          s.phase === "focus" ? "chip-cyan" : "chip-violet",
                        )}
                      >
                        {s.phase === "focus" ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : (
                          <Coffee className="w-2.5 h-2.5" />
                        )}
                        {s.phase}
                      </span>
                      <span className="flex-1 font-mono text-foreground">
                        {s.durationMin}m
                      </span>
                      <span className="text-subtle font-mono text-[10px]">
                        {new Date(s.completedAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
