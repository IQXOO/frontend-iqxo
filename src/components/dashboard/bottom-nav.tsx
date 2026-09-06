"use client";

import { useState, useRef, useCallback, useEffect, memo } from "react";
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
  id?: string;
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
// NATIVE CALENDAR PREVIEW (select & import events fetched from phone)
// ─────────────────────────────────────────────────────────────────────────────
interface NativeCalendarPreviewProps {
  events: ParsedCalEvent[];
  language: string;
  onClose: () => void;
  onImport: (events: Omit<ParsedCalEvent, "uid" | "selected">[]) => void;
}

function NativeCalendarPreview({ events: initialEvents, language, onClose, onImport }: NativeCalendarPreviewProps) {
  const [items, setItems] = useState<ParsedCalEvent[]>(
    [...initialEvents].sort((a, b) => {
      const dateA = a.date + (a.time ? 'T' + a.time : 'T00:00');
      const dateB = b.date + (b.time ? 'T' + b.time : 'T00:00');
      return dateA.localeCompare(dateB);
    })
  );
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  const L = (en: string, fr: string, ar: string) =>
    language === "ar" ? ar : language === "fr" ? fr : en;

  const selectedCount = items.filter((e) => e.selected).length;

  const toggleItem = (uid: string) =>
    setItems((prev) => prev.map((e) => (e.uid === uid ? { ...e, selected: !e.selected } : e)));

  const toggleAll = () => {
    const allSelected = items.every((e) => e.selected);
    setItems((prev) => prev.map((e) => ({ ...e, selected: !allSelected })));
  };

  const handleImport = async () => {
    setImporting(true);
    await new Promise((r) => setTimeout(r, 400));
    const toImport = items.filter((e) => e.selected).map(({ uid, selected, ...rest }) => rest);
    onImport(toImport);
    setDone(true);
    setImporting(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center text-center py-10 px-6 gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center"
        >
          <Check className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <div>
          <p className="text-base font-bold text-foreground">{L("Events Imported!", "Événements importés !", "تم الاستيراد!")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedCount} {L(`event${selectedCount !== 1 ? "s" : ""} added`, `événement${selectedCount !== 1 ? "s" : ""} ajouté${selectedCount !== 1 ? "s" : ""}`, "حدث تمت إضافته")}
          </p>
        </div>
        <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
          {L("Done", "Terminé", "تم")}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 px-6 gap-3 text-center">
        <Calendar className="w-10 h-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{L("No upcoming events found.", "Aucun événement à venir.", "لم يتم العثور على مواعيد قادمة.")}</p>
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
          {L("Close", "Fermer", "إغلاق")}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground">{selectedCount}/{items.length} {L("selected", "sélectionnés", "محدد")}</p>
        </div>
        <button onClick={toggleAll} className="text-xs text-primary font-medium hover:underline">
          {items.every((e) => e.selected) ? L("Deselect all", "Tout désélectionner", "إلغاء الكل") : L("Select all", "Tout sélectionner", "تحديد الكل")}
        </button>
      </div>

      <div className="max-h-[40vh] overflow-y-auto p-3 space-y-2">
        {items.map((ev) => (
          <motion.button
            key={ev.uid}
            onClick={() => toggleItem(ev.uid)}
            className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left ${
              ev.selected ? "bg-primary/10 border border-primary/25" : "bg-secondary/30 border border-transparent"
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <div className="mt-0.5 shrink-0">
              {ev.selected ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground/40" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                📅 {ev.date}{ev.time ? ` · ⏰ ${ev.time}` : ""}{ev.location ? ` · 📍 ${ev.location}` : ""}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="p-3 border-t border-border">
        <motion.button
          onClick={handleImport}
          disabled={selectedCount === 0 || importing}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            selectedCount > 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-muted-foreground cursor-not-allowed"
          }`}
          whileTap={{ scale: selectedCount > 0 ? 0.98 : 1 }}
        >
          {importing ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          {importing
            ? L("Importing…", "Importation…", "جارٍ الاستيراد…")
            : L(`Import ${selectedCount} event${selectedCount !== 1 ? "s" : ""}`, `Importer ${selectedCount} événement${selectedCount !== 1 ? "s" : ""}`, `استيراد ${selectedCount} حدث`)}
        </motion.button>
      </div>
    </>
  );
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
  onUploadClick: (options?: { autoOpenPicker?: boolean; file?: File | null, files?: File[] }) => void;
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

export const BottomNav = memo(function BottomNav({
  active: _active,
  onTabChange: _onTabChange,
  onUploadClick,
  onManualAdd,
  composerOpen,
  onComposerOpenChange,
  onImportEvents,
}: BottomNavProps) {
  const { language, addEvent, events: existingEvents, user: _user, planStatus } = useApp();
  const isRTL = language === "ar";
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showCalendarImport, setShowCalendarImport] = useState(false);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);
  // native phone calendar sync states
  const [nativeCalLoading, setNativeCalLoading] = useState(false);
  const [nativeCalError, setNativeCalError] = useState<string | null>(null);
  const [nativeCalEvents, setNativeCalEvents] = useState<ParsedCalEvent[] | null>(null);
  const [showNativePreview, setShowNativePreview] = useState(false);
  // camera preview states
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const menuOpen = composerOpen ?? internalMenuOpen;
  const setMenuOpen = onComposerOpenChange ?? setInternalMenuOpen;

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUploadClick({ autoOpenPicker: false, files });
    }
    // Reset so the same file can be selected again
    e.target.value = "";
  }, [onUploadClick]);

  // Stop the camera stream and hide the preview overlay
  const stopCameraStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCameraPreview(false);
  }, [cameraStream]);

  // Called when user taps the shutter button
  const handleCapturePhoto = useCallback(() => {
    const video = cameraVideoRef.current;
    const stream = cameraStream;
    if (!video || !stream) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    stream.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setShowCameraPreview(false);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        onUploadClick({ autoOpenPicker: false, file });
      }
    }, "image/jpeg", 0.9);
  }, [cameraStream, onUploadClick]);

  const handleTakePhotoOption = (capture?: string) => {
    setMenuOpen(false);
    setShowPhotoOptions(false);

    // In Android WebView, input[capture] fails without a native FileProvider.
    // Show a full-screen camera preview with a shutter button instead.
    const isNativeApp = !!(window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView;
    if (isNativeApp && capture) {
      const facing = capture === "environment" ? "environment" : "user";
      setCameraFacing(facing);
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: facing }, audio: false })
        .then((stream) => {
          setCameraStream(stream);
          setShowCameraPreview(true);
        })
        .catch(() => {
          // Fallback: regular file input
          if (hiddenFileInputRef.current) {
            hiddenFileInputRef.current.multiple = true;
            hiddenFileInputRef.current.removeAttribute("capture");
            hiddenFileInputRef.current.click();
          }
        });
      return;
    }

    // Standard browser / gallery flow
    if (hiddenFileInputRef.current) {
      if (capture) {
        hiddenFileInputRef.current.removeAttribute("multiple");
        hiddenFileInputRef.current.setAttribute("capture", capture);
      } else {
        hiddenFileInputRef.current.removeAttribute("capture");
        hiddenFileInputRef.current.multiple = true;
      }
      hiddenFileInputRef.current.click();
    }
  };

  const handleManualEvent = () => {
    setMenuOpen(false);
    setShowPhotoOptions(false);
    onManualAdd();
  };

  // Connect stream to video element whenever it changes
  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
      cameraVideoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  const handleClose = () => {
    setMenuOpen(false);
    setShowPhotoOptions(false);
    setShowCalendarImport(false);
    setShowCalendarOptions(false);
    setNativeCalLoading(false);
    setNativeCalError(null);
    setNativeCalEvents(null);
    setShowNativePreview(false);
    stopCameraStream();
  };

  const handleCalendarImport = () => {
    // Calendar import is a Pro-only feature
    if (planStatus !== "pro" && planStatus !== "free_trial") {
      setMenuOpen(false);
      setShowPhotoOptions(false);
      window.dispatchEvent(new Event("trigger-paywall"));
      return;
    }
    setShowPhotoOptions(false);
    setShowCalendarOptions(true);
  };

  // Request events from the native app's calendar bridge
  const handleSyncPhoneCalendar = () => {
    // Check if running inside the IQXO native WebView
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).ReactNativeWebView) {
      setNativeCalError(
        language === 'ar'
          ? 'هذه الميزة تعمل فقط في تطبيق IQXO على الجوال. حمّل التطبيق للمزامنة مع تقويم هاتفك.'
          : language === 'fr'
          ? 'Cette fonctionnalité nécessite l\'application IQXO mobile. Téléchargez l\'app pour synchroniser votre calendrier.'
          : 'This feature works only inside the IQXO mobile app. Download the app to sync your phone calendar.'
      );
      setShowNativePreview(true);
      return;
    }

    setNativeCalLoading(true);
    setNativeCalError(null);
    setShowNativePreview(true);

    // Listen for the native app's response (one-time)
    const onReady = () => {
      window.removeEventListener('nativeCalendarReady', onReady);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (window as any).__nativeCalendarResult;
      if (!result || result.error) {
        const errMsg = result?.error === 'permission_denied'
          ? (language === 'ar' ? 'تم رفض إذن الوصول إلى التقويم.' : language === 'fr' ? 'Accès au calendrier refusé.' : 'Calendar access was denied.')
          : (language === 'ar' ? 'تعذّر قراءة التقويم.' : language === 'fr' ? 'Impossible de lire le calendrier.' : 'Could not read the calendar.');
        setNativeCalError(errMsg);
        setNativeCalLoading(false);
        return;
      }
      // Map native events into ParsedCalEvent shape
       
      const rawEvents = result.events || [];
      const mapped: ParsedCalEvent[] = rawEvents.map((e: any, i: number) => ({
        uid: `native-${i}-${e.title}`,
        id: e.id || '',
        title: e.title || '',
        date: e.date || '',
        time: e.time || '',
        location: e.location || '',
        notes: e.notes || '',
        selected: true,
      }));
      // Filter future + next 12 months, then sort chronologically
      const today = new Date(); today.setHours(0,0,0,0);
      const filtered = mapped
        .filter(e => new Date(e.date) >= today)
        .sort((a, b) => {
          const dateA = a.date + (a.time ? 'T' + a.time : 'T00:00');
          const dateB = b.date + (b.time ? 'T' + b.time : 'T00:00');
          return dateA.localeCompare(dateB);
        });
      setNativeCalEvents(filtered);
      setNativeCalLoading(false);
    };

    window.addEventListener('nativeCalendarReady', onReady);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'requestCalendarEvents' }));
  };

  const handleImportedEvents = async (
    events: {
      id?: string;
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
        // Deduplication check: do not add if an event with same title, date, and time already exists
        const isDuplicate = existingEvents.some(
          (existing) => 
            (ev.id && existing.native_event_id === ev.id) || 
            (existing.title === ev.title && existing.date === ev.date && existing.time === ev.time)
        );
        if (isDuplicate) {
          continue;
        }
        
        await addEvent({
          title: ev.title,
          date: ev.date,
          time: ev.time,
          location: ev.location || undefined,
          notes: ev.notes,
          source: "calendar_import",
          native_event_id: ev.id || undefined,
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

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          if (y > lastY + 8) {
            setVisible((prev) => (prev ? false : prev));
          } else if (y < lastY - 8) {
            setVisible((prev) => (prev ? prev : true));
          }
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Hidden file input strictly attached to the DOM for iOS Safari bug workaround */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
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
                {!showPhotoOptions && !showCalendarImport && !showCalendarOptions && !showNativePreview && (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <span className="text-sm font-semibold text-foreground">
                        {language === "ar" ? "إضافة جديد" : language === "fr" ? "Ajouter" : "Add New"}
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
                            {language === "ar" ? "إضافة صورة" : language === "fr" ? "Ajouter une photo" : "Add a Photo"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar" ? "كاميرا، مكتبة أو ملف" : language === "fr" ? "Caméra, galerie ou fichier" : "Camera, gallery or file"}
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
                            {language === "ar" ? "إضافة موعد يدوياً" : language === "fr" ? "Créer manuellement" : "Create Manual Event"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar" ? "العنوان، التاريخ، الوقت" : language === "fr" ? "Titre, date, heure" : "Title, date, time"}
                          </p>
                        </div>
                      </motion.button>

                      {/* Import from Calendar — Pro only — opens sub-menu */}
                      <motion.button
                        onClick={handleCalendarImport}
                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-secondary/60 transition-colors text-left group"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            {language === "ar" ? "استيراد من التقويم" : language === "fr" ? "Importer depuis Calendrier" : "Import from Calendar"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar" ? "تقويم الهاتف أو ملف .ics" : language === "fr" ? "Calendrier du téléphone ou fichier .ics" : "Phone calendar or .ics file"}
                          </p>
                        </div>
                        <span className="text-muted-foreground text-xs">›</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Calendar Options sub-menu ── */}
                {showCalendarOptions && !showCalendarImport && !showNativePreview && (
                  <motion.div
                    key="calOptions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                      <button
                        onClick={() => setShowCalendarOptions(false)}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-sm leading-none">‹</span>
                      </button>
                      <span className="text-sm font-semibold text-foreground flex-1">
                        {language === "ar" ? "استيراد من التقويم" : language === "fr" ? "Importer depuis Calendrier" : "Import from Calendar"}
                      </span>
                      <button
                        onClick={handleClose}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-3 space-y-2">
                      {/* Option 1: Sync Phone Calendar */}
                      <motion.button
                        onClick={handleSyncPhoneCalendar}
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all text-left"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <Smartphone className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {language === "ar" ? "مزامنة تقويم الهاتف" : language === "fr" ? "Synchroniser le calendrier" : "Sync Phone Calendar"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar" ? "جلب كل المواعيد تلقائياً" : language === "fr" ? "Importer tous vos événements automatiquement" : "Auto-fetch all your events"}
                          </p>
                        </div>
                        <span className="text-emerald-500 text-xs font-bold">✦</span>
                      </motion.button>

                      {/* Option 2: Upload .ics file */}
                      <motion.button
                        onClick={() => { setShowCalendarOptions(false); setShowCalendarImport(true); }}
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <FolderOpen className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {language === "ar" ? "رفع ملف .ics" : language === "fr" ? "Importer un fichier .ics" : "Upload .ics File"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {language === "ar" ? "Apple، Google، Outlook" : language === "fr" ? "Apple, Google, Outlook" : "Apple, Google, Outlook"}
                          </p>
                        </div>
                        <span className="text-muted-foreground text-xs">›</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Native Calendar Preview ── */}
                {showNativePreview && (
                  <motion.div
                    key="nativePreview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                      <button
                        onClick={() => { setShowNativePreview(false); setNativeCalEvents(null); setNativeCalError(null); setNativeCalLoading(false); setShowCalendarOptions(true); }}
                        className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-sm leading-none">‹</span>
                      </button>
                      <span className="text-sm font-semibold text-foreground flex-1">
                        {language === "ar" ? "تقويم الهاتف" : language === "fr" ? "Calendrier du téléphone" : "Phone Calendar"}
                      </span>
                      <button onClick={handleClose} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Loading */}
                    {nativeCalLoading && (
                      <div className="flex flex-col items-center gap-4 py-12 px-6">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full"
                        />
                        <p className="text-sm text-muted-foreground">
                          {language === "ar" ? "جارٍ قراءة التقويم…" : language === "fr" ? "Lecture du calendrier…" : "Reading your calendar…"}
                        </p>
                      </div>
                    )}

                    {/* Error / not-in-app notice */}
                    {!nativeCalLoading && nativeCalError && !nativeCalEvents && (
                      <div className="p-5 space-y-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-300 leading-relaxed">{nativeCalError}</p>
                        </div>
                        <button
                          onClick={handleClose}
                          className="w-full py-3 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                        >
                          {language === "ar" ? "إغلاق" : language === "fr" ? "Fermer" : "Close"}
                        </button>
                      </div>
                    )}

                    {/* Events loaded — show selectable preview */}
                    {!nativeCalLoading && nativeCalEvents && (
                      <NativeCalendarPreview
                        events={nativeCalEvents}
                        language={language}
                        onClose={handleClose}
                        onImport={async (evts) => { await handleImportedEvents(evts); handleClose(); }}
                      />
                    )}
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

                {/* ── Calendar Import Sheet (.ics) ── */}
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

      {/* Bottom Nav bar */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-center"
        animate={visible ? { translateY: 0, opacity: 1 } : { translateY: "100%", opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-md">
          <nav 
            className="flex items-center justify-between bg-background/90 backdrop-blur-xl border-t border-border/50 rounded-t-2xl px-3 pt-1 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
          >
            <NavLink
              to="/home"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-[2px] rounded-2xl px-1 min-[375px]:px-2 py-1 text-[10px] sm:text-[11px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? "text-[#3B82F6]" // Blue
                    : "bg-transparent text-[#6E6E78] hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-[rgba(59,130,246,0.14)]' : ''}`}>
                    <Home className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${isActive ? "text-[#3B82F6]" : "opacity-75"}`} />
                  </div>
                  <span className={isActive ? "font-medium" : "font-normal"}>
                    {language === "ar" ? "الرئيسية" : language === "fr" ? "Accueil" : "Home"}
                  </span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/tomorrow"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-[2px] rounded-2xl px-1 min-[375px]:px-2 py-1 text-[10px] sm:text-[11px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? "text-[#EAB308]" // Yellow
                    : "bg-transparent text-[#6E6E78] hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-[rgba(234,179,8,0.14)]' : ''}`}>
                    <Calendar className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${isActive ? "text-[#EAB308]" : "opacity-75"}`} />
                  </div>
                  <span className={isActive ? "font-medium" : "font-normal"}>
                    {language === "ar" ? "غداً" : language === "fr" ? "Demain" : "Tomorrow"}
                  </span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/future"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-[2px] rounded-2xl px-1 min-[375px]:px-2 py-1 text-[10px] sm:text-[11px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? "text-[#A855F7]" // Purple
                    : "bg-transparent text-[#6E6E78] hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-[rgba(168,85,247,0.14)]' : ''}`}>
                    <CheckCircle2 className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${isActive ? "text-[#A855F7]" : "opacity-75"}`} />
                  </div>
                  <span className={isActive ? "font-medium" : "font-normal"}>
                    {language === "ar" ? "مستقبلاً" : language === "fr" ? "À venir" : "Future"}
                  </span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/schedule"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-[2px] rounded-2xl px-1 min-[375px]:px-2 py-1 text-[10px] sm:text-[11px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? "text-[#3B82F6]" // Blue
                    : "bg-transparent text-[#6E6E78] hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-[rgba(59,130,246,0.14)]' : ''}`}>
                    <CalendarPlus className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${isActive ? "text-[#3B82F6]" : "opacity-75"}`} />
                  </div>
                  <span className={isActive ? "font-medium" : "font-normal"}>
                    {language === "ar" ? "الجدول" : language === "fr" ? "Planning" : "Schedule"}
                  </span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/archive"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-[2px] rounded-2xl px-1 min-[375px]:px-2 py-1 text-[10px] sm:text-[11px] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? "text-[#22C55E]" // Green
                    : "bg-transparent text-[#6E6E78] hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${isActive ? 'bg-[rgba(34,197,94,0.14)]' : ''}`}>
                    <FolderOpen className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${isActive ? "text-[#22C55E]" : "opacity-75"}`} />
                  </div>
                  <span className={isActive ? "font-medium" : "font-normal"}>
                    {language === "ar" ? "الأرشيف" : language === "fr" ? "Archive" : "Archive"}
                  </span>
                </>
              )}
            </NavLink>
          </nav>
        </div>
      </motion.div>

      {/* ── Camera Preview Overlay (Native WebView only) ── */}
      {showCameraPreview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            backgroundColor: "#000",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Live video viewfinder */}
          <video
            ref={cameraVideoRef}
            playsInline
            muted
            autoPlay
            style={{
              flex: 1,
              width: "100%",
              objectFit: "cover",
              transform: cameraFacing === "user" ? "scaleX(-1)" : "none",
            }}
          />

          {/* Controls bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px 36px",
              backgroundColor: "rgba(0,0,0,0.85)",
            }}
          >
            {/* Cancel */}
            <button
              onClick={stopCameraStream}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.15)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: 22, height: 22, color: "#fff" }} />
            </button>

            {/* Shutter button */}
            <button
              onClick={handleCapturePhoto}
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                backgroundColor: "#fff",
                border: "5px solid rgba(255,255,255,0.4)",
                boxShadow: "0 0 0 3px rgba(255,255,255,0.25), 0 4px 24px rgba(0,0,0,0.6)",
                cursor: "pointer",
                transition: "transform 0.1s ease",
              }}
              onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)"; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            />

            {/* Spacer to centre the shutter */}
            <div style={{ width: 48 }} />
          </div>
        </div>
      )}
    </>
  );
});
