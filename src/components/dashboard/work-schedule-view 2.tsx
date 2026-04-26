"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Clock,
  MapPin,
  Save,
  Check,
  X,
  Upload,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Camera,
  Image as ImageIcon,
  Table2,
  CalendarDays,
  CalendarPlus,
  Edit3,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useApp } from "../../lib/store";
import { supabase } from "../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkDay {
  id?: string;
  day_of_week: number; // 0=Sun … 6=Sat (stored in DB)
  start_time: string; // "09:00"
  end_time: string; // "17:00"
  is_active: boolean;
  location?: string;
}

// What the server /analyze-schedule returns
interface AIShift {
  date: string; // "2025-03-24"
  day_name: string; // "Monday"
  start: string; // "09:00"
  end: string; // "17:00"
}

interface AIScheduleResult {
  found: boolean;
  shifts?: AIShift[];
  location?: string | null;
  notes?: string | null;
  raw_text?: string;
  error?: string;
}

const DEFAULT_WORK_DAY = {
  start_time: "09:00",
  end_time: "17:00",
  is_active: true,
  location: "",
};

// English day name → day-of-week number
const DAY_NAME_TO_DOW: Record<string, number> = {
  sunday: 0,
  dimanche: 0,
  الأحد: 0,
  monday: 1,
  lundi: 1,
  الاثنين: 1,
  tuesday: 2,
  mardi: 2,
  الثلاثاء: 2,
  wednesday: 3,
  mercredi: 3,
  الأربعاء: 3,
  thursday: 4,
  jeudi: 4,
  الخميس: 4,
  friday: 5,
  vendredi: 5,
  الجمعة: 5,
  saturday: 6,
  samedi: 6,
  السبت: 6,
};

// Next N occurrences of a specific day-of-week starting from today
function nextDatesForDow(dow: number, count = 4): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let checked = 0;
  while (dates.length < count && checked < 28) {
    if (d.getDay() === dow) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() + 1);
    checked++;
  }
  return dates;
}

