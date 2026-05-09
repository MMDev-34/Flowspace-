import { useAppStore, type CalendarEvent } from "../store/useAppStore";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Calendar as CalendarIcon,
  Trash2,
  Pencil,
  Cloud,
  CloudRain,
  Sun,
  CloudSun,
  MapPin,
} from "lucide-react";
import { cn } from "../lib/utils";
import { observances, historyEvents, getDayKey } from "../data/festivals";

const EVENT_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const formatDateStr = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ViewType = "month" | "week" | "day" | "agenda";
type CalendarFilter = "events" | "reminders" | "tasks";

// ── Weather helper ─────────────────────────────
const weatherIcons: Record<number, any> = {
  0: Sun,
  1: CloudSun,
  2: Cloud,
  3: Cloud,
  45: Cloud,
  48: Cloud,
  51: CloudRain,
  61: CloudRain,
  80: CloudRain,
};

export default function CalendarPage() {
  const {
    calendarEvents,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    tasks,
    weatherCity,
    setWeatherCity,
  } = useAppStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState<CalendarEvent | null>(null);
  const [activeFilters, setActiveFilters] = useState<CalendarFilter[]>([
    "events",
    "reminders",
    "tasks",
  ]);
  const [tooltip, setTooltip] = useState<{
    event: any;
    x: number;
    y: number;
  } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dayViewRef = useRef<HTMLDivElement>(null);
  const [weather, setWeather] = useState<{
    temp: number;
    code: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
  } | null>(null);
  const [showWeatherConfig, setShowWeatherConfig] = useState(false);

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventColor, setEventColor] = useState("#ef4444");
  const [eventDesc, setEventDesc] = useState("");
  const [eventReminder, setEventReminder] = useState(true);
  const [eventCategory, setEventCategory] = useState<"event" | "reminder">(
    "event",
  );
  const [eventRecurring, setEventRecurring] = useState<string>("none");
  const [isMultiDay, setIsMultiDay] = useState(false);

  // ── Weather fetch ─────────────────────────────
  useEffect(() => {
    const abortController = new AbortController();
    const fetchWeather = async () => {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity)}&count=1`,
          { signal: abortController.signal }
        );
        const geoData = await geoRes.json();
        if (!geoData.results?.length) return;
        const { latitude, longitude } = geoData.results[0];
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m,uv_index&timezone=auto`,
          { signal: abortController.signal }
        );
        const weatherData = await weatherRes.json();
        const cw = weatherData.current_weather;
        const codes: Record<number, string> = {
          0: "Clear",
          1: "Partly Cloudy",
          2: "Cloudy",
          3: "Overcast",
          45: "Fog",
          48: "Fog",
          51: "Drizzle",
          61: "Rain",
          80: "Showers",
        };

        // Get current hour data
        const now = new Date();
        const currentHourStr = `${formatDateStr(now)}T${String(now.getHours()).padStart(2, "0")}:00`;
        const hourIdx = Math.max(
          0,
          weatherData.hourly?.time?.findIndex((t: string) => t === currentHourStr) ?? 0
        );

        setWeather({
          temp: Math.round(cw.temperature),
          code: cw.weathercode,
          condition: codes[cw.weathercode] || "Unknown",
          humidity: weatherData.hourly?.relativehumidity_2m?.[hourIdx] ?? 0,
          windSpeed: Math.round(cw.windspeed || 0),
          uvIndex: Math.round(weatherData.hourly?.uv_index?.[hourIdx] ?? 0),
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setWeather(null);
        }
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => {
      clearInterval(interval);
      abortController.abort();
    };
  }, [weatherCity]);

  const WeatherIcon = weather ? weatherIcons[weather.code] || Cloud : Cloud;

  // ── Navigation ────────────────────────────────
  const goPrev = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };
  const toggleFilter = (f: CalendarFilter) =>
    setActiveFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );

  // ── Recurring event generator ─────────────────
  const generateRecurringEvents = (base: any, recurrence: string) => {
    const events = [];
    const start = new Date(base.startDate);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start);
      if (recurrence === "daily") d.setDate(d.getDate() + i);
      else if (recurrence === "weekly") d.setDate(d.getDate() + i * 7);
      else if (recurrence === "monthly") d.setMonth(d.getMonth() + i);
      events.push({
        ...base,
        id: base.id + "_r" + i,
        startDate: d.toISOString().split("T")[0],
      });
    }
    return events;
  };

  // ── Month view data ───────────────────────────
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days: { date: Date; isCurrentMonth: boolean; allItems: any[] }[] = [];

    for (let i = startDay - 1; i >= 0; i--)
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
        allItems: [],
      });

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = formatDateStr(d);
      const dayEvents = calendarEvents.filter((e) => {
        if (!e.recurrence) return e.startDate === dateStr;
        const recurringEvents = generateRecurringEvents(e, e.recurrence);
        return (
          recurringEvents.some((re) => re.startDate === dateStr) ||
          e.startDate === dateStr
        );
      });
      const dayTasks = tasks.filter(
        (t) => t.due && t.due.split("T")[0] === dateStr && t.status !== "done",
      );

      const allItems = [
        ...(activeFilters.includes("events")
          ? dayEvents
            .filter((e) => e.category !== "reminder")
            .map((e) => ({ ...e, type: "event" }))
          : []),

        ...(activeFilters.includes("reminders")
          ? dayEvents
            .filter((e) => e.category === "reminder")
            .map((e) => ({ ...e, type: "reminder" }))
          : []),
        ...(activeFilters.includes("tasks")
          ? dayTasks.map((t) => ({
            id: t.id,
            title: t.title,
            startTime: t.due
              ? new Date(t.due).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              : "",
            color:
              t.priority === "high"
                ? "#ef4444"
                : t.priority === "medium"
                  ? "#f59e0b"
                  : "#22c55e",
            type: "task",
            allDay: false,
            reminder: false,
            category: "task",
          }))
          : []),
      ];
      days.push({ date: d, isCurrentMonth: true, allItems });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++)
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        allItems: [],
      });
    return days;
  }, [currentDate, calendarEvents, tasks, activeFilters]);

  // ── Week view data ────────────────────────────
  const weekData = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(
      startOfWeek.getDate() -
      (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1),
    );
    const days: { date: Date; allItems: any[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateStr(d);
      const dayEvents = calendarEvents.filter((e) => e.startDate === dateStr);
      const dayTasks = tasks.filter(
        (t) => t.due && t.due.split("T")[0] === dateStr && t.status !== "done",
      );
      days.push({
        date: d,
        allItems: [
          ...(activeFilters.includes("events")
            ? dayEvents
              .filter((ev) => ev.category !== "reminder")
              .map((ev) => ({ ...ev, type: "event" }))
            : []),
          ...(activeFilters.includes("reminders")
            ? dayEvents
              .filter((ev) => ev.category === "reminder")
              .map((ev) => ({ ...ev, type: "reminder" }))
            : []),
          ...(activeFilters.includes("tasks")
            ? dayTasks.map((t) => ({
              id: t.id,
              title: t.title,
              startTime: t.due
                ? new Date(t.due).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
                : "",
              color:
                t.priority === "high"
                  ? "#ef4444"
                  : t.priority === "medium"
                    ? "#f59e0b"
                    : "#3b82f6",
              type: "task",
              allDay: false,
            }))
            : []),
        ],
      });
    }
    return days;
  }, [currentDate, calendarEvents, tasks, activeFilters]);

  const todayStr = formatDateStr(new Date());
  const todayEvents = useMemo(
    () =>
      calendarEvents
        .filter((e) => e.startDate === todayStr)
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || "")),
    [calendarEvents, todayStr],
  );
  const dayEvents = useMemo(() => {
    const ds = formatDateStr(currentDate);
    return calendarEvents
      .filter((e) => e.startDate === ds)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [currentDate, calendarEvents]);
  const agendaEvents = useMemo(
    () =>
      [...calendarEvents]
        .filter((e) => e.startDate >= todayStr)
        .sort(
          (a, b) =>
            a.startDate.localeCompare(b.startDate) ||
            (a.startTime || "").localeCompare(b.startTime || ""),
        )
        .slice(0, 20),
    [calendarEvents, todayStr],
  );

  const dayKey = getDayKey(new Date());
  const todayObservances = observances[dayKey] || [];
  const todayHistory = historyEvents[dayKey] || [];

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const isSelected = (d: Date) =>
    d.toDateString() === selectedDate.toDateString();
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  const categoryLabels: Record<string, { label: string; cls: string }> = {
    event: {
      label: "Event",
      cls: "bg-blue-500/10 text-blue-400 border-blue-400/30",
    },
    reminder: {
      label: "Reminder",
      cls: "bg-amber-500/10 text-amber-400 border-amber-400/30",
    },
    task: {
      label: "Task",
      cls: "bg-green-500/10 text-green-400 border-green-400/30",
    },
  };

  // Auto-scroll to current time in day view
  useEffect(() => {
    if (view === 'day' && dayViewRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= 7 && currentHour <= 23) {
        const scrollTo = (currentHour - 7) * 50;
        setTimeout(() => {
          dayViewRef.current?.scrollTo({ top: scrollTo, behavior: 'smooth' });
        }, 100);
      }
    }
  }, [view, currentDate]);

  // ── Modal handlers ────────────────────────────
  const openAddModal = (date?: Date, startTime?: string) => {
    setEditingEvent(null);
    const d = date || selectedDate;
    setEventDate(d.toISOString().split("T")[0]);
    setEventEndDate("");
    setEventTitle("");
    setEventStartTime(startTime || "");
    setEventEndTime(startTime ? `${parseInt(startTime) + 1}:00` : "");
    setEventAllDay(false);
    setEventColor("#ef4444");
    setEventDesc("");
    setEventReminder(true);
    setEventCategory("event");
    setEventRecurring("none");
    setIsMultiDay(false);
    setShowEventModal(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDate(event.startDate);
    setEventEndDate(event.endDate || "");
    setEventStartTime(event.startTime || "");
    setEventEndTime(event.endTime || "");
    setEventAllDay(event.allDay);
    setEventColor(event.color);
    setEventDesc(event.description || "");
    setEventReminder(event.reminder ?? true);
    setEventCategory((event.category as "event" | "reminder") || "event");
    setEventRecurring(event.recurrence || "none");
    setIsMultiDay(!!event.endDate);
    setShowEventModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    const data: any = {
      title: eventTitle.trim(),
      description: eventDesc.trim() || undefined,
      startDate: eventDate,
      endDate: isMultiDay ? eventEndDate || undefined : undefined,
      startTime: eventAllDay ? undefined : eventStartTime || undefined,
      endTime: eventAllDay ? undefined : eventEndTime || undefined,
      allDay: eventAllDay,
      color: eventColor,
      reminder: eventReminder,
      category: eventCategory,
      recurrence: eventRecurring !== "none" ? eventRecurring : undefined,
    };
    if (editingEvent) updateCalendarEvent(editingEvent.id, data);
    else addCalendarEvent(data);
    setShowEventModal(false);
  };

  const handleTooltip = (e: React.MouseEvent, item: any) => {
    setTooltip({ event: item, x: e.clientX + 12, y: e.clientY - 12 });
  };

  // ════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-primary" />
            </span>
            Calendar
          </h2>
        </div>
        <button
          onClick={() => openAddModal()}
          className="bg-primary text-primary-foreground px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:shadow-glow-cyan transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
      </div>



      {/* ── Calendar Main Area ── */}
      <div className="flex gap-4">
        <div className="hidden lg:flex flex-col gap-3 w-48 shrink-0">
          <button
            onClick={() => openAddModal()}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-xs font-medium hover:shadow-glow-cyan transition-all"
          >
            + Create
          </button>
          {/*Mini Calendar*/}
          <div className="widget !p-3">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setMonth(d.getMonth() - 1);
                  setCurrentDate(d);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-mono font-semibold">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setMonth(d.getMonth() + 1);
                  setCurrentDate(d);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <span
                  key={d}
                  className="text-[7px] font-mono text-muted-foreground py-1"
                >
                  {d}
                </span>
              ))}
              {monthData.map((day, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentDate(day.date);
                    setSelectedDate(day.date);
                  }}
                  className={cn(
                    "text-[9px] font-mono rounded-md py-1 transition-all",
                    !day.isCurrentMonth && "opacity-25",
                    isToday(day.date) && "bg-primary/10 text-primary font-bold",
                    isSelected(day.date) &&
                    !isToday(day.date) &&
                    "bg-hover/50 text-foreground",
                    !isToday(day.date) &&
                    !isSelected(day.date) &&
                    "text-muted-foreground hover:bg-hover/30",
                  )}
                >
                  <span className="relative">
                    {day.date.getDate()}
                    {day.allItems.length > 0 && (
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_4px_var(--primary)]" />
                    )}
                  </span>
                </button>
              ))}
            </div>

          </div>

          {/* ── Today's Schedule ── */}
          <div className="widget !p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono uppercase text-muted-foreground">📅 Today</span>
              <span className="text-[7px] font-mono text-muted-foreground">{todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-y-auto scrollbar-none" style={{ height: '100px' }}>
              {todayEvents.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[9px] text-muted-foreground font-mono italic">No events today</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {todayEvents.map(e => (
                    <div key={e.id} onClick={() => openEditModal(e)} className="flex items-center gap-2 text-[9px] cursor-pointer hover:bg-hover/30 rounded px-1.5 py-1 transition-colors group">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color }} />
                      <span className="truncate flex-1">{e.title}</span>
                      <span className="text-[7px] text-muted-foreground font-mono shrink-0">{e.allDay ? 'All day' : e.startTime || '--:--'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setView('day'); goToday(); }} className="text-[8px] text-primary font-mono hover:opacity-70 w-full text-left mt-2 pt-2 border-t border-border/50">
              View full day →
            </button>
          </div>

          <div className="widget !p-3 space-y-2">
            <div className="text-[9px] font-mono uppercase text-muted-foreground mb-2">
              Show
            </div>
            {[
              {
                id: "events" as CalendarFilter,
                label: "Events",
                dot: "#3b82f6",
              },
              {
                id: "reminders" as CalendarFilter,
                label: "Reminders",
                dot: "#f59e0b",
              },
              { id: "tasks" as CalendarFilter, label: "Tasks", dot: "#22c55e" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={cn(
                  "w-full flex items-center gap-2 text-[10px] font-mono px-2 py-1.5 rounded-md transition-all",
                  activeFilters.includes(f.id)
                    ? "bg-hover/50 text-foreground"
                    : "text-muted-foreground/50 line-through",
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: f.dot,
                    opacity: activeFilters.includes(f.id) ? 1 : 0.3,
                  }}
                />
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Weather Widget ── */}
          <div className="widget !p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono uppercase text-muted-foreground">🌤️ Weather</span>
              <button onClick={() => setShowWeatherConfig(!showWeatherConfig)} className="text-[7px] text-muted-foreground hover:text-primary font-mono">
                <MapPin className="w-2.5 h-2.5 inline" /> {weatherCity}
              </button>
            </div>
            {showWeatherConfig && (
              <input value={weatherCity} onChange={e => setWeatherCity(e.target.value)} placeholder="City" className="w-full bg-section border border-border rounded-md px-2 py-1 text-[9px] font-mono mb-2 outline-none focus:border-primary" />
            )}
            {weather ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <WeatherIcon className="w-7 h-7 text-sky-400" />
                  <div>
                    <span className="text-lg font-bold text-sky-300">{weather.temp}°C</span>
                    <p className="text-[8px] text-sky-400/70 font-mono">{weather.condition}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-border/50">
                  <div className="text-center">
                    <p className="text-[7px] font-mono text-muted-foreground uppercase">Humidity</p>
                    <p className="text-[10px] font-mono text-sky-300">{weather.humidity}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-mono text-muted-foreground uppercase">Wind</p>
                    <p className="text-[10px] font-mono text-sky-300">{weather.windSpeed} km/h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] font-mono text-muted-foreground uppercase">UV</p>
                    <p className="text-[10px] font-mono" style={{ color: weather.uvIndex <= 2 ? '#22c55e' : weather.uvIndex <= 5 ? '#f59e0b' : weather.uvIndex <= 7 ? '#f97316' : '#ef4444' }}>{weather.uvIndex}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[9px] text-muted-foreground font-mono">Loading...</p>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="p-1.5 hover:bg-hover rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold min-w-[160px] text-center">
                {view === "month" &&
                  `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                {view === "week" &&
                  `Week of ${weekData[0]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                {view === "day" &&
                  currentDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                {view === "agenda" && "Upcoming"}
              </span>
              <button
                onClick={goNext}
                className="p-1.5 hover:bg-hover rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={goToday}
                className="text-[10px] font-mono text-primary hover:opacity-70 ml-2 px-2 py-1 bg-primary/5 rounded-md"
              >
                Today
              </button>
            </div>
            <div className="flex gap-1 bg-section rounded-lg p-0.5">
              {(["day", "week", "month", "agenda"] as ViewType[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[10px] font-mono capitalize transition-all",
                    view === v
                      ? "bg-primary/15 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div
            className="overflow-y-auto scrollbar-none"
            style={{ height: "700px" }}
          >
            {/* MONTH */}
            {view === "month" && (
              <div className="widget !p-2">
                <div className="grid grid-cols-8">
                  <div className="text-center text-[7px] font-mono text-muted-foreground py-2 border-b border-border/50">#</div>
                  {WEEKDAYS.map(d => <div key={d} className="text-center text-[9px] font-mono text-muted-foreground py-2 border-b border-border/50">{d}</div>)}
                  {monthData.map((day, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedDate(day.date);
                        setView("day");
                        setCurrentDate(day.date);
                      }}
                      className={cn(
                        "min-h-[85px] border-b border-r border-border/30 p-1.5 cursor-pointer hover:bg-hover/20 transition-colors",
                        (i + 1) % 8 === 7 && 'border-r-0',
                        !day.isCurrentMonth && "opacity-30",
                        isToday(day.date) && "bg-primary/[0.04]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px] font-mono",
                          isToday(day.date) &&
                          "bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center font-bold",
                        )}
                      >
                        {day.date.getDate()}
                      </span>
                      <div className="space-y-0.5 mt-1">
                        {day.allItems.slice(0, 2).map((item: any) => (
                          <div
                            key={item.id}
                            className="text-[8px] truncate rounded px-1 py-0.5 font-mono"
                            style={{
                              background: item.color + "18",
                              color: item.color,
                              borderLeft: "2px solid " + item.color,
                            }}
                            onMouseEnter={(ev) => handleTooltip(ev, item)}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {!item.allDay && (item.startTime ? <span>{item.startTime} </span> : <span>--:-- </span>)}
                            {item.title}
                            {item.type === "reminder" && " 🔔"}
                          </div>
                        ))}
                        {day.allItems.length > 2 && <div className="text-[10px] font-mono px-1" style={{ color: '#ffffff' }}>+{day.allItems.length - 2} more</div>}

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DAY */}
            {view === 'day' && (
              <div className="widget !p-3" ref={dayViewRef}>
                {dayEvents.filter((e) => e.allDay).length > 0 && (
                  <div className="mb-2 space-y-1">
                    {dayEvents
                      .filter((e) => e.allDay)
                      .map((e) => (
                        <div
                          key={e.id}
                          onClick={() => openEditModal(e)}
                          onMouseEnter={(ev) => handleTooltip(ev, e)}
                          onMouseLeave={() => setTooltip(null)}
                          className="text-[10px] rounded-lg px-2 py-1.5 cursor-pointer hover:opacity-80"
                          style={{
                            background: e.color + "18",
                            color: e.color,
                            borderLeft: "3px solid " + e.color,
                          }}
                        >
                          {e.title} · All day{e.recurrence && ` 🔄`}
                        </div>
                      ))}
                  </div>
                )}
                <div className="space-y-0">
                  {Array.from({ length: 17 }, (_, i) => i + 7).map((hour) => {
                    const timeLabel = `${String(hour).padStart(2, "0")}:00`;
                    const hourEvents = dayEvents.filter(e => {
                      if (e.allDay) return false;
                      if (!e.startTime) return hour === 7; // Show untimed events at 7am slot
                      return parseInt(e.startTime?.split(':')[0] || '0') === hour;
                    });
                    const isNow = currentHour === hour && isToday(currentDate);
                    return (
                      <div key={hour} className={cn('flex border-t border-border/30 min-h-[42px] relative hover:bg-primary/[0.02] transition-colors', isNow && 'bg-primary/[0.04]')}>
                        <div className="w-14 text-[9px] font-mono text-muted-foreground pt-1 pr-3 text-right shrink-0">
                          {timeLabel}
                        </div>
                        <div
                          className="flex-1 py-0.5 relative"
                          onClick={() =>
                            openAddModal(
                              currentDate,
                              timeLabel.replace(":00", ""),
                            )
                          }
                        >
                          {isNow && (
                            <div
                              className="absolute left-0 right-0 z-10 pointer-events-none"
                              style={{ top: `${(currentMinute / 60) * 100}%` }}
                            >
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                                <div className="flex-1 h-px bg-red-400/60" />
                              </div>
                            </div>
                          )}
                          {hourEvents.map((e) => (
                            <div
                              key={e.id}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                openEditModal(e);
                              }}
                              onMouseEnter={(ev) => handleTooltip(ev, e)}
                              onMouseLeave={() => setTooltip(null)}
                              className="text-[10px] rounded-lg px-2 py-1 mb-0.5 cursor-pointer hover:opacity-80 relative z-5"
                              style={{
                                background: e.color + "18",
                                color: e.color,
                                borderLeft: "3px solid " + e.color,
                              }}
                            >
                              <span className="font-mono font-bold">
                                {e.startTime}
                              </span>{" "}
                              {e.title}
                              {e.reminder && " 🔔"}
                              {e.recurrence && " 🔄"}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WEEK */}
            {view === "week" && (
              <div className="widget !p-3 overflow-x-auto">
                <div className="grid grid-cols-8 gap-1 min-w-[600px]">
                  <div className="text-[9px] font-mono text-muted-foreground py-2" />
                  {weekData.map((d, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-center text-[10px] font-mono py-2",
                        isToday(d.date) &&
                        "text-primary font-bold bg-primary/5 rounded-t-lg",
                      )}
                    >
                      {WEEKDAYS[i]} {d.date.getDate()}
                    </div>
                  ))}
                  {Array.from({ length: 17 }, (_, i) => i + 7).map((hour) => {
                    const tl = `${String(hour).padStart(2, "0")}:00`;
                    return (
                      <div key={hour} className="contents">
                        <div className="text-[8px] font-mono text-muted-foreground text-right pr-2 py-3 border-t border-border/30">
                          {tl}
                        </div>
                        {weekData.map((d, i) => {
                          const hi = d.allItems.filter((item: any) => {
                            if (item.allDay) return false;
                            if (!item.startTime) return hour === 7;
                            return parseInt(item.startTime?.split(':')[0] || '0') === hour;
                          });
                          return (
                            <div
                              key={i}
                              className="border-t border-border/30 py-1 min-h-[36px]"
                            >
                              {hi.map((item: any) => (
                                <div
                                  key={item.id}
                                  onClick={() => openEditModal(item)}
                                  onMouseEnter={(ev) => handleTooltip(ev, item)}
                                  onMouseLeave={() => setTooltip(null)}
                                  className="text-[7px] rounded px-1 py-0.5 mb-0.5 cursor-pointer truncate font-mono"
                                  style={{
                                    background: item.color + "25",
                                    color: item.color,
                                    borderLeft: "2px solid " + item.color,
                                  }}
                                >
                                  {item.title}
                                  {item.type === "reminder" && "🔔"}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AGENDA */}
            {view === "agenda" && (
              <div className="widget !p-3">
                {agendaEvents.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground font-mono py-4 text-center">
                    No upcoming events
                  </p>
                ) : (
                  <div className="space-y-2">
                    {agendaEvents.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => openEditModal(e)}
                        onMouseEnter={(ev) => handleTooltip(ev, e)}
                        onMouseLeave={() => setTooltip(null)}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-section/40 hover:bg-hover/30 cursor-pointer transition-colors group"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                          style={{ background: e.color, color: e.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] truncate">{e.title}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">
                            {new Date(e.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            {e.allDay
                              ? " · All day"
                              : e.startTime
                                ? ` · ${e.startTime}${e.endTime ? " – " + e.endTime : ""}`
                                : ""}
                            {e.reminder && " · 🔔"}
                            {e.recurrence && ` · 🔄 ${e.recurrence}`}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-[8px] font-mono px-1.5 py-0.5 rounded-full border",
                            categoryLabels[e.category || "event"]?.cls,
                          )}
                        >
                          {categoryLabels[e.category || "event"]?.label ||
                            "Event"}
                        </span>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setShowDeleteConfirm(e);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating Tooltip ── */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-[200] bg-card border border-border rounded-xl p-3 shadow-2xl shadow-black/40 w-56 animate-fade-in pointer-events-none"
          style={{
            left: Math.min(tooltip.x, window.innerWidth - 240),
            top: Math.min(Math.max(tooltip.y, 10), window.innerHeight - 150),
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: tooltip.event.color }}
            />
            <span className="text-xs font-semibold truncate">
              {tooltip.event.title}
            </span>
          </div>
          {tooltip.event.allDay ? (
            <p className="text-[10px] text-muted-foreground font-mono">
              All day
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground font-mono">
              {tooltip.event.startTime || "?"}
              {tooltip.event.endTime ? " – " + tooltip.event.endTime : ""}
            </p>
          )}
          {tooltip.event.description && (
            <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              {tooltip.event.description}
            </p>
          )}
          {(tooltip.event.category === "reminder" ||
            tooltip.event.type === "reminder") && (
              <p className="text-[9px] text-amber-400 font-mono mt-1">
                🔔 Reminder
              </p>
            )}
          {tooltip.event.recurrence && (
            <p className="text-[9px] text-blue-400 font-mono mt-1">
              🔄 {tooltip.event.recurrence}
            </p>
          )}
        </div>
      )}
      {/* ── Add/Edit Modal ── */}
      {showEventModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowEventModal(false)}
        >
          <form
            onSubmit={handleSaveEvent}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editingEvent ? "Edit" : "New"}{" "}
                {eventCategory === "reminder" ? "Reminder" : "Event"}
              </h3>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[9px] font-mono uppercase text-muted-foreground mb-1.5 block">
                Type
              </label>
              <div className="flex gap-2">
                {(["event", "reminder"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setEventCategory(cat);
                      setEventColor(cat === "reminder" ? "#f59e0b" : "#3b82f6");
                    }}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[10px] font-mono capitalize border transition-all",
                      eventCategory === cat
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder={
                eventCategory === "reminder" ? "Reminder title" : "Event title"
              }
              maxLength={50}
              className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-mono text-muted-foreground mb-1 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    if (!isMultiDay) setEventEndDate("");
                  }}
                  className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-[8px] font-mono text-muted-foreground mb-1 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => {
                    setEventEndDate(e.target.value);
                    if (e.target.value) setIsMultiDay(true);
                    else setIsMultiDay(false);
                  }}
                  className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventAllDay}
                  onChange={(e) => setEventAllDay(e.target.checked)}
                  className="rounded"
                />{" "}
                All day
              </label>
              <label className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventReminder}
                  onChange={(e) => setEventReminder(e.target.checked)}
                  className="rounded"
                />{" "}
                {eventReminder ? (
                  <Bell className="w-3 h-3" />
                ) : (
                  <BellOff className="w-3 h-3" />
                )}{" "}
                Reminder
              </label>
            </div>
            {!eventAllDay && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-mono text-muted-foreground mb-1 block">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-mono text-muted-foreground mb-1 block">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-[8px] font-mono text-muted-foreground mb-1 block">
                Repeat
              </label>
              <select
                value={eventRecurring}
                onChange={(e) => setEventRecurring(e.target.value as any)}
                className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <textarea
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-section border border-border rounded-lg px-3 py-2 text-sm font-mono focus:border-primary outline-none resize-none"
            />
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEventColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    eventColor === c && "ring-2 ring-white scale-110",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {editingEvent && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(editingEvent);
                    setShowEventModal(false);
                  }}
                  className="flex-1 bg-destructive/10 text-destructive border border-destructive/30 py-2.5 rounded-lg text-xs font-medium hover:bg-destructive/20 transition-all"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg text-xs font-medium hover:shadow-glow-cyan transition-all"
              >
                {editingEvent ? "Save" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 text-center shadow-xl"
          >
            <p className="text-sm">Delete "{showDeleteConfirm.title}"?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-section border border-border text-muted-foreground py-2.5 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteCalendarEvent(showDeleteConfirm.id);
                  setShowDeleteConfirm(null);
                }}
                className="flex-1 bg-destructive text-white py-2.5 rounded-lg text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
