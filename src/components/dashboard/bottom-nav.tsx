"use client";

import { useState, useRef, useCallback } from "react";
import {
  Plus,
  Camera,
  CalendarPlus,
  X,
  Mic,
  Calendar,
  ImageIcon,
  FolderOpen,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronRight,
  Check,
} from "lucide-react";
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
}

function CalendarImportSheet({
  language,
  onClose,
  onImport,
}: CalendarImportSheetProps) {
  const [stage, setStage] = useState<"pick" | "preview" | "done">("pick");
  const [parsedEvents, setParsedEvents] = useState<ParsedCalEvent[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
  onUploadClick: () => void;
  onManualAdd: () => void;
  onMicClick?: () => void;
  onImportEvents?: (
    events: {
      title: string;
      date: string;
      time: string;
      location: string;
      notes: string;
    }[],
  ) => void;
  showFab?: boolean;
}

export function BottomNav({
  active,
  onTabChange,
  onUploadClick,
  onManualAdd,
  onMicClick,
  onImportEvents,
  showFab = true,
}: BottomNavProps) {
  const { language, addEvent, user } = useApp();
  const isRTL = language === "ar";
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCalendarImport, setShowCalendarImport] = useState(false);

  const handleMainFabClick = () => setMenuOpen(true);

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
        onUploadClick();
        setTimeout(() => {
          const uploadInput = document.getElementById(
            "iqxo-upload-input",
          ) as HTMLInputElement;
          if (uploadInput) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            uploadInput.files = dataTransfer.files;
            uploadInput.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }, 150);
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
  };

  const handleCalendarImport = () => {
    setShowPhotoOptions(false);
    setShowCalendarImport(true);
  };

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
                {!showPhotoOptions && !showCalendarImport && (
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
                          onUploadClick();
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

                {/* ── Calendar Import Sheet ── */}
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

      {/* FAB */}
      {showFab && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30">
          <motion.div
            className="flex items-center justify-center gap-4 px-6 py-4"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <motion.button
              onClick={handleMainFabClick}
              className="relative w-14 h-14 rounded-full bg-blue-500/90 border-2 border-blue-400/10 flex items-center justify-center text-black-600 dark:text-white-600 shadow-lg shadow-blue-400/20 hover:bg-blue-500/25 hover:border-blue-400/70 hover:shadow-blue-400/40 transition-all duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 1.2 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <Plus className="w-8 h-8" strokeWidth={3} />
            </motion.button>

            <motion.button
              onClick={onMicClick}
              className="w-17 h-17 rounded-full bg-blue-500/90 border-2 border-blue-400/10 flex items-center justify-center text-black-600 dark:text-white-600 shadow-md shadow-blue-400/20 hover:bg-blue-500/25 hover:border-blue-400/70 hover:shadow-blue-400/40 transition-all duration-200"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 1.15, rotate: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <Mic className="w-6 h-6" />
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Bottom Nav bar */}
      <div className="fixed bottom-0 left-0 right-0 h-20 pointer-events-none">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-md border-t border-border/30" />
      </div>
    </>
  );
}