// Format "2025-01-20" → "Mon Jan 20"
function fmtDate(iso: string, language: string): string {
  try {
    const d = new Date(iso + "T12:00:00");
    if (language === "ar") {
      return d.toLocaleDateString("ar-SA", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
    if (language === "fr") {
      return d.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WorkScheduleView() {
  const { user, language, addEvent } = useApp();
  const isRTL = language === "ar";

  const displayName: string =
    (user as any)?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const DAY_NAMES =
    language === "ar"
      ? [
          "الأحد",
          "الاثنين",
          "الثلاثاء",
          "الأربعاء",
          "الخميس",
          "الجمعة",
          "السبت",
        ]
      : language === "fr"
        ? [
            "Dimanche",
            "Lundi",
            "Mardi",
            "Mercredi",
            "Jeudi",
            "Vendredi",
            "Samedi",
          ]
        : [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];

  const DAY_SHORT =
    language === "ar"
      ? ["أح", "اث", "ثل", "أر", "خم", "جم", "سب"]
      : language === "fr"
        ? ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ── State ──────────────────────────────────────────────────────────────────
  const [schedule, setSchedule] = useState<WorkDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalLocation, setGlobalLocation] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  // Upload / AI state
  const [uploadState, setUploadState] = useState<
    "idle" | "analyzing" | "review" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [aiResult, setAiResult] = useState<AIScheduleResult | null>(null); // raw AI result for review

  // Upcoming dates section
  const [showUpcoming, setShowUpcoming] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().getDay();

  // ── Load schedule from Supabase ────────────────────────────────────────────
  const loadSchedule = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("user_id", user.id)
        .order("day_of_week");
      if (data?.length) {
        setSchedule(
          data.map((r) => ({
            id: r.id,
            day_of_week: r.day_of_week,
            start_time: r.start_time,
            end_time: r.end_time,
            is_active: r.is_active,
            location: r.location ?? "",
          })),
        );
        const first = data.find((r) => r.is_active && r.location);
        if (first?.location) setGlobalLocation(first.location);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const todaySchedule = schedule.find(
    (d) => d.day_of_week === today && d.is_active,
  );
  const activeDays = schedule.filter((d) => d.is_active);

  // Build upcoming dates list for active days (next 14 days)
  const upcomingDates = activeDays
    .flatMap((ws) => {
      const dates: { dateStr: string; ws: WorkDay }[] = [];
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      for (let i = 0; i <= 14; i++) {
        if (d.getDay() === ws.day_of_week) {
          dates.push({ dateStr: d.toISOString().split("T")[0], ws });
        }
        d.setDate(d.getDate() + 1);
      }
      return dates;
    })
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // ── Day editor helpers ─────────────────────────────────────────────────────
  const toggleDay = (dow: number) => {
    setSchedule((prev) => {
      const exists = prev.find((d) => d.day_of_week === dow);
      if (exists)
        return prev.map((d) =>
          d.day_of_week === dow ? { ...d, is_active: !d.is_active } : d,
        );
      return [
        ...prev,
        { day_of_week: dow, ...DEFAULT_WORK_DAY, location: globalLocation },
      ].sort((a, b) => a.day_of_week - b.day_of_week);
    });
  };
  const updateDay = (dow: number, field: keyof WorkDay, val: string) =>
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dow ? { ...d, [field]: val } : d)),
    );
  const removeDay = (dow: number) =>
    setSchedule((prev) => prev.filter((d) => d.day_of_week !== dow));
  const applyGlobalLocation = () =>
    setSchedule((prev) =>
      prev.map((d) => (d.is_active ? { ...d, location: globalLocation } : d)),
    );

  // ── Save to Supabase ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const active = schedule.filter((d) => d.is_active);
      const inactiveDows = [0, 1, 2, 3, 4, 5, 6].filter(
        (dow) => !active.find((d) => d.day_of_week === dow),
      );
      if (inactiveDows.length)
        await supabase
          .from("work_schedules")
          .delete()
          .eq("user_id", user.id)
          .in("day_of_week", inactiveDows);
      if (active.length) {
        const { error: e } = await supabase.from("work_schedules").upsert(
          active.map((d) => ({
            user_id: user.id,
            day_of_week: d.day_of_week,
            start_time: d.start_time,
            end_time: d.end_time,
            is_active: true,
            location: d.location || globalLocation || null,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,day_of_week" },
        );
        if (e) throw e;
      }
      setSaved(true);
      setUploadState("idle");
      setAiResult(null);
      setTimeout(() => {
        setSaved(false);
        setShowEditor(false);
      }, 1800);
      await loadSchedule();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete entire schedule from Supabase ──────────────────────────────────
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteAll = async () => {
    if (!user) return;
    setDeleting(true);
    setError(null);
    try {
      await supabase.from("work_schedules").delete().eq("user_id", user.id);
      setSchedule([]);
      setGlobalLocation("");
      setShowEditor(false);
      setConfirmDelete(false);
      setUploadState("idle");
      setAiResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Add today as calendar event ────────────────────────────────────────────
  const addTodayAsEvent = async () => {
    if (!todaySchedule) return;
    await addEvent({
      title:
        language === "ar"
          ? "يوم عمل"
          : language === "fr"
            ? "Journée de travail"
            : "Work Day",
      date: new Date().toISOString().split("T")[0],
      time: todaySchedule.start_time,
      location: todaySchedule.location || globalLocation || undefined,
      notes: `${todaySchedule.start_time} – ${todaySchedule.end_time}`,
      source: "work_schedule",
      is_done: false,
    });
  };

  // ── Add a specific date as calendar event ──────────────────────────────────
  const addDateAsEvent = async (dateStr: string, ws: WorkDay) => {
    await addEvent({
      title:
        language === "ar"
          ? "يوم عمل"
          : language === "fr"
            ? "Journée de travail"
            : "Work Day",
      date: dateStr,
      time: ws.start_time,
      location: ws.location || globalLocation || undefined,
      notes: `${ws.start_time} – ${ws.end_time}`,
      source: "work_schedule",
      is_done: false,
    });
  };

  // ── AI: apply extracted result to schedule state ───────────────────────────
  const applyAIResult = (result: AIScheduleResult) => {
    const loc = result.location || "";
    if (loc) setGlobalLocation(loc);

    const shifts = result.shifts || [];

    if (shifts.length > 0) {
      // Group by day-of-week, keep the most common start/end for each
      const byDow: Record<
        number,
        { starts: string[]; ends: string[]; location: string }
      > = {};
      for (const s of shifts) {
        try {
          const dow = new Date(s.date + "T12:00:00").getDay();
          if (!byDow[dow]) byDow[dow] = { starts: [], ends: [], location: loc };
          if (s.start) byDow[dow].starts.push(s.start);
          if (s.end) byDow[dow].ends.push(s.end);
        } catch {
          /**/
        }
      }
      // Most-frequent value helper
      const mode = (arr: string[]) => {
        const freq: Record<string, number> = {};
        arr.forEach((v) => {
          freq[v] = (freq[v] || 0) + 1;
        });
        return (
          Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || arr[0]
        );
      };
      const newSchedule = Object.entries(byDow)
        .map(([dow, v]) => ({
          day_of_week: Number(dow),
          start_time: v.starts.length ? mode(v.starts) : "",
          end_time: v.ends.length ? mode(v.ends) : "",
          is_active: true,
          location: loc || globalLocation,
        }))
        .sort((a, b) => a.day_of_week - b.day_of_week);
      setSchedule(newSchedule);
    } else {
      // No shifts — open editor empty so user can fill manually
      setSchedule([]);
    }
    setShowEditor(true);
  };

  // ── Send file to server ────────────────────────────────────────────────────
  const analyzeFile = async (file: File) => {
    setUploadState("analyzing");
    setUploadError("");
    setAiResult(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }

    try {
      const backendUrl =
        (import.meta as any).env?.VITE_BACKEND_API || "http://localhost:4000";
      const formData = new FormData();
      formData.append("image", file, file.name);

      let result: AIScheduleResult | null = null;

      // Try /analyze-schedule first (structured, user-aware)
      try {
        const r = await fetch(`${backendUrl}/analyze-schedule`, {
          method: "POST",
          headers: {
            "X-User-Name": displayName,
            "X-User-Email": user?.email || "",
          },
          body: formData,
        });
        if (r.ok) {
          result = await r.json();
        } else if (r.status === 404) {
          // Not found by name — treat as error
          const body = await r.json().catch(() => ({}));
          throw new Error(
            body.error || `"${displayName}" was not found in this schedule`,
          );
        }
      } catch (e) {
        // Re-throw 404 errors (name not found)
        if ((e as Error).message.includes("not found")) throw e;
        // Other errors → fall through to /analyze-image
      }

      // No fallback — /analyze-schedule is the only endpoint.
      // If it failed (not 404), the error was already thrown above.
      if (!result) {
        throw new Error(
          language === "ar"
            ? "فشل الاتصال بالخادم — تأكد من تشغيل الخادم"
            : language === "fr"
              ? "Impossible de joindre le serveur — vérifiez qu'il est démarré"
              : "Could not reach server — make sure it is running",
        );
      }

      // Show AI result for review before applying
      setAiResult(result as AIScheduleResult);
      applyAIResult(result as AIScheduleResult);
      setUploadState("review");
      setPreviewUrl((prev) => prev); // keep preview visible
    } catch (e) {
      setUploadError((e as Error).message || "Failed to analyze file");
      setUploadState("error");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) analyzeFile(f);
    e.target.value = "";
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) analyzeFile(f);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`px-4 pb-32 space-y-4 pt-2 ${isRTL ? "dir-rtl" : ""}`}>
      {/* ── Today Card ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="p-4">
          <div
            className={`flex items-center gap-3 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                {DAY_NAMES[today]} ·{" "}
                {new Date().toLocaleDateString(
                  language === "ar"
                    ? "ar-SA"
                    : language === "fr"
                      ? "fr-FR"
                      : "en-US",
                  { month: "short", day: "numeric" },
                )}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {todaySchedule
                  ? language === "ar"
                    ? "ساعات العمل اليوم"
                    : language === "fr"
                      ? "Horaires du jour"
                      : "Today's work hours"
                  : language === "ar"
                    ? "لا يوجد عمل اليوم"
                    : language === "fr"
                      ? "Pas de travail aujourd'hui"
                      : "No work today"}
              </p>
            </div>
            {todaySchedule && (
              <button
                onClick={addTodayAsEvent}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-colors"
              >
                +{" "}
                {language === "ar"
                  ? "إضافة"
                  : language === "fr"
                    ? "Ajouter"
                    : "Add"}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">
                {language === "ar"
                  ? "جاري التحميل..."
                  : language === "fr"
                    ? "Chargement..."
                    : "Loading..."}
              </span>
            </div>
          ) : todaySchedule ? (
            <div className="space-y-2">
              <div
                className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xl font-bold text-foreground tracking-tight">
                  {todaySchedule.start_time} – {todaySchedule.end_time}
                </span>
              </div>
              {(todaySchedule.location || globalLocation) && (
                <div
                  className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {todaySchedule.location || globalLocation}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {language === "ar"
                ? "لا يوجد جدول عمل لليوم"
                : language === "fr"
                  ? "Pas d'horaire défini"
                  : "No schedule defined for today"}
            </p>
          )}
        </div>

        {/* Weekly strip */}
        {activeDays.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                const d = schedule.find(
                  (s) => s.day_of_week === dow && s.is_active,
                );
                const isTodayDow = dow === today;
                return (
                  <div
                    key={dow}
                    className={`flex-1 rounded-xl py-2 flex flex-col items-center gap-0.5 transition-all ${
                      d
                        ? isTodayDow
                          ? "bg-blue-500 text-white"
                          : "bg-blue-500/15 text-blue-400"
                        : "bg-secondary/30 text-muted-foreground/40"
                    }`}
                  >
                    <span className="text-[10px] font-bold">
                      {DAY_SHORT[dow]}
                    </span>
                    {d && (
                      <span className="text-[9px] opacity-80">
                        {d.start_time.slice(0, 5)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Upcoming Dates ──────────────────────────────────────────────────── */}
      {activeDays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <button
            onClick={() => setShowUpcoming((p) => !p)}
            className={`w-full flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div className="h-8 w-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {language === "ar"
                  ? "المواعيد القادمة (14 يوم)"
                  : language === "fr"
                    ? "Prochains jours travaillés"
                    : "Upcoming work days (14 days)"}
              </span>
            </div>
            <div
              className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <span className="text-xs text-muted-foreground">
                {upcomingDates.length}
              </span>
              {showUpcoming ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {showUpcoming && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border divide-y divide-border/50">
                  {upcomingDates.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {language === "ar"
                        ? "لا توجد أيام عمل قادمة"
                        : "No upcoming work days"}
                    </p>
                  ) : (
                    upcomingDates.map(({ dateStr, ws }, i) => {
                      const isToday =
                        dateStr === new Date().toISOString().split("T")[0];
                      return (
                        <div
                          key={`${dateStr}-${ws.day_of_week}`}
                          className={`flex items-center gap-3 px-4 py-3 ${isToday ? "bg-blue-500/5" : ""} ${isRTL ? "flex-row-reverse" : ""}`}
                        >
                          {/* Date pill */}
                          <div
                            className={`shrink-0 w-12 text-center rounded-xl py-1.5 ${isToday ? "bg-blue-500 text-white" : "bg-secondary/50 text-foreground"}`}
                          >
                            <p className="text-[10px] font-semibold opacity-70">
                              {
                                DAY_SHORT[
                                  new Date(dateStr + "T12:00:00").getDay()
                                ]
                              }
                            </p>
                            <p className="text-base font-bold leading-none">
                              {new Date(dateStr + "T12:00:00").getDate()}
                            </p>
                            <p className="text-[9px] opacity-60">
                              {new Date(
                                dateStr + "T12:00:00",
                              ).toLocaleDateString(
                                language === "fr" ? "fr-FR" : "en-US",
                                { month: "short" },
                              )}
                            </p>
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`flex items-center gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}
                            >
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-semibold text-foreground">
                                {ws.start_time} – {ws.end_time}
                              </span>
                              {isToday && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold uppercase">
                                  {language === "ar"
                                    ? "اليوم"
                                    : language === "fr"
                                      ? "Aujourd'hui"
                                      : "Today"}
                                </span>
                              )}
                            </div>
                            {(ws.location || globalLocation) && (
                              <div
                                className={`flex items-center gap-1.5 mt-0.5 ${isRTL ? "flex-row-reverse" : ""}`}
                              >
                                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {ws.location || globalLocation}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Add to calendar */}
                          <button
                            onClick={() => addDateAsEvent(dateStr, ws)}
                            className="shrink-0 p-2 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Import Staff Schedule ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {language === "ar"
                ? "استيراد جدول الموظفين"
                : language === "fr"
                  ? "Importer le planning"
                  : "Import Staff Schedule"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {language === "ar"
                ? `سيستخرج الذكاء الاصطناعي مواعيد "${displayName}" فقط`
                : language === "fr"
                  ? `L'IA extrait uniquement les horaires de "${displayName}"`
                  : `AI extracts only "${displayName}"'s shifts from the document`}
            </p>
          </div>

          {/* Upload buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploadState === "analyzing"}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 active:scale-95 transition-all disabled:opacity-40"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] font-semibold text-primary">
                {language === "ar"
                  ? "كاميرا"
                  : language === "fr"
                    ? "Caméra"
                    : "Camera"}
              </span>
            </button>
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadState === "analyzing"}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 active:scale-95 transition-all disabled:opacity-40"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-[10px] font-semibold text-violet-400">
                {language === "ar"
                  ? "صورة"
                  : language === "fr"
                    ? "Photo"
                    : "Photo"}
              </span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === "analyzing"}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 active:scale-95 transition-all disabled:opacity-40"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Table2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-semibold text-emerald-400">
                {language === "ar"
                  ? "ملف"
                  : language === "fr"
                    ? "Fichier"
                    : "File"}
              </span>
            </button>
          </div>

          {/* Drag & drop */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`rounded-xl border-2 border-dashed py-3 flex items-center justify-center gap-2 transition-all ${
              isDragging
                ? "border-primary bg-primary/8"
                : "border-border/50 bg-secondary/20"
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-[11px] text-muted-foreground/50">
              {language === "ar"
                ? "اسحب الملف هنا"
                : language === "fr"
                  ? "Glisser ici"
                  : "Drag file here"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center">
            Photo · PDF · Excel (.xlsx) · CSV
          </p>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,.xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* ── AI Status Feedback ──────────────────────────────────────────── */}
        <AnimatePresence>
          {uploadState === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="mx-4 mb-4 space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {language === "ar"
                        ? "جاري التحليل..."
                        : language === "fr"
                          ? "Analyse en cours..."
                          : "Analyzing..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === "ar"
                        ? `يبحث عن "${displayName}" في الجدول`
                        : `Searching for "${displayName}" in the document`}
                    </p>
                  </div>
                </div>
                {previewUrl && (
                  <div className="rounded-xl overflow-hidden relative">
                    <img
                      src={previewUrl}
                      alt="Schedule"
                      className="w-full h-28 object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── AI RESULT REVIEW CARD ─────────────────────────────────────── */}
          {uploadState === "review" && aiResult && (
            <motion.div
              key="review"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="mx-4 mb-4 space-y-3">
                {/* Header */}
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-400">
                      {language === "ar"
                        ? `✓ تم العثور على جدول "${displayName}"`
                        : language === "fr"
                          ? `✓ Planning de "${displayName}" extrait`
                          : `✓ Found "${displayName}"'s schedule`}
                    </p>
                    {aiResult.raw_text && (
                      <p className="text-[10px] text-emerald-600/70 truncate mt-0.5">
                        {language === "ar"
                          ? "النص المستخرج: "
                          : language === "fr"
                            ? "Texte trouvé: "
                            : "Found: "}
                        {aiResult.raw_text}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setUploadState("idle")}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Shifts list — the core of the result */}
                {(aiResult.shifts?.length || 0) > 0 && (
                  <div className="rounded-xl bg-secondary/40 border border-border overflow-hidden">
                    <div
                      className={`flex items-center justify-between px-3 py-2.5 border-b border-border/50 ${isRTL ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <CalendarDays className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                          {language === "ar"
                            ? "الأيام والمواعيد المستخرجة"
                            : language === "fr"
                              ? "Jours et horaires extraits"
                              : "Extracted shifts"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {aiResult.shifts!.length}{" "}
                        {language === "ar"
                          ? "يوم"
                          : language === "fr"
                            ? "jours"
                            : "shifts"}
                      </span>
                    </div>
                    {/* Show all shifts with real date + day + time */}
                    <div className="divide-y divide-border/30 max-h-52 overflow-y-auto">
                      {aiResult.shifts!.map((s, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-3 py-2.5 ${isRTL ? "flex-row-reverse" : ""}`}
                        >
                          {/* Date pill */}
                          <div className="shrink-0 text-center min-w-[3rem]">
                            <p className="text-[9px] text-muted-foreground font-medium">
                              {s.day_name.slice(0, 3).toUpperCase()}
                            </p>
                            <p className="text-sm font-bold text-foreground leading-none">
                              {new Date(s.date + "T12:00:00").getDate()}
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              {new Date(
                                s.date + "T12:00:00",
                              ).toLocaleDateString(
                                language === "ar"
                                  ? "ar-SA"
                                  : language === "fr"
                                    ? "fr-FR"
                                    : "en-US",
                                { month: "short" },
                              )}
                            </p>
                          </div>
                          {/* Times — show exactly what document says, warn if missing */}
                          <div className="flex-1 flex items-center gap-2">
                            <Clock
                              className={`w-3.5 h-3.5 shrink-0 ${s.start ? "text-blue-400" : "text-amber-400"}`}
                            />
                            {s.start && s.end ? (
                              <span className="text-sm font-bold text-foreground">
                                {s.start} – {s.end}
                              </span>
                            ) : s.start ? (
                              <span className="text-sm font-bold text-foreground">
                                {s.start} –&nbsp;
                                <span className="text-amber-400 font-normal text-xs">
                                  {language === "ar"
                                    ? "وقت الانتهاء غير واضح"
                                    : language === "fr"
                                      ? "fin non lue"
                                      : "end unclear"}
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs text-amber-400 font-semibold">
                                {language === "ar"
                                  ? "الوقت غير واضح في الوثيقة"
                                  : language === "fr"
                                    ? "Horaire non lisible"
                                    : "Time not readable in document"}
                              </span>
                            )}
                          </div>
                          {/* Full date string */}
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {s.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location + Notes */}
                {(aiResult.location || aiResult.notes) && (
                  <div className="rounded-xl bg-secondary/30 border border-border/50 divide-y divide-border/40">
                    {aiResult.location && (
                      <div
                        className={`flex items-center gap-3 px-3 py-2.5 ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <p className="text-sm text-foreground">
                          {aiResult.location}
                        </p>
                      </div>
                    )}
                    {aiResult.notes && (
                      <div
                        className={`flex items-start gap-3 px-3 py-2.5 ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {aiResult.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview image */}
                {previewUrl && (
                  <div className="rounded-xl overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Schedule"
                      className="w-full h-16 object-cover opacity-70"
                    />
                  </div>
                )}

                {/* Confirm / edit buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEditor(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary border border-border text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {language === "ar"
                      ? "تعديل"
                      : language === "fr"
                        ? "Modifier"
                        : "Edit"}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/25 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {language === "ar"
                      ? "حفظ الجدول"
                      : language === "fr"
                        ? "Sauvegarder"
                        : "Save schedule"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {uploadState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="mx-4 mb-4 flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1">{uploadError}</p>
                <button onClick={() => setUploadState("idle")}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Schedule Editor ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <button
          onClick={() => setShowEditor((p) => !p)}
          className={`w-full flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <div
            className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground">
                {language === "ar"
                  ? "تعديل جدول العمل"
                  : language === "fr"
                    ? "Modifier le planning"
                    : "Edit work schedule"}
              </span>
              {activeDays.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {activeDays.length}{" "}
                  {language === "ar"
                    ? "أيام نشطة"
                    : language === "fr"
                      ? "jours actifs"
                      : "active days"}
                </p>
              )}
            </div>
          </div>
          {showEditor ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                {/* Global location */}
                <div className="space-y-1.5">
                  <label
                    className={`text-xs font-medium text-muted-foreground flex items-center gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {language === "ar"
                      ? "موقع العمل"
                      : language === "fr"
                        ? "Lieu de travail"
                        : "Work location"}
                  </label>
                  <div
                    className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <input
                      type="text"
                      value={globalLocation}
                      onChange={(e) => setGlobalLocation(e.target.value)}
                      placeholder={
                        language === "ar"
                          ? "المكتب، المستشفى..."
                          : language === "fr"
                            ? "Bureau, hôpital..."
                            : "Office, hospital..."
                      }
                      className="flex-1 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                      onClick={applyGlobalLocation}
                      className="px-3 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                    >
                      {language === "ar"
                        ? "للكل"
                        : language === "fr"
                          ? "Tous"
                          : "Apply all"}
                    </button>
                  </div>
                </div>

                {/* Day chips */}
                <div className="flex gap-1.5 flex-wrap">
                  {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                    const active = !!schedule.find(
                      (d) => d.day_of_week === dow && d.is_active,
                    );
                    return (
                      <motion.button
                        key={dow}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => toggleDay(dow)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          active
                            ? "bg-blue-500 text-white"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        {DAY_SHORT[dow]}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Per-day time rows */}
                <AnimatePresence>
                  {activeDays.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {language === "ar"
                        ? "لا توجد أيام عمل — اختر يوماً أعلاه"
                        : "No work days — tap a day above"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activeDays.map((day) => (
                        <motion.div
                          key={day.day_of_week}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5"
                        >
                          <div
                            className={`flex items-center gap-2 p-2.5 rounded-xl border ${!day.start_time ? "bg-amber-500/8 border-amber-500/30" : "bg-secondary/30 border-border"} ${isRTL ? "flex-row-reverse" : ""}`}
                          >
                            <span className="text-xs font-bold text-foreground w-8 shrink-0">
                              {DAY_SHORT[day.day_of_week]}
                            </span>
                            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <input
                              type="time"
                              value={day.start_time}
                              onChange={(e) =>
                                updateDay(
                                  day.day_of_week,
                                  "start_time",
                                  e.target.value,
                                )
                              }
                              className="flex-1 bg-transparent text-sm text-foreground outline-none [color-scheme:dark]"
                            />
                            <span className="text-muted-foreground text-xs">
                              →
                            </span>
                            <input
                              type="time"
                              value={day.end_time}
                              onChange={(e) =>
                                updateDay(
                                  day.day_of_week,
                                  "end_time",
                                  e.target.value,
                                )
                              }
                              className="flex-1 bg-transparent text-sm text-foreground outline-none [color-scheme:dark]"
                            />
                            <button
                              onClick={() => removeDay(day.day_of_week)}
                              className="p-1 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Upcoming dates for this day */}
                          <div
                            className={`flex items-center gap-2 pl-10 flex-wrap ${isRTL ? "pr-10 pl-0 flex-row-reverse" : ""}`}
                          >
                            {nextDatesForDow(day.day_of_week, 3).map(
                              (dateStr) => (
                                <span
                                  key={dateStr}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium"
                                >
                                  {fmtDate(dateStr, language)}
                                </span>
                              ),
                            )}
                          </div>
                          <div
                            className={`flex items-center gap-2 pl-10 ${isRTL ? "pr-10 pl-0 flex-row-reverse" : ""}`}
                          >
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <input
                              type="text"
                              value={day.location ?? ""}
                              onChange={(e) =>
                                updateDay(
                                  day.day_of_week,
                                  "location",
                                  e.target.value,
                                )
                              }
                              placeholder={
                                globalLocation ||
                                (language === "ar"
                                  ? "الموقع..."
                                  : "Location...")
                              }
                              className="flex-1 bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/30 outline-none border-b border-border/50 pb-1 focus:border-primary/50 transition-colors"
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>

                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </p>
                )}

                {/* Save + Delete row */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                      saved
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25"
                    }`}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saved ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>
                          {language === "ar"
                            ? "تم الحفظ!"
                            : language === "fr"
                              ? "Sauvegardé !"
                              : "Saved!"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>
                          {language === "ar"
                            ? "حفظ"
                            : language === "fr"
                              ? "Sauvegarder"
                              : "Save"}
                        </span>
                      </>
                    )}
                  </motion.button>

                  {/* Delete all — only show when schedule has data */}
                  {activeDays.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setConfirmDelete(true)}
                      className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all text-sm font-semibold flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {language === "ar"
                          ? "حذف"
                          : language === "fr"
                            ? "Supprimer"
                            : "Delete"}
                      </span>
                    </motion.button>
                  )}
                </div>

                {/* Confirm delete dialog */}
                <AnimatePresence>
                  {confirmDelete && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -8 }}
                      className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 space-y-3"
                    >
                      <div
                        className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <div className="h-8 w-8 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {language === "ar"
                              ? "حذف جدول العمل كاملاً؟"
                              : language === "fr"
                                ? "Supprimer tout le planning ?"
                                : "Delete entire work schedule?"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar"
                              ? "سيتم حذف جميع أيام وساعات العمل. لا يمكن التراجع."
                              : language === "fr"
                                ? "Tous les jours et horaires seront supprimés. Irréversible."
                                : "All work days and hours will be removed. This cannot be undone."}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          {language === "ar"
                            ? "إلغاء"
                            : language === "fr"
                              ? "Annuler"
                              : "Cancel"}
                        </button>
                        <button
                          onClick={handleDeleteAll}
                          disabled={deleting}
                          className="flex-1 py-2.5 rounded-xl bg-destructive text-sm font-semibold text-white hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {deleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span>
                                {language === "ar"
                                  ? "نعم، احذف"
                                  : language === "fr"
                                    ? "Supprimer"
                                    : "Yes, delete"}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
