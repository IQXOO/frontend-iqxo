"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  CalendarPlus,
  X,
  Calendar,
  ImageIcon,
  FolderOpen,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Check,
  Home,
  ArrowLeft,
  Smartphone,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../../lib/store";

export type NavTab = "home" | "history" | "settings";

// ─────────────────────────────────────────────────────────────────────────────
// ICS PARSER — parses .ics / iCalendar files
// ─────────────────────────────────────────────────────────────────────────────
interface ParsedCalEvent {
  uid: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or ""
  location: string;
  notes: string;
  selected: boolean;
}

function unfoldICS(raw: string): string {
  // ICS line folding: continuation lines start with space/tab
  return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function parseICSDate(val: string): { date: string; time: string } {
  // Remove TZID param if present: DTSTART;TZID=America/New_York:20260315T190000
  const v = val.includes(":") ? val.split(":").pop()! : val;
  const clean = v.replace(/Z$/, "");

  if (clean.length === 8) {
    // All-day: 20260315
    const y = clean.slice(0, 4),
      m = clean.slice(4, 6),
      d = clean.slice(6, 8);
    return { date: `${y}-${m}-${d}`, time: "" };
  }
  if (clean.length >= 15) {
    // Datetime: 20260315T190000
    const y = clean.slice(0, 4),
      m = clean.slice(4, 6),
      d = clean.slice(6, 8);
    const h = clean.slice(9, 11),
      min = clean.slice(11, 13);
    return { date: `${y}-${m}-${d}`, time: `${h}:${min}` };
  }
  return { date: "", time: "" };
}

function decodeICSText(val: string): string {
  return val
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseICS(content: string): ParsedCalEvent[] {
  const unfolded = unfoldICS(content);
  const lines = unfolded.split(/\r?\n/);
  const events: ParsedCalEvent[] = [];
  let current: Partial<ParsedCalEvent> | null = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = { selected: true, uid: `ics-${Date.now()}-${Math.random()}` };
      continue;
    }
    if (line.startsWith("END:VEVENT") && current) {
      // Only add if we have at least a title and date
      if (current.title && current.date) {
        events.push({
          uid: current.uid || `ics-${Math.random()}`,
          title: current.title,
          date: current.date,
          time: current.time || "",
          location: current.location || "",
          notes: current.notes || "",
          selected: true,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    // Parse key:value — handle keys with params like DTSTART;TZID=...
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const keyFull = line.slice(0, colonIdx).toUpperCase();
    const value = line.slice(colonIdx + 1);

    const key = keyFull.split(";")[0]; // strip params

    switch (key) {
      case "SUMMARY":
        current.title = decodeICSText(value);
        break;
      case "DTSTART": {
        const parsed = parseICSDate(
          keyFull.includes(";")
            ? line.slice(colonIdx - keyFull.length + key.length)
            : value,
        );
        if (parsed.date) {
          current.date = parsed.date;
          current.time = parsed.time;
        }
        break;
      }
      case "LOCATION":
        current.location = decodeICSText(value);
        break;
      case "DESCRIPTION":
        current.notes = decodeICSText(value).slice(0, 300);
        break;
      case "UID":
        current.uid = value.trim();
        break;
    }
  }

  // Sort by date ascending, skip past events older than 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  return events
    .filter((e) => new Date(e.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR IMPORT SHEET
// ─────────────────────────────────────────────────────────────────────────────
interface CalendarImportSheetProps {
  language: string;
  onClose: () => void;
  onImport: (events: Omit<ParsedCalEvent, "uid" | "selected">[]) => void;
  /** Events pre-fetched from the native device calendar — skips the file-pick stage */
  preloadedEvents?: Omit<ParsedCalEvent, "uid" | "selected">[] | null;
  /** Called when the user taps the back arrow in the preview header */
  onBack?: () => void;
}

function CalendarImportSheet({
  language,
  onClose,
  onImport,
  preloadedEvents,
  onBack,
}: CalendarImportSheetProps) {
  const [stage, setStage] = useState<"pick" | "preview" | "done">("pick");
  const [parsedEvents, setParsedEvents] = useState<ParsedCalEvent[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // If native calendar events are pre-loaded, jump straight to the preview stage
  useEffect(() => {
    if (preloadedEvents && preloadedEvents.length > 0) {
      const withMeta: ParsedCalEvent[] = preloadedEvents.map((e, i) => ({
        ...e,
        uid: `native-${i}-${Date.now()}`,
        selected: true,
      }));
      setParsedEvents(withMeta);
      setStage("preview");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const L = (en: string, fr: string, ar: string) =>
    language === "ar" ? ar : language === "fr" ? fr : en;

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.match(/\.(ics|ical|ifb)$/i)) {
        setParseError(
          L(
            "Please select a .ics calendar file",
            "Veuillez sélectionner un fichier .ics",
            "يرجى اختيار ملف .ics للتقويم",
          ),
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const events = parseICS(content);
          if (events.length === 0) {
            setParseError(
              L(
                "No upcoming events found in this calendar file.",
                "Aucun événement à venir trouvé dans ce fichier.",
                "لم يتم العثور على أحداث قادمة في هذا الملف.",
              ),
            );
            return;
          }
          setParsedEvents(events);
          setParseError(null);
          setStage("preview");
        } catch {
          setParseError(
            L(
              "Could not read this file.",
              "Impossible de lire ce fichier.",
              "تعذّر قراءة هذا الملف.",
            ),
          );
        }
      };
      reader.readAsText(file);
    },
    [language],
  );

  const toggleEvent = (uid: string) => {
    setParsedEvents((prev) =>
      prev.map((e) => (e.uid === uid ? { ...e, selected: !e.selected } : e)),
    );
  };

  const toggleAll = () => {
    const allSelected = parsedEvents.every((e) => e.selected);
    setParsedEvents((prev) =>
      prev.map((e) => ({ ...e, selected: !allSelected })),
    );
  };

  const handleImport = async () => {
    setImporting(true);
    const toImport = parsedEvents
      .filter((e) => e.selected)
      .map(({ uid, selected, ...rest }) => rest);
    await new Promise((r) => setTimeout(r, 400)); // slight delay for UX
    onImport(toImport);
    setStage("done");
    setImporting(false);
  };

  const selectedCount = parsedEvents.filter((e) => e.selected).length;

  return (
    <div className="rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
      <AnimatePresence mode="wait">
        {/* ── PICK FILE ── */}
        {stage === "pick" && (
          <motion.div
            key="pick"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-sm font-semibold text-foreground">
                {L(
                  "Import from Calendar",
                  "Importer depuis Calendrier",
                  "استيراد من التقويم",
                )}
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* How it works */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs font-semibold text-blue-400 mb-1">
                  {L("How it works", "Comment ça marche", "كيف يعمل")}
                </p>
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  {L(
                    "Export a .ics file from Apple Calendar, Google Calendar, or Outlook, then select it here to import your events.",
                    "Exportez un fichier .ics depuis Apple Calendrier, Google Agenda ou Outlook, puis sélectionnez-le ici.",
                    "صدّر ملف .ics من Apple Calendar أو Google Calendar أو Outlook، ثم اختره هنا.",
                  )}
                </p>
              </div>

              {/* App-specific instructions */}
              {[
                {
                  name: "Apple Calendar",
                  icon: "",
                  steps: L(
                    "Calendar → File → Export → Export…",
                    "Calendrier → Fichier → Exporter…",
                    "تقويم ← ملف ← تصدير",
                  ),
                },
                {
                  name: "Google Calendar",
                  icon: "",
                  steps: L(
                    "Settings → Import & Export → Export",
                    "Paramètres → Importer & Exporter → Exporter",
                    "الإعدادات ← استيراد وتصدير",
                  ),
                },
                {
                  name: "Outlook",
                  icon: "",
                  steps: L(
                    "File → Open & Export → Import/Export → Export to file",
                    "Fichier → Ouvrir → Exporter",
                    "ملف ← فتح وتصدير",
                  ),
                },
              ].map((app) => (
                <div
                  key={app.name}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-secondary/30"
                >
                  <span className="text-lg shrink-0">{app.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {app.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {app.steps}
                    </p>
                  </div>
                </div>
              ))}

              {parseError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{parseError}</p>
                </div>
              )}

              {/* File picker */}
              <input
                ref={fileRef}
                type="file"
                accept=".ics,.ical,.ifb"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <motion.button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {L(
                      "Select .ics File",
                      "Sélectionner un fichier .ics",
                      "اختر ملف .ics",
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {L(
                      "iCalendar format (.ics)",
                      "Format iCalendar (.ics)",
                      "صيغة iCalendar",
                    )}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── PREVIEW EVENTS ── */}
        {stage === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {L(
                      "Select Events to Import",
                      "Sélectionner les événements",
                      "اختر الأحداث للاستيراد",
                    )}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedCount}/{parsedEvents.length}{" "}
                    {L("selected", "sélectionnés", "محدد")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAll}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  {parsedEvents.every((e) => e.selected)
                    ? L("Deselect all", "Tout désélectionner", "إلغاء الكل")
                    : L("Select all", "Tout sélectionner", "تحديد الكل")}
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Event list */}
            <div className="max-h-[40vh] overflow-y-auto p-3 space-y-2">
              {parsedEvents.map((ev) => (
                <motion.button
                  key={ev.uid}
                  onClick={() => toggleEvent(ev.uid)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left ${
                    ev.selected
                      ? "bg-primary/10 border border-primary/25"
                      : "bg-secondary/30 border border-transparent"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="mt-0.5 shrink-0">
                    {ev.selected ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      📅 {ev.date}
                      {ev.time ? ` · ⏰ ${ev.time}` : ""}
                      {ev.location ? ` · 📍 ${ev.location}` : ""}
                    </p>
                    {ev.notes && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Import button */}
            <div className="p-3 border-t border-border">
              <motion.button
                onClick={handleImport}
                disabled={selectedCount === 0 || importing}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  selectedCount > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                }`}
                whileTap={{ scale: selectedCount > 0 ? 0.98 : 1 }}
              >
                {importing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                {importing
                  ? L("Importing…", "Importation…", "جارٍ الاستيراد…")
                  : L(
                      `Import ${selectedCount} event${selectedCount !== 1 ? "s" : ""}`,
                      `Importer ${selectedCount} événement${selectedCount !== 1 ? "s" : ""}`,
                      `استيراد ${selectedCount} حدث`,
                    )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── DONE ── */}
        {stage === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-10 px-6 gap-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.1,
              }}
              className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <div>
              <p className="text-base font-bold text-foreground">
                {L(
                  "Events Imported!",
                  "Événements importés !",
                  "تم الاستيراد!",
                )}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedCount}{" "}
                {L(
                  `event${selectedCount !== 1 ? "s" : ""} added to your calendar`,
                  `événement${selectedCount !== 1 ? "s" : ""} ajouté${selectedCount !== 1 ? "s" : ""} à votre calendrier`,
                  `حدث تمت إضافته إلى تقويمك`,
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              {L("Done", "Terminé", "تم")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────────────────────────────────
interface BottomNavProps {
  active: NavTab;
  onTabChange: (tab: NavTab) => void;
  onUploadClick: (options?: { autoOpenPicker?: boolean; file?: File | null }) => void;
  onManualAdd: () => void;
  composerOpen?: boolean;
  onComposerOpenChange?: (open: boolean) => void;
  onImportEvents?: (
    events: {
      title: string;
      date: string;
      time: string;
      location: string;
      notes: string;
    }[],
  ) => void;
}

export function BottomNav({
  active,
  onTabChange,
  onUploadClick,
  onManualAdd,
  composerOpen,
  onComposerOpenChange,
  onImportEvents,
}: BottomNavProps) {
  const { language, addEvent, user } = useApp();
  const isRTL = language === "ar";
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCalendarImport, setShowCalendarImport] = useState(false);
  // ── Calendar import sub-states ─────────────────────────────────────────────
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  const [showNativeCalendarPrompt, setShowNativeCalendarPrompt] = useState(false);
  const [nativeCalendarEvents, setNativeCalendarEvents] = useState<Omit<ParsedCalEvent, "uid" | "selected">[] | null>(null);
  const [nativeCalendarLoading, setNativeCalendarLoading] = useState(false);
  const [nativeCalendarError, setNativeCalendarError] = useState<string | null>(null);
  const menuOpen = composerOpen ?? internalMenuOpen;
  const setMenuOpen = onComposerOpenChange ?? setInternalMenuOpen;

  const handleTakePhotoOption = (capture?: string) => {
    setMenuOpen(false);
    setShowPhotoOptions(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.setAttribute("capture", capture);
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onUploadClick({ autoOpenPicker: false, file });
      }
    };
    input.click();
  };

  const handleManualEvent = () => {
    setMenuOpen(false);
    setShowPhotoOptions(false);
    onManualAdd();
  };
  const handleClose = () => {
    setMenuOpen(false);
    setShowPhotoOptions(false);
    setShowCalendarImport(false);
    setShowCalendarOptions(false);
    setShowNativeCalendarPrompt(false);
    setNativeCalendarEvents(null);
    setNativeCalendarLoading(false);
    setNativeCalendarError(null);
  };

  // Opens the calendar import sub-menu (Phone Calendar vs Upload .ics)
  const handleCalendarImport = () => {
    setShowPhotoOptions(false);
    setShowCalendarOptions(true);
  };

  // Opens the existing .ics file upload flow
  const handleOpenICSUpload = () => {
    setShowCalendarOptions(false);
    setNativeCalendarEvents(null);
    setShowCalendarImport(true);
  };

  // Requests calendar events from the native app via WebView bridge;
  // on web, shows a "download the app" prompt instead.
  const handleNativeCalendarRequest = useCallback(() => {
    const isNativeApp = (window as any).isNativeApp === true;
    if (!isNativeApp) {
      setShowCalendarOptions(false);
      setShowNativeCalendarPrompt(true);
      return;
    }
    setNativeCalendarLoading(true);
    setNativeCalendarError(null);
    const handler = () => {
      window.removeEventListener("nativeCalendarReady", handler);
      const result = (window as any).__nativeCalendarResult;
      setNativeCalendarLoading(false);
      if (!result || result.error) {
        setNativeCalendarError(result?.error ?? "unknown");
        return;
      }
      if (result.events && result.events.length > 0) {
        setNativeCalendarEvents(result.events);
        setShowCalendarOptions(false);
        setShowCalendarImport(true);
      } else {
        setNativeCalendarError("no_events");
      }
    };
    window.addEventListener("nativeCalendarReady", handler);
    try {
      (window as any).ReactNativeWebView?.postMessage(
        JSON.stringify({ type: "requestCalendarEvents" })
      );
    } catch {
      window.removeEventListener("nativeCalendarReady", handler);
      setNativeCalendarLoading(false);
      setNativeCalendarError("bridge_error");
    }
  }, []);

  const handleImportedEvents = async (
    events: {
      title: string;
      date: string;
      time: string;
      location: string;
      notes: string;
    }[],
  ) => {
    if (onImportEvents) {
      onImportEvents(events);
    } else {
      // Directly add to store if no callback provided
      for (const ev of events) {
        await addEvent({
          title: ev.title,
          date: ev.date,
          time: ev.time,
          location: ev.location || undefined,
          notes: ev.notes,
          source: "calendar_import",
          is_done: false,
          phone: undefined,
          image_url: undefined,
          pdf_url: undefined,
        });
      }
    }
  };

  // Hide on scroll behaviour
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let lastY = 0;
    if (typeof window !== "undefined") lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 8) {
        setVisible(false);
      } else if (y < lastY - 8) {
        setVisible(true);
      }
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Action Sheet */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
            />

            {/* Sheet */}
            <motion.div
              className="fixed bottom-0 left-1/2 z-[70] w-full max-w-sm px-3 pb-6"
              style={{ x: "-50%" }}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              dir={isRTL ? "rtl" : "ltr"}
            >
              <AnimatePresence mode="wait">
                {/* ── Main options ── */}
                {!showPhotoOptions && !showCalendarImport && !showCalendarOptions && !showNativeCalendarPrompt && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">
                        {language === "ar"
                          ? "إضافة جديد"
                          : language === "fr"
                            ? "Ajouter"
                            : "Add New"}
                      </span>
                      <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-3 space-y-2">
                      {/* Photo option */}
                      <motion.button
                        onClick={() => setShowPhotoOptions(true)}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left group"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Camera className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {language === "ar"
                              ? "إضافة صورة"
                              : language === "fr"
                                ? "Ajouter une photo"
                                : "Add a Photo"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar"
                              ? "كاميرا، مكتبة أو ملف"
                              : language === "fr"
                                ? "Caméra, galerie ou fichier"
                                : "Camera, gallery or file"}
                          </p>
                        </div>
                        <span className="text-muted-foreground text-xs">›</span>
                      </motion.button>

                      {/* Manual event */}
                      <motion.button
                        onClick={handleManualEvent}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left group"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                          <CalendarPlus className="w-5 h-5 text-violet-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {language === "ar"
                              ? "إضافة موعد يدوياً"
                              : language === "fr"
                                ? "Créer manuellement"
                                : "Create Manual Event"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar"
                              ? "العنوان، التاريخ، الوقت"
                              : language === "fr"
                                ? "Titre, date, heure"
                                : "Title, date, time"}
                          </p>
                        </div>
                      </motion.button>

                      {/* ✅ NEW: Import from Calendar */}
                      <motion.button
                        onClick={handleCalendarImport}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left group"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {language === "ar"
                              ? "استيراد من التقويم"
                              : language === "fr"
                                ? "Importer depuis Calendrier"
                                : "Import from Calendar"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar"
                              ? "Apple، Google، Outlook (.ics)"
                              : language === "fr"
                                ? "Apple, Google, Outlook (.ics)"
                                : "Apple, Google, Outlook (.ics)"}
                          </p>
                        </div>
                        <span className="text-muted-foreground text-xs">›</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Photo sub-options ── */}
                {showPhotoOptions && !showCalendarImport && (
                  <motion.div
                    key="photo"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                      <button
                        onClick={() => setShowPhotoOptions(false)}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-sm leading-none">‹</span>
                      </button>
                      <span className="text-sm font-semibold text-foreground flex-1">
                        {language === "ar"
                          ? "إضافة صورة"
                          : language === "fr"
                            ? "Ajouter une photo"
                            : "Add a Photo"}
                      </span>
                      <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      <motion.button
                        onClick={() => handleTakePhotoOption("environment")}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Camera className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {language === "ar"
                              ? "التقاط صورة"
                              : language === "fr"
                                ? "Prendre une photo"
                                : "Take a Photo"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar"
                              ? "افتح الكاميرا"
                              : language === "fr"
                                ? "Ouvrir la caméra"
                                : "Open camera"}
                          </p>
                        </div>
                      </motion.button>
                      <motion.button
                        onClick={() => handleTakePhotoOption(undefined)}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {language === "ar"
                              ? "من المعرض"
                              : language === "fr"
                                ? "Depuis la galerie"
                                : "Upload from Gallery"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar"
                              ? "صورة من هاتفك"
                              : language === "fr"
                                ? "Choisir depuis photos"
                                : "Choose from your photos"}
                          </p>
                        </div>
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setMenuOpen(false);
                          setShowPhotoOptions(false);
                          onUploadClick({ autoOpenPicker: true });
                        }}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {language === "ar"
                              ? "من الملفات"
                              : language === "fr"
                                ? "Depuis les fichiers"
                                : "From Files or Drive"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar"
                              ? "PDF أو ملف من السحابة"
                              : language === "fr"
                                ? "PDF ou cloud"
                                : "PDF, iCloud, Google Drive"}
                          </p>
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Calendar Options sub-menu (Phone Calendar vs Upload .ics) ── */}
                {showCalendarOptions && !showCalendarImport && (
                  <motion.div
                    key="calendar-options"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                      <button
                        onClick={() => { setShowCalendarOptions(false); setNativeCalendarError(null); }}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-semibold text-foreground flex-1">
                        {language === "ar"
                          ? "استيراد من التقويم"
                          : language === "fr"
                            ? "Importer depuis Calendrier"
                            : "Import from Calendar"}
                      </span>
                      <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      {/* ── Option 1: From Phone Calendar (native bridge) ── */}
                      <motion.button
                        onClick={handleNativeCalendarRequest}
                        disabled={nativeCalendarLoading}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left disabled:opacity-60"
                        whileTap={{ scale: nativeCalendarLoading ? 1 : 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          {nativeCalendarLoading ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full"
                            />
                          ) : (
                            <Smartphone className="w-5 h-5 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {language === "ar"
                              ? "من تقويم الهاتف"
                              : language === "fr"
                                ? "Depuis le calendrier du téléphone"
                                : "From Phone Calendar"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {nativeCalendarError === "permission_denied"
                              ? (language === "ar" ? "❌ الإذن مرفوض — اسمح من الإعدادات" : language === "fr" ? "❌ Permission refusée — autorisez dans Réglages" : "❌ Permission denied — allow in Settings")
                              : nativeCalendarError === "no_events"
                                ? (language === "ar" ? "لا توجد أحداث قادمة" : language === "fr" ? "Aucun événement à venir" : "No upcoming events found")
                                : nativeCalendarLoading
                                  ? (language === "ar" ? "جارٍ التحميل…" : language === "fr" ? "Chargement…" : "Loading your calendar…")
                                  : (language === "ar" ? "يجلب مواعيدك تلقائياً" : language === "fr" ? "Importe automatiquement" : "Auto-imports all your events")}
                          </p>
                        </div>
                        {!nativeCalendarLoading && <span className="text-muted-foreground text-xs">›</span>}
                      </motion.button>

                      {/* ── Option 2: Upload .ics file (existing feature — kept as-is) ── */}
                      <motion.button
                        onClick={handleOpenICSUpload}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {language === "ar"
                              ? "رفع ملف .ics"
                              : language === "fr"
                                ? "Importer un fichier .ics"
                                : "Upload .ics File"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar"
                              ? "Apple ، Google ، Outlook (.ics)"
                              : language === "fr"
                                ? "Apple, Google, Outlook (.ics)"
                                : "Apple, Google, Outlook (.ics)"}
                          </p>
                        </div>
                        <span className="text-muted-foreground text-xs">›</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── "Download the App" prompt — shown on web for native-only feature ── */}
                {showNativeCalendarPrompt && (
                  <motion.div
                    key="native-prompt"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                      <button
                        onClick={() => { setShowNativeCalendarPrompt(false); setShowCalendarOptions(true); }}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-semibold text-foreground flex-1">
                        {language === "ar" ? "من تقويم الهاتف" : language === "fr" ? "Calendrier du téléphone" : "From Phone Calendar"}
                      </span>
                      <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-5 flex flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <Smartphone className="w-8 h-8 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {language === "ar" ? "متاحة على التطبيق" : language === "fr" ? "Disponible sur l'app" : "Available on the App"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[240px] mx-auto">
                          {language === "ar"
                            ? "الوصول المباشر لتقويم هاتفك متاح في تطبيق IQXO. نزّل التطبيق للاستيراد التلقائي."
                            : language === "fr"
                              ? "L'accès direct au calendrier est disponible dans l'app IQXO. Téléchargez-la pour importer automatiquement."
                              : "Direct phone calendar access is available in the IQXO app. Download it to auto-import all your events."}
                        </p>
                      </div>
                      <div className="flex gap-3 w-full">
                        <a
                          href="https://apps.apple.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          <span className="text-base leading-none"></span>
                          App Store
                        </a>
                        <a
                          href="https://play.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                          <span className="text-base leading-none">▶</span>
                          Play Store
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Calendar Import Sheet (.ics upload OR pre-loaded native events) ── */}
                {showCalendarImport && (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <CalendarImportSheet
                      language={language}
                      onClose={handleClose}
                      preloadedEvents={nativeCalendarEvents}
                      onBack={nativeCalendarEvents != null ? () => {
                        setShowCalendarImport(false);
                        setNativeCalendarEvents(null);
                        setNativeCalendarError(null);
                        setShowCalendarOptions(true);
                      } : undefined}
                      onImport={async (events) => {
                        await handleImportedEvents(events);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav bar — full-width backdrop, phone-width content */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-t border-border/30"
        animate={visible ? { translateY: 0, opacity: 1 } : { translateY: "100%", opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <nav
          className="mx-auto w-full max-w-md flex items-center justify-around px-1"
          style={{
            height: "calc(64px + env(safe-area-inset-bottom))",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <NavLink
            to="/home"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs transition-all duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                <span className={`font-medium ${isActive ? "opacity-100" : "opacity-60"}`}>Home</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/tomorrow"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs transition-all duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Calendar className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                <span className={`font-medium ${isActive ? "opacity-100" : "opacity-60"}`}>Tomorrow</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/future"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs transition-all duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <CheckCircle2 className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                <span className={`font-medium ${isActive ? "opacity-100" : "opacity-60"}`}>Future</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/schedule"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs transition-all duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <CalendarPlus className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                <span className={`font-medium ${isActive ? "opacity-100" : "opacity-60"}`}>Schedule</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/archive"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs transition-all duration-200 ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <FolderOpen className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
                <span className={`font-medium ${isActive ? "opacity-100" : "opacity-60"}`}>Archive</span>
              </>
            )}
          </NavLink>
        </nav>
      </motion.div>

    </>
  );
}
