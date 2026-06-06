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
  CalendarPlus,
  Trash2,
  Plus,
} from "lucide-react";
import { useApp } from "../../lib/store";
import { supabase } from "../../lib/supabase";
import {
  devError,
  devLog,
  getFriendlyErrorMessage,
  withAsyncDiagnostics,
} from "../../lib/logger";
import { useToast } from "../../hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkDay {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  location?: string;
  schedule_label: string; // which named schedule this belongs to
}

interface AIShift {
  date: string;
  day_name: string;
  start: string;
  end: string;
  location?: string | null;
}

interface AIScheduleResult {
  person_name_found: string;
  found: boolean;
  shifts?: AIShift[];
  location?: string | null;
  notes?: string | null;
  raw_text?: string;
  error?: string;
  total_usage?: string | number;
}

const DEFAULT_WORK_DAY = {
  start_time: "09:00",
  end_time: "17:00",
  is_active: true,
  location: "",
};

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

const generateId = () => Math.random().toString(36).substring(2, 9);

function nextDatesForDow(dow: number, count = 3): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let checked = 0;
  while (dates.length < count && checked < 28) {
    if (d.getDay() === dow) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }
    d.setDate(d.getDate() + 1);
    checked++;
  }
  return dates;
}

function fmtDate(iso: string, language: string): string {
  try {
    const d = new Date(iso + "T12:00:00");
    if (language === "ar")
      return d.toLocaleDateString("ar-SA", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    if (language === "fr")
      return d.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
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
  const { user, language, addEvent, events, setTotalUsage, refreshEvents } = useApp();
  const { toast } = useToast();
  const isRTL = language === "ar";

  const displayName: string =
    (user as any)?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const [scheduleNameOverride, setScheduleNameOverride] = useState("");
  const searchName = scheduleNameOverride.trim() || displayName;

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
  const [allRows, setAllRows] = useState<WorkDay[]>([]); // ALL rows for ALL labels
  const [labels, setLabels] = useState<string[]>(["Main"]); // ordered list of schedule names
  const [activeLabel, setActiveLabel] = useState("Main");
  const [renamingLabel, setRenamingLabel] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalLocation, setGlobalLocation] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  // Upload / AI state
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "analyzing" | "review" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const [aiResult, setAiResult] = useState<AIScheduleResult | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().getDay();

  // ── FAB scroll visibility (matches Home page behaviour) ────────────────────
  const [fabVisible, setFabVisible] = useState(true);

  useEffect(() => {
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 8) setFabVisible(false);
      else if (y < lastY - 8) setFabVisible(true);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Derived: rows for the active label only ────────────────────────────────
  const schedule = allRows.filter((r) => r.schedule_label === activeLabel);
  const activeDays = schedule.filter((d) => d.is_active);
  const todayShifts = schedule.filter(
    (d) => d.day_of_week === today && d.is_active,
  );

  // ── Load from Supabase ─────────────────────────────────────────────────────
  const loadSchedule = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // SECURITY: ensure Supabase Row Level Security (RLS) is enabled for
      // `work_schedules` so users cannot access other users' rows. Client-side
      // filters (eq("user_id", ...)) are not a security boundary.
      const { data } = await supabase
        .from("work_schedules")
        .select(
          "id,user_id,day_of_week,start_time,end_time,is_active,location,schedule_label,updated_at",
        )
        .eq("user_id", user.id)
        .order("day_of_week");
      devLog("WorkSchedule", "Schedule load completed", {
        rowCount: data?.length ?? 0,
      });
      if (data?.length) {
        const rows: WorkDay[] = data.map((r) => ({
          id: r.id || generateId(),
          day_of_week: r.day_of_week,
          start_time: r.start_time,
          end_time: r.end_time,
          is_active: r.is_active,
          location: r.location ?? "",
          schedule_label: r.schedule_label ?? "Main",
        }));
        setAllRows(rows);
        // Build ordered label list preserving insertion order
        const seen: string[] = [];
        for (const r of rows) {
          if (!seen.includes(r.schedule_label)) seen.push(r.schedule_label);
        }
        setLabels(seen.length ? seen : ["Main"]);
        setActiveLabel(seen[0] ?? "Main");
        const first = rows.find((r) => r.is_active && r.location);
        if (first?.location) setGlobalLocation(first.location);
      }
    } catch (error) {
      devError("WorkSchedule", "Failed to load schedule", error, {
        userId: user.id,
      });
      toast({
        title: "Couldn't load work schedule",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
      setError("Could not load work schedule. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // ── Day editor helpers (scoped to activeLabel) ─────────────────────────────
  const toggleDay = (dow: number) => {
    setAllRows((prev) => {
      const dayShifts = prev.filter(
        (d) => d.day_of_week === dow && d.schedule_label === activeLabel,
      );
      if (dayShifts.length > 0) {
        // Toggle off: remove all shifts for this day
        return prev.filter(
          (d) => !(d.day_of_week === dow && d.schedule_label === activeLabel),
        );
      } else {
        // Toggle on: add one default shift
        return [
          ...prev,
          {
            id: generateId(),
            day_of_week: dow,
            ...DEFAULT_WORK_DAY,
            location: globalLocation,
            schedule_label: activeLabel,
          },
        ].sort((a, b) => a.day_of_week - b.day_of_week);
      }
    });
  };

  const addShift = (dow: number) => {
    setAllRows((prev) =>
      [
        ...prev,
        {
          id: generateId(),
          day_of_week: dow,
          ...DEFAULT_WORK_DAY,
          location: globalLocation,
          schedule_label: activeLabel,
        },
      ].sort((a, b) => a.day_of_week - b.day_of_week),
    );
  };

  const updateShift = (id: string, field: keyof WorkDay, val: string) => {
    setAllRows((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: val } : d)),
    );
  };

  const removeShift = (id: string) => {
    setAllRows((prev) => prev.filter((d) => d.id !== id));
  };

  const applyGlobalLocation = () =>
    setAllRows((prev) =>
      prev.map((d) =>
        d.is_active && d.schedule_label === activeLabel
          ? { ...d, location: globalLocation }
          : d,
      ),
    );

  // ── Save current label to Supabase ─────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const active = schedule.filter((d) => d.is_active);

      // Get all existing DB rows for this label
      const { data: existingDb } = await supabase
        .from("work_schedules")
        .select("id")
        .eq("user_id", user.id)
        .eq("schedule_label", activeLabel);

      // Identify rows to delete (those that are in DB but no longer in active UI state)
      const isDbId = (id?: string) => !!(id && id.includes("-"));
      const activeDbIds = active.map((d) => d.id).filter(isDbId);
      const idsToDelete = (existingDb || [])
        .map((r) => r.id)
        .filter((id) => !activeDbIds.includes(id));

      if (idsToDelete.length) {
        const { error: delError } = await supabase
          .from("work_schedules")
          .delete()
          .in("id", idsToDelete);
        if (delError) throw delError;
      }

      if (active.length) {
        console.log("message");
        const { error: e } = await supabase.from("work_schedules").upsert(
          active.map((d) => ({
            ...(isDbId(d.id) ? { id: d.id } : {}),
            user_id: user.id,
            day_of_week: d.day_of_week,
            start_time: d.start_time,
            end_time: d.end_time,
            is_active: true,
            location: d.location || globalLocation || null,
            schedule_label: activeLabel,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "user_id,day_of_week,start_time,end_time" },
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
      await refreshEvents(); // sync virtual events in all views
    } catch (e) {
      const message = getFriendlyErrorMessage(
        e,
        "Could not save work schedule. Please try again.",
      );
      setError(message);
      toast({
        title: "Couldn't save work schedule",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete the active schedule tab ─────────────────────────────────────────
  const handleDeleteLabel = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await supabase
        .from("work_schedules")
        .delete()
        .eq("user_id", user.id)
        .eq("schedule_label", activeLabel);
      const remaining = allRows.filter((r) => r.schedule_label !== activeLabel);
      setAllRows(remaining);
      const remainingLabels = labels.filter((l) => l !== activeLabel);
      if (!remainingLabels.length) remainingLabels.push("Main");
      setLabels(remainingLabels);
      setActiveLabel(remainingLabels[0]);
      setShowEditor(false);
    } catch (e) {
      const message = getFriendlyErrorMessage(
        e,
        "Could not delete this schedule. Please try again.",
      );
      setError(message);
      toast({
        title: "Couldn't delete schedule",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Delete ALL schedules ───────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await supabase.from("work_schedules").delete().eq("user_id", user.id);
      setAllRows([]);
      setLabels(["Main"]);
      setActiveLabel("Main");
      setGlobalLocation("");
      setShowEditor(false);
      setUploadState("idle");
      setAiResult(null);
      await refreshEvents(); // sync virtual events in all views
    } catch (e) {
      const message = getFriendlyErrorMessage(
        e,
        "Could not delete schedules. Please try again.",
      );
      setError(message);
      toast({
        title: "Couldn't delete schedules",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── Add a new schedule tab ─────────────────────────────────────────────────
  const addScheduleTab = () => {
    const base =
      language === "ar" ? "جدول" : language === "fr" ? "Planning" : "Schedule";
    let n = 2;
    while (labels.includes(`${base} ${n}`)) n++;
    const newLabel = `${base} ${n}`;
    setLabels((prev) => [...prev, newLabel]);
    setActiveLabel(newLabel);
    setShowEditor(true);
  };

  // ── Rename a label ─────────────────────────────────────────────────────────
  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renamingLabel) {
      setRenamingLabel(null);
      return;
    }
    if (labels.includes(trimmed)) {
      setRenamingLabel(null);
      return;
    } // duplicate
    setAllRows((prev) =>
      prev.map((d) =>
        d.schedule_label === renamingLabel
          ? { ...d, schedule_label: trimmed }
          : d,
      ),
    );
    setLabels((prev) => prev.map((l) => (l === renamingLabel ? trimmed : l)));
    if (activeLabel === renamingLabel) setActiveLabel(trimmed);
    try {
      if (user) {
        const { error } = await supabase
          .from("work_schedules")
          .update({ schedule_label: trimmed })
          .eq("user_id", user.id)
          .eq("schedule_label", renamingLabel!);
        if (error) throw error;
      }
      setRenamingLabel(null);
    } catch (e) {
      const message = getFriendlyErrorMessage(
        e,
        "Could not rename this schedule. Please try again.",
      );
      toast({
        title: "Couldn't rename schedule",
        description: message,
        variant: "destructive",
      });
    }
  };

  // ── Calendar event helpers ─────────────────────────────────────────────────
  const addTodayAsEvent = async () => {
    if (todayShifts.length === 0) return;
    try {
      const todayDate = new Date();
      const year = todayDate.getFullYear();
      const month = String(todayDate.getMonth() + 1).padStart(2, "0");
      const day = String(todayDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      for (const shift of todayShifts) {
        await addEvent({
          title:
            language === "ar"
              ? "يوم عمل"
              : language === "fr"
                ? "Journée de travail"
                : "Work Day",
          date: dateStr,
          time: shift.start_time,
          location: shift.location || globalLocation || undefined,
          notes: `${shift.start_time} – ${shift.end_time}`,
          source: "work_schedule",
          is_done: false,
        });
      }
    } catch (e) {
      const message = getFriendlyErrorMessage(
        e,
        "Could not add this work day to your calendar.",
      );
      toast({
        title: "Couldn't add event",
        description: message,
        variant: "destructive",
      });
    }
  };

  const addDateAsEvent = async (dateStr: string, ws: WorkDay) => {
    const wsMins =
      parseInt(ws.start_time.split(":")[0]) * 60 +
      parseInt(ws.start_time.split(":")[1] || "0");
    const conflict = (events || []).find((ev) => {
      if (ev.date !== dateStr || !ev.time || ev.source === "work_schedule")
        return false;
      const evMins =
        parseInt(ev.time.split(":")[0]) * 60 +
        parseInt(ev.time.split(":")[1] || "0");
      return Math.abs(evMins - wsMins) < 60;
    });
    if (conflict) {
      const msg =
        language === "ar"
          ? `⚠️ لديك حدث "${conflict.title}" في نفس الوقت. هل تريد الإضافة؟`
          : language === "fr"
            ? `⚠️ Vous avez "${conflict.title}" à la même heure. Ajouter quand même ?`
            : `⚠️ You have "${conflict.title}" around this time. Add anyway?`;
      if (!window.confirm(msg)) return;
    }
    try {
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
    } catch (e) {
      const message = getFriendlyErrorMessage(
        e,
        "Could not add this work day to your calendar.",
      );
      toast({
        title: "Couldn't add event",
        description: message,
        variant: "destructive",
      });
    }
  };

  // ── AI: apply result to current label ─────────────────────────────────────
  const applyAIResult = (result: AIScheduleResult) => {
    const loc = result.location || "";
    if (loc) setGlobalLocation(loc);
    const shifts = result.shifts || [];
    if (shifts.length > 0) {
      const newRows: WorkDay[] = shifts
        .map((s) => {
          let dow = -1;
          if (s.day_name) {
            const mapped = DAY_NAME_TO_DOW[s.day_name.toLowerCase()];
            if (mapped !== undefined) dow = mapped;
          }
          if (dow === -1) {
            try {
              dow = new Date(s.date + "T12:00:00").getDay();
            } catch {
              dow = 0;
            }
          }
          return {
            id: generateId(),
            day_of_week: dow,
            start_time: s.start || "",
            end_time: s.end || "",
            is_active: true,
            location: s.location || loc || globalLocation,
            schedule_label: activeLabel,
          };
        })
        .sort((a, b) => a.day_of_week - b.day_of_week);

      // Replace rows for this label
      setAllRows((prev) => [
        ...prev.filter((r) => r.schedule_label !== activeLabel),
        ...newRows,
      ]);
    } else {
      setAllRows((prev) =>
        prev.filter((r) => r.schedule_label !== activeLabel),
      );
    }
    setShowEditor(true);
  };

  // ── Analyze file ───────────────────────────────────────────────────────────
  const analyzeFile = async (file: File) => {
    setUploadState("analyzing");
    setUploadError("");
    setAiResult(null);
    try {
      await withAsyncDiagnostics(
        "WorkSchedule",
        "Analyze schedule image",
        async () => {
          const backendUrl =
            (import.meta as any).env?.VITE_BACKEND_API ||
            "http://localhost:4040";
          const formData = new FormData();
          formData.append("image", file);
          const headers: Record<string, string> = {};
          const { data } = await supabase.auth.getSession();
          const token = data?.session?.access_token;
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const r = await fetch(`${backendUrl}/analyze-schedule`, {
            method: "POST",
            headers: {
              ...headers,
              "X-User-Name": searchName,
              "X-User-Email": user?.email || "",
              "x-user-id": user?.id || "",
            },
            body: formData,
          });
          if (r.ok) {
            const result: AIScheduleResult = await r.json();
            console.log("message", result);
            // Update totalUsage directly from the API response
            if (typeof result.total_usage === "number") {
              setTotalUsage(result.total_usage);
            }
            setAiResult(result);
            applyAIResult(result);
            setUploadState("review");
            return;
          }
          if (r.status === 404) {
            const body = await r.json().catch(() => ({}));
            throw new Error(
              body.error || `"${searchName}" was not found in this schedule`,
            );
          }
          throw new Error("Server error");
        },
        {
          method: "POST",
          context: { searchName, userId: user?.id || "" },
          timeoutMs: 60000,
          onError: (message) => {
            const friendly = getFriendlyErrorMessage(
              message,
              "Failed to analyze file",
            );
            setUploadError(friendly);
            toast({
              title: "Couldn't analyze schedule",
              description: friendly,
              variant: "destructive",
            });
          },
        },
      );
    } catch (e) {
      const message = getFriendlyErrorMessage(e, "Failed to analyze file");
      setUploadError(message);
      toast({
        title: "Couldn't analyze schedule",
        description: message,
        variant: "destructive",
      });
      setUploadState("error");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) analyzeFile(f);
    e.target.value = "";
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* ── Floating Upload FAB — shows/hides on scroll like Home page ─────────── */}
      <motion.div
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-40 pointer-events-none"
        animate={fabVisible ? { y: 0, opacity: 1 } : { y: 56, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto flex w-full max-w-screen-sm justify-end overflow-visible px-5 pointer-events-auto">
          <div className="flex flex-col items-end gap-3">
        {/* Name prompt */}
        <AnimatePresence>
          {showNamePrompt && (
            <motion.div
              key="name-prompt"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              className="bg-background/98 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 w-72 space-y-3"
            >
              <div
                className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <p className="text-sm font-semibold text-foreground">
                  {language === "ar"
                    ? "اسمك في الجدول"
                    : language === "fr"
                      ? "Votre nom dans le planning"
                      : "Your name in the schedule"}
                </p>
                <button
                  onClick={() => setShowNamePrompt(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={scheduleNameOverride}
                onChange={(e) => setScheduleNameOverride(e.target.value)}
                placeholder={
                  displayName ||
                  (language === "ar"
                    ? "مثال: روسانا بياجيوتي"
                    : "e.g. Rossana Biagiotti")
                }
                className="w-full px-3 py-2.5 rounded-xl bg-secondary/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
                autoFocus
                dir={isRTL ? "rtl" : "ltr"}
              />
              <p className="text-[10px] text-muted-foreground/60">
                {scheduleNameOverride.trim()
                  ? language === "ar"
                    ? `سيبحث عن: "${scheduleNameOverride.trim()}"`
                    : `Will search for: "${scheduleNameOverride.trim()}"`
                  : displayName
                    ? language === "ar"
                      ? `سيستخدم: "${displayName}"`
                      : `Using account name: "${displayName}"`
                    : language === "ar"
                      ? "أدخل اسمك أعلاه"
                      : "Enter your name above"}
              </p>
              <button
                onClick={() => {
                  setShowNamePrompt(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                {language === "ar"
                  ? "اختر ملفاً"
                  : language === "fr"
                    ? "Choisir un fichier"
                    : "Choose File"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI status feedback */}
        <AnimatePresence>
          {uploadState === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[260px]"
            >
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {language === "ar"
                    ? "جاري التحليل..."
                    : language === "fr"
                      ? "Analyse..."
                      : "Analyzing..."}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {language === "ar"
                    ? `يبحث عن "${searchName}"`
                    : `Searching for "${searchName}"`}
                </p>
              </div>
            </motion.div>
          )}

          {uploadState === "review" && aiResult && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="bg-background/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-4 py-3 shadow-2xl max-w-[280px]"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-emerald-400 flex-1">
                  {language === "ar"
                    ? `✓ تم العثور على "${aiResult.person_name_found || searchName}"`
                    : language === "fr"
                      ? `✓ Trouvé : "${aiResult.person_name_found || searchName}"`
                      : `✓ Found "${aiResult.person_name_found || searchName}"`}
                  <span className="text-[10px] text-emerald-300/60 ml-1">
                    → {activeLabel}
                  </span>
                </p>
                <button
                  onClick={() => setUploadState("idle")}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {uploadState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="bg-background/95 backdrop-blur-xl border border-destructive/30 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[260px]"
            >
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive flex-1 line-clamp-2">
                {uploadError}
              </p>
              <button
                onClick={() => setUploadState("idle")}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
            </AnimatePresence>

            {/* Upload FAB button — styled to match Home page */}
            <motion.button
              onClick={() => setShowNamePrompt(true)}
              disabled={uploadState === "analyzing"}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50
                bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.32),0_2px_8px_rgba(0,0,0,0.1)]
                dark:bg-blue-500 dark:shadow-[0_0_0_1px_rgba(99,179,237,0.2),0_8px_28px_rgba(59,130,246,0.45),0_2px_10px_rgba(0,0,0,0.3)]"
              whileHover={{ y: -2, scale: 1.06 }}
              whileTap={{ scale: 0.93 }}
            >
              {uploadState === "analyzing" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf,.xlsx,.xls,.csv,text/csv"
        className="hidden"
        onChange={handleFileInput}
      />

      <div className={`px-4 pb-32 space-y-4 pt-2 ${isRTL ? "dir-rtl" : ""}`}>
        {/* ── Today Card ──────────────────────────────────────────────────────── */}
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
                  {todayShifts.length > 0
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
              {todayShifts.length > 0 && (
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
            ) : todayShifts.length > 0 ? (
              <div className="space-y-3">
                {todayShifts.map((shift, index) => (
                  <div key={shift.id || index} className="space-y-1">
                    <div
                      className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
                    >
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xl font-bold text-foreground tracking-tight">
                        {shift.start_time} – {shift.end_time}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {shift.schedule_label}
                      </span>
                    </div>
                    {(shift.location || globalLocation) && (
                      <div
                        className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {shift.location || globalLocation}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
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

          {/* Weekly strip — shows ALL active days from ALL schedules */}
          {allRows.filter((d) => d.is_active).length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                  const dayShifts = allRows.filter(
                    (s) => s.day_of_week === dow && s.is_active,
                  );
                  const firstShift = dayShifts[0];
                  const hasMore = dayShifts.length > 1;
                  return (
                    <div
                      key={dow}
                      className={`flex-1 rounded-xl py-2 flex flex-col items-center gap-0.5 transition-all ${
                        firstShift
                          ? dow === today
                            ? "bg-blue-500 text-white"
                            : "bg-blue-500/15 text-blue-400"
                          : "bg-secondary/30 text-muted-foreground/40"
                      }`}
                    >
                      <span className="text-[10px] font-bold">
                        {DAY_SHORT[dow]}
                      </span>
                      {firstShift && (
                        <span className="text-[9px] opacity-80">
                          {firstShift.start_time.slice(0, 5)}
                          {hasMore ? "+" : ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Schedule Editor ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          {/* Header */}
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
                    ? "تعديل جداول العمل"
                    : language === "fr"
                      ? "Gérer les plannings"
                      : "Work Schedules"}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {labels.length}{" "}
                  {language === "ar"
                    ? "جداول"
                    : language === "fr"
                      ? "plannings"
                      : "schedules"}{" "}
                  · {allRows.filter((d) => d.is_active).length}{" "}
                  {language === "ar"
                    ? "أيام"
                    : language === "fr"
                      ? "jours"
                      : "days"}
                </p>
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
                  {/* ── Schedule tabs ──────────────────────────────────────── */}
                  <div
                    className={`flex items-center gap-1.5 overflow-x-auto pb-0.5 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    {labels.map((label) => (
                      <div key={label} className="flex-shrink-0">
                        {renamingLabel === label ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") setRenamingLabel(null);
                            }}
                            className="w-28 px-2 py-1 rounded-xl bg-primary/10 border border-primary/40 text-xs font-semibold text-foreground outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setActiveLabel(label)}
                            onDoubleClick={() => {
                              setRenamingLabel(label);
                              setRenameValue(label);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                              activeLabel === label
                                ? "bg-blue-500 text-white"
                                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                            }`}
                          >
                            {label}
                            {activeLabel === label &&
                              allRows.filter(
                                (r) =>
                                  r.schedule_label === label && r.is_active,
                              ).length > 0 && (
                                <span className="text-[9px] opacity-70">
                                  {
                                    allRows.filter(
                                      (r) =>
                                        r.schedule_label === label &&
                                        r.is_active,
                                    ).length
                                  }
                                  d
                                </span>
                              )}
                          </button>
                        )}
                      </div>
                    ))}
                    {/* Add schedule button */}
                    <button
                      onClick={addScheduleTab}
                      className="flex-shrink-0 h-7 w-7 rounded-xl bg-secondary/50 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title={
                        language === "ar"
                          ? "إضافة جدول جديد"
                          : language === "fr"
                            ? "Ajouter un planning"
                            : "Add schedule"
                      }
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tab subtitle with rename hint + delete tab */}
                  <div
                    className={`flex items-center justify-between -mt-1 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <p className="text-[10px] text-muted-foreground/50">
                      {language === "ar"
                        ? "انقر مرتين على اسم الجدول لتغييره"
                        : language === "fr"
                          ? "Double-cliquer pour renommer"
                          : "Double-tap tab name to rename"}
                    </p>
                    {labels.length > 1 && (
                      <button
                        onClick={handleDeleteLabel}
                        disabled={deleting}
                        className="text-[10px] text-destructive/60 hover:text-destructive transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        {language === "ar"
                          ? "حذف هذا الجدول"
                          : language === "fr"
                            ? "Supprimer ce planning"
                            : "Delete this tab"}
                      </button>
                    )}
                  </div>

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
                      const active = !!allRows.find(
                        (d) =>
                          d.day_of_week === dow &&
                          d.is_active &&
                          d.schedule_label === activeLabel,
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

                  {/* Preview strip for active label */}
                  {activeDays.length > 0 && (
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                        const dayShifts = allRows.filter(
                          (s) =>
                            s.day_of_week === dow &&
                            s.is_active &&
                            s.schedule_label === activeLabel,
                        );
                        const firstShift = dayShifts[0];
                        const hasMore = dayShifts.length > 1;
                        return (
                          <div
                            key={dow}
                            className={`flex-1 rounded-xl py-2 flex flex-col items-center gap-0.5 transition-all ${
                              firstShift
                                ? dow === today
                                  ? "bg-blue-500 text-white"
                                  : "bg-blue-500/15 text-blue-400"
                                : "bg-secondary/30 text-muted-foreground/40"
                            }`}
                          >
                            <span className="text-[10px] font-bold">
                              {DAY_SHORT[dow]}
                            </span>
                            {firstShift && (
                              <span className="text-[9px] opacity-80">
                                {firstShift.start_time.slice(0, 5)}
                                {hasMore ? "+" : ""}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Per-day time rows */}
                  <AnimatePresence>
                    {activeDays.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {language === "ar"
                          ? "لا توجد أيام — اختر يوماً أعلاه"
                          : "No days — tap a day above"}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {Array.from(
                          new Set(activeDays.map((d) => d.day_of_week)),
                        )
                          .sort((a, b) => a - b)
                          .map((dow) => {
                            const shiftsForDay = activeDays.filter(
                              (d) => d.day_of_week === dow,
                            );
                            return (
                              <motion.div
                                key={dow}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2.5 p-3 rounded-2xl border border-border/80 bg-secondary/10"
                              >
                                <div
                                  className={`flex items-center justify-between border-b border-border/40 pb-2 ${isRTL ? "flex-row-reverse" : ""}`}
                                >
                                  <span className="text-xs font-bold text-foreground">
                                    {DAY_NAMES[dow]}
                                  </span>
                                  <button
                                    onClick={() => addShift(dow)}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    {language === "ar"
                                      ? "إضافة فترة"
                                      : language === "fr"
                                        ? "Ajouter shift"
                                        : "Add shift"}
                                  </button>
                                </div>

                                <div className="space-y-3 pt-1">
                                  {shiftsForDay.map((day, shiftIndex) => (
                                    <div key={day.id} className="space-y-1.5">
                                      <div
                                        className={`flex items-center gap-2 p-2 rounded-xl bg-background border border-border/70 ${isRTL ? "flex-row-reverse" : ""}`}
                                      >
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <input
                                          type="time"
                                          value={day.start_time}
                                          onChange={(e) =>
                                            updateShift(
                                              day.id!,
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
                                            updateShift(
                                              day.id!,
                                              "end_time",
                                              e.target.value,
                                            )
                                          }
                                          className="flex-1 bg-transparent text-sm text-foreground outline-none [color-scheme:dark]"
                                        />
                                        <button
                                          onClick={() => removeShift(day.id!)}
                                          className="p-1 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>

                                      <div
                                        className={`flex items-center gap-2 px-2 ${isRTL ? "flex-row-reverse" : ""}`}
                                      >
                                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <input
                                          type="text"
                                          value={day.location ?? ""}
                                          onChange={(e) =>
                                            updateShift(
                                              day.id!,
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
                                    </div>
                                  ))}
                                </div>

                                <div
                                  className={`flex items-center gap-1.5 pt-1.5 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}
                                >
                                  {nextDatesForDow(dow, 3).map((dateStr) => (
                                    <button
                                      key={dateStr}
                                      onClick={async () => {
                                        for (const shift of shiftsForDay) {
                                          await addDateAsEvent(dateStr, shift);
                                        }
                                      }}
                                      className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium hover:bg-blue-500/20 transition-colors"
                                    >
                                      <CalendarPlus className="w-2.5 h-2.5" />
                                      {fmtDate(dateStr, language)}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            );
                          })}
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

                    {allRows.filter((d) => d.is_active).length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleDeleteAll}
                        disabled={deleting}
                        className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all text-sm font-semibold flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {language === "ar"
                            ? "حذف الكل"
                            : language === "fr"
                              ? "Tout supprimer"
                              : "Delete all"}
                        </span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
