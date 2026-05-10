import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  Play, Pause, RotateCcw, CheckCircle2,
  Coffee, Clock, Calendar, Brain, BatteryCharging,
} from "lucide-react";
import { cn } from "../lib/utils";

// ─────────────────────────────────────────────────────────
//  Ring constants
// ─────────────────────────────────────────────────────────
const SVG_SIZE = 260;
const CENTER = SVG_SIZE / 2;          // 130
const RADIUS = 100;
const STROKE_W = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;


export default function PomodoroPage() {
  const {
    pomoFocusMin, pomoBreakMin, setPomoSettings,
    pomoHistory, pomoPhase, pomoSeconds,
    pomoRunning, togglePomo, resetPomo, switchPomoPhase, log
  } = useAppStore();

  const totalSeconds = (pomoPhase === "focus" ? pomoFocusMin : pomoBreakMin) * 60;

  // progress: 1 = full (not started), 0 = empty (completed)
  const progress = totalSeconds > 0 ? pomoSeconds / totalSeconds : 1;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const mm = String(Math.floor(pomoSeconds / 60)).padStart(2, "0");
  const ss = String(pomoSeconds % 60).padStart(2, "0");

  const isFocus = pomoPhase === "focus";
  const color1 = isFocus ? "hsl(184 100% 50%)" : "hsl(263 84% 65%)";
  const color2 = isFocus ? "hsl(210 100% 68%)" : "hsl(300 75% 65%)";
  const glowRgba = isFocus ? "0,212,255" : "167,139,250";



  // ── BREATHING — rAF-driven sin wave ──────────────────
  const [glowScale, setGlowScale] = useState(1);
  const rafRef = useRef<number | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (pomoRunning) {
      startedAt.current = performance.now();

      const tick = (now: number) => {
        const t = (now - startedAt.current) / 1000;
        // period 2.5s, range 1.0 → 1.28
        const scale = 1 + 0.28 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 2.5));
        setGlowScale(scale);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pomoRunning]);

  // ── BURST — detect pomoSeconds crossing 0 ────────────
  const [burstKey, setBurstKey] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const prevSecondsRef = useRef(pomoSeconds);

  useEffect(() => {
    if (prevSecondsRef.current > 0 && pomoSeconds === 0) {
      setBurstKey(k => k + 1);
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 1400);
    }
    prevSecondsRef.current = pomoSeconds;
  }, [pomoSeconds]);

  // ── PHASE FLASH ───────────────────────────────────────
  const [flash, setFlash] = useState(false);
  const prevPhaseRef = useRef(pomoPhase);
  useEffect(() => {
    if (prevPhaseRef.current !== pomoPhase) {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
      prevPhaseRef.current = pomoPhase;
    }
  }, [pomoPhase]);

  // callbacks
  const toggle = useCallback(() => {
    if (pomoRunning) {
      setGlowScale(1);
    }
    togglePomo();
  }, [togglePomo, pomoRunning]);

  const reset = useCallback(() => {
    setGlowScale(1);
    resetPomo();
  }, [resetPomo]);
  const switchToFocus = useCallback(() => switchPomoPhase("focus"), [switchPomoPhase]);
  const switchToBreak = useCallback(() => switchPomoPhase("break"), [switchPomoPhase]);

  // history
  const groupedHistory = pomoHistory.reduce((acc, s) => {
    const date = new Date(s.completedAt).toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {} as Record<string, typeof pomoHistory>);

  const focusSessions = pomoHistory.filter(s => s.phase === "focus").length;
  const totalFocusMin = pomoHistory.filter(s => s.phase === "focus").reduce((a, x) => a + x.durationMin, 0);
  const totalBreakMin = pomoHistory.filter(s => s.phase === "break").reduce((a, x) => a + x.durationMin, 0);

  const glowOpacity = pomoRunning ? 0.22 + (glowScale - 1) * 1.5 : 0.10;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Pomodoro Timer</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Focus with intention</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Timer card ── */}
        <div className="widget lg:col-span-2 flex flex-col items-center py-8">

          {/* Phase tabs */}
          <div className="flex items-center gap-2 mb-6 p-1 bg-section rounded-lg">
            <button onClick={switchToFocus} className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all",
              isFocus ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}>
              <Brain className="w-3.5 h-3.5" /> Focus
            </button>
            <button onClick={switchToBreak} className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all",
              !isFocus ? "bg-secondary/20 text-secondary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}>
              <BatteryCharging className="w-3.5 h-3.5" /> Break
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 mb-5">
            <span className={cn("chip flex items-center gap-1.5", isFocus ? "chip-cyan" : "chip-violet")}>
              {isFocus ? <CheckCircle2 className="w-3 h-3" /> : <Coffee className="w-3 h-3" />}
              {pomoPhase.toUpperCase()}
            </span>
            <span className={cn(
              "text-xs font-mono px-2 py-0.5 rounded-full",
              pomoRunning ? "bg-success/10 text-success" : "bg-muted/50 text-muted-foreground",
            )}>
              {pomoRunning ? "● Running" : "Paused"}
            </span>
          </div>

          {/* ── Ring ── */}
          <div className="relative mb-6" style={{ width: SVG_SIZE, height: SVG_SIZE }}>

            {/* Breathing glow blob — softer ambient light */}
            <div
              className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
              style={{
                width: 160,
                height: 160,
                marginLeft: -80,
                marginTop: -80,
                background: `radial-gradient(circle, rgba(${glowRgba},0.3) 0%, transparent 60%)`,
                filter: "blur(20px)",
                opacity: glowOpacity * 0.7,
                transform: `scale(${glowScale})`,
                // deliberately NO css transition — rAF is already smooth
              }}
            />

            {/* Phase flash */}
            {flash && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `radial-gradient(circle, rgba(${glowRgba},0.45) 0%, transparent 65%)`,
                  animation: "pomoFlash 0.5s ease-out forwards",
                }}
              />
            )}

            {/* ── SVG ── */}
            <svg
              width={SVG_SIZE}
              height={SVG_SIZE}
              style={{ transform: "rotate(-90deg)", display: "block" }}
            >
              <defs>
                <linearGradient id="pomoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={color1} />
                  <stop offset="100%" stopColor={color2} />
                </linearGradient>

                {/* Arc glow */}
                <filter id="arcGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation={pomoRunning ? "4" : "2.5"} result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

              </defs>

              {/* Track ring */}
              <circle
                cx={CENTER} cy={CENTER} r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={STROKE_W}
              />
              {/* Inner rim */}
              <circle
                cx={CENTER} cy={CENTER} r={RADIUS - STROKE_W / 2 - 1}
                fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"
              />
              {/* Outer rim */}
              <circle
                cx={CENTER} cy={CENTER} r={RADIUS + STROKE_W / 2 + 1}
                fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"
              />

              {/* Progress arc */}
              {progress > 0 && (
                <circle
                  cx={CENTER} cy={CENTER} r={RADIUS}
                  fill="none"
                  stroke="url(#pomoGrad)"
                  strokeWidth={STROKE_W}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  filter="url(#arcGlow)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              )}

              {/* Burst rings — SVG-native animate, no CSS */}
              {showBurst && [0, 200, 400].map((delay, i) => (
                <circle
                  key={`burst-${burstKey}-${i}`}
                  cx={CENTER} cy={CENTER} r={RADIUS}
                  fill="none"
                  stroke={color1}
                  strokeWidth="2"
                  opacity="0"
                >
                  <animate attributeName="r"
                    from={String(RADIUS)} to={String(RADIUS + 60)}
                    dur="1.2s" begin={`${delay}ms`} fill="freeze" />
                  <animate attributeName="opacity"
                    values="0;0.85;0" dur="1.2s" begin={`${delay}ms`} fill="freeze" />
                </circle>
              ))}

            </svg>

            {/* Frosted Glass Lens & Text */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02),0_4px_20px_rgba(0,0,0,0.2)] backdrop-blur-md flex flex-col items-center justify-center transition-all duration-700"
              style={{
                width: 184,
                height: 184,
                zIndex: 20,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.0) 100%)'
              }}
            >
              <div className={cn(
                "text-5xl font-mono font-bold tabular-nums tracking-tight transition-colors duration-500 flex items-center",
                isFocus ? "text-primary" : "text-secondary",
              )}>
                {mm}
                <span className="text-3xl text-muted-foreground mx-0.5"
                  style={{ animation: pomoRunning ? "heartbeat 1s ease-in-out infinite" : "none" }}>:</span>
                {ss}
              </div>

              <div className="text-[10px] font-mono text-muted-foreground mt-2">
                {Math.round((1 - progress) * 100)}% complete
              </div>

              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-muted-foreground opacity-70" />
                <span className="text-[9px] text-muted-foreground font-mono">
                  {isFocus ? `${pomoFocusMin}min focus` : `${pomoBreakMin}min break`}
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
                  : isFocus
                    ? "bg-primary text-primary-foreground hover:shadow-glow-cyan"
                    : "bg-secondary text-secondary-foreground hover:shadow-glow-cyan",
              )}
            >
              {pomoRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {pomoRunning ? "Pause" : isFocus ? "Start Focus" : "Start Break"}
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
                type="number" min={1} max={90} value={pomoFocusMin}
                onChange={e => {
                  const val = Math.max(1, +e.target.value || 1);
                  setPomoSettings(val, pomoBreakMin);
                  log('pomodoro', `Focus duration changed to ${val}m`, 'Pomodoro');
                }}
                className="w-full bg-section border border-border rounded-lg px-3 py-1.5 text-sm font-mono mt-1 focus:border-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                Break (min)
              </label>
              <input
                type="number" min={1} max={30} value={pomoBreakMin}
                onChange={e => {
                  const val = Math.max(1, +e.target.value || 1);
                  setPomoSettings(pomoFocusMin, val);
                  log('pomodoro', `Break duration changed to ${val}m`, 'Pomodoro');
                }}
                className="w-full bg-section border border-border rounded-lg px-3 py-1.5 text-sm font-mono mt-1 focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ── History panel ── */}
        <div className="widget flex flex-col max-h-[600px]">
          <div className="widget-title mb-4">Session History</div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-section rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground font-mono uppercase">Focus</div>
              <div className="text-xl font-mono font-bold text-primary mt-0.5">{focusSessions}</div>
            </div>
            <div className="bg-section rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground font-mono uppercase">Focus min</div>
              <div className="text-xl font-mono font-bold text-primary mt-0.5">{totalFocusMin}</div>
            </div>
            <div className="bg-section rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-muted-foreground font-mono uppercase">Break min</div>
              <div className="text-xl font-mono font-bold text-secondary mt-0.5">{totalBreakMin}</div>
            </div>
          </div>

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
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{date}</span>
                  <span className="text-[10px] text-muted-foreground">
                    · {sessions.length} session{sessions.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  {sessions.map(s => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-section/60 text-xs hover:bg-hover/40 transition-colors">
                      <span className={cn("chip flex items-center gap-1", s.phase === "focus" ? "chip-cyan" : "chip-violet")}>
                        {s.phase === "focus" ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Coffee className="w-2.5 h-2.5" />}
                        {s.phase}
                      </span>
                      <span className="flex-1 font-mono text-foreground">{s.durationMin}m</span>
                      <span className="text-subtle font-mono text-[10px]">
                        {new Date(s.completedAt).toLocaleTimeString("en-US", {
                          hour: "2-digit", minute: "2-digit", hour12: false,
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

      {/* CSS keyframes for Pomodoro animations */}
      <style>{`
        @keyframes pomoFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes heartbeat {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
