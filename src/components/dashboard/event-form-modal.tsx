"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Check,
  MapPin,
  Phone,
  Mail,
  Paperclip,
  ChevronDown,
  X,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../ui/popover";
import { useApp } from "../../lib/store";
import { supabase } from "../../lib/supabase";
import { devError, devLog, devWarn, getFriendlyErrorMessage } from "../../lib/logger";
import { useToast } from "../../hooks/use-toast";
import type { IQXOEvent } from "../../lib/types";
import type { ParsedEvent } from "../../lib/parse-voice-input";

interface EventFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEvent?: IQXOEvent | null;
  prefillData?: ParsedEvent | null;
  voiceData?: ParsedEvent | null;
  prefillImageUrl?: string;
}

const COLOR_PALETTE = [
  "#00C2FF", // Cyan / Sky (matches screenshot & app primary)
  "#007AFF", // Blue
  "#FF3B30", // Red
  "#34C759", // Green
  "#FF9500", // Orange
  "#AF52DE", // Purple
  "#FF2D55", // Pink
  "#EAB308", // Yellow
  "#5856D6", // Indigo
  "#14B8A6", // Teal
];

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultStartTimeString(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  if (minutes < 30) {
    now.setMinutes(30, 0, 0);
  } else {
    now.setHours(now.getHours() + 1, 0, 0, 0);
  }
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${mins}`;
}

function getDefaultEndTimeString(start: string): string {
  if (!start) return "";
  const parts = start.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const endHour = (h + 1) % 24;
  return `${String(endHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function uploadToStorage(
  file: File,
  userId: string,
  bucket: "event-images" | "event-pdfs"
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // 10-second timeout safeguard so it never hangs indefinitely
  const uploadPromise = supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
    setTimeout(() => reject(new Error("Upload timed out after 10 seconds")), 10000)
  );

  const { error } = (await Promise.race([uploadPromise, timeoutPromise])) as any;
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function EventFormModal({
  open,
  onOpenChange,
  editEvent,
  prefillData,
  voiceData,
  prefillImageUrl,
}: EventFormModalProps) {
  const { addEvent, updateEvent, user, theme, language, events } = useApp();
  const { toast } = useToast();
  const [workSchedule, setWorkSchedule] = useState<
    { day_of_week: number; start_time: string; end_time: string }[]
  >([]);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(getTodayDateString);
  const [time, setTime] = useState(getDefaultStartTimeString);
  const [endTime, setEndTime] = useState(() => getDefaultEndTimeString(getDefaultStartTimeString()));
  const [color, setColor] = useState("#00C2FF");
  const [recurrence, setRecurrence] = useState("");
  const [reminders, setReminders] = useState<{ minutes_before: number }[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Attachment states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [conflictTitle, setConflictTitle] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // ── Fill form on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setUploadError(null);
    setConflictTitle(null);
    setIsDuplicate(false);
    setIsColorPickerOpen(false);

    // Fetch user's work schedule only once if not loaded
    if (user && workSchedule.length === 0) {
      supabase
        .from("work_schedules")
        .select("day_of_week,start_time,end_time")
        .eq("user_id", user.id)
        .then(({ data, error }) => {
          if (!error && data) setWorkSchedule(data);
        });
    }

    if (editEvent) {
      setTitle(editEvent.title || "");
      setDate(editEvent.date || getTodayDateString());
      setTime(editEvent.start_time || editEvent.time || getDefaultStartTimeString());
      setEndTime(editEvent.end_time || "");
      setColor(editEvent.color || "#00C2FF");
      setRecurrence(editEvent.recurrence_rule || "");
      setReminders(editEvent.reminders || []);
      setPhone(editEvent.phone || "");
      setEmail(editEvent.email || "");
      setLocation(editEvent.location || "");
      setNotes(editEvent.notes || "");
      setImagePreview(
        editEvent.image_url &&
          editEvent.image_url !== "null" &&
          editEvent.image_url !== "undefined"
          ? editEvent.image_url
          : null
      );
      setImageFile(null);
      setExistingPdfUrl(
        editEvent.pdf_url &&
          editEvent.pdf_url !== "null" &&
          editEvent.pdf_url !== "undefined"
          ? editEvent.pdf_url
          : null
      );
      setPdfFile(null);
      setPdfName(
        editEvent.pdf_url &&
          editEvent.pdf_url !== "null" &&
          editEvent.pdf_url !== "undefined"
          ? decodeURIComponent(editEvent.pdf_url.split("/").pop() ?? "document.pdf")
          : null
      );
    } else if (prefillData) {
      setTitle(prefillData.title || "");
      setDate(prefillData.date || getTodayDateString());
      setTime(prefillData.start_time || prefillData.time || getDefaultStartTimeString());
      setEndTime(prefillData.end_time || "");
      setColor(prefillData.color || "#00C2FF");
      setRecurrence(prefillData.recurrence_rule || "");
      setReminders(prefillData.reminders || []);
      setPhone(prefillData.phone || "");
      setLocation(prefillData.location || "");
      setNotes(prefillData.notes || "");
      setImagePreview(
        prefillImageUrl &&
          prefillImageUrl !== "null" &&
          prefillImageUrl !== "undefined"
          ? prefillImageUrl
          : null
      );
      setImageFile(null);
      setPdfFile(null);
      setPdfName(null);
      setExistingPdfUrl(null);
    } else {
      const today = getTodayDateString();
      const defaultStart = getDefaultStartTimeString();
      const defaultEnd = getDefaultEndTimeString(defaultStart);

      setTitle("");
      setDate(today);
      setTime(defaultStart);
      setEndTime(defaultEnd);
      setColor("#00C2FF");
      setRecurrence("");
      setReminders([]);
      setPhone("");
      setEmail("");
      setLocation("");
      setNotes("");
      setImagePreview(null);
      setImageFile(null);
      setPdfFile(null);
      setPdfName(null);
      setExistingPdfUrl(null);
    }
  }, [open, editEvent, prefillData, prefillImageUrl, user]);

  useEffect(() => {
    if (voiceData) {
      setTitle(voiceData.title || "");
      setDate(voiceData.date || getTodayDateString());
      setTime(voiceData.start_time || voiceData.time || getDefaultStartTimeString());
      setEndTime(voiceData.end_time || "");
      if (voiceData.color) setColor(voiceData.color);
      if (voiceData.recurrence_rule) setRecurrence(voiceData.recurrence_rule);
      if (voiceData.reminders) setReminders(voiceData.reminders);
      setLocation(voiceData.location || "");
      setPhone(voiceData.phone || "");
    }
  }, [voiceData]);

  // ── Conflict / Duplicate check ─────────────────────────────────────────────
  const checkDuplicateAndConflict = useCallback(
    (currentTitle: string, d: string, tm: string) => {
      if (!d || !tm) {
        setIsDuplicate(false);
        setConflictTitle(null);
        return;
      }

      const checkDt = new Date(`${d}T${tm}`);
      if (isNaN(checkDt.getTime())) return;

      const checkMins = checkDt.getHours() * 60 + checkDt.getMinutes();
      const cleanCurrentTitle = currentTitle.trim().toLowerCase();

      let foundConflictName: string | null = null;
      let foundDuplicateName: string | null = null;

      for (const ev of events) {
        if (ev.id === editEvent?.id) continue;
        if (ev.date !== d || !ev.time) continue;

        const evDt = new Date(`${ev.date}T${ev.time}`);
        if (isNaN(evDt.getTime())) continue;

        const timeDiffMinutes = Math.abs(checkDt.getTime() - evDt.getTime()) / 60000;

        // Duplicate Check: Same Date, Same Time (<1 min), Similar Title
        if (timeDiffMinutes < 1.0) {
          const cleanEvTitle = ev.title.trim().toLowerCase();
          if (
            cleanCurrentTitle &&
            (cleanCurrentTitle === cleanEvTitle ||
              cleanCurrentTitle.includes(cleanEvTitle) ||
              cleanEvTitle.includes(cleanCurrentTitle))
          ) {
            foundDuplicateName = ev.title;
            break;
          }
        }

        // Conflict Check: within 60 minutes
        if (timeDiffMinutes < 60 && !foundConflictName) {
          foundConflictName = ev.title;
        }
      }

      if (foundDuplicateName) {
        setIsDuplicate(true);
        setConflictTitle(foundDuplicateName);
        return;
      }

      setIsDuplicate(false);

      if (foundConflictName) {
        setConflictTitle(foundConflictName);
        return;
      }

      // Check against work schedule for that day-of-week
      const dow = new Date(d + "T12:00:00").getDay();
      const ws = workSchedule.find((w) => w.day_of_week === dow);
      if (ws) {
        const [sh, sm] = ws.start_time.split(":").map(Number);
        const [eh, em] = ws.end_time.split(":").map(Number);
        const wsStart = sh * 60 + sm;
        const wsEnd = eh * 60 + em < wsStart ? eh * 60 + em + 24 * 60 : eh * 60 + em;
        const checkAdjusted = checkMins < wsStart ? checkMins + 24 * 60 : checkMins;
        if (checkAdjusted >= wsStart && checkAdjusted < wsEnd) {
          const workHoursLabel =
            language === "ar"
              ? `ساعات العمل (${ws.start_time}–${ws.end_time})`
              : language === "fr"
              ? `Heures de travail (${ws.start_time}–${ws.end_time})`
              : `Work hours (${ws.start_time}–${ws.end_time})`;
          setConflictTitle(workHoursLabel);
          return;
        }
      }

      setConflictTitle(null);
    },
    [events, editEvent, workSchedule, language]
  );

  useEffect(() => {
    checkDuplicateAndConflict(title, date, time);
  }, [title, date, time, checkDuplicateAndConflict]);

  // ── File Handlers (Using instant ObjectURL for 0ms lag) ─────────────────────
  const handleAttachSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setUploadError(null);
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(
          language === "ar"
            ? "يجب أن يكون حجم الملف أقل من 10 ميجابايت."
            : "PDF must be under 10 MB."
        );
        e.target.value = "";
        return;
      }
      setPdfFile(file);
      setPdfName(file.name);
      setExistingPdfUrl(null);
      setUploadError(null);
    } else {
      setUploadError(
        language === "ar"
          ? "يرجى اختيار صورة أو ملف PDF."
          : "Please select an image or PDF file."
      );
    }

    e.target.value = "";
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim() && !date) {
      toast({
        title: language === "ar" ? "بيانات ناقصة" : "Validation Error",
        description:
          language === "ar"
            ? "يرجى إدخال عنوان وتاريخ الحدث."
            : "Title and Date are required.",
        variant: "destructive",
      });
      return;
    }
    if (!title.trim()) {
      toast({
        title: language === "ar" ? "العنوان مطلوب" : "Validation Error",
        description:
          language === "ar"
            ? "يرجى إدخال عنوان للحدث."
            : "Please enter an event title.",
        variant: "destructive",
      });
      return;
    }
    if (!date) {
      toast({
        title: language === "ar" ? "التاريخ مطلوب" : "Validation Error",
        description:
          language === "ar"
            ? "يرجى اختيار تاريخ للحدث."
            : "Please select a date.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({
        title: language === "ar" ? "خطأ في تسجيل الدخول" : "Auth Error",
        description:
          language === "ar"
            ? "يجب تسجيل الدخول لحفظ الحدث."
            : "You must be logged in.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const isHttpUrl = (url?: string | null) =>
        typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));

      let finalImageUrl: string | undefined = undefined;
      if (imageFile) {
        finalImageUrl = await uploadToStorage(imageFile, user.id, "event-images");
      } else if (isHttpUrl(imagePreview)) {
        finalImageUrl = imagePreview;
      }

      let finalPdfUrl: string | undefined = undefined;
      if (pdfFile) {
        finalPdfUrl = await uploadToStorage(pdfFile, user.id, "event-pdfs");
      } else if (isHttpUrl(existingPdfUrl)) {
        finalPdfUrl = existingPdfUrl;
      }

      const payload = {
        title: title.trim(),
        date,
        time,
        start_time: time,
        end_time: endTime || undefined,
        color,
        recurrence_rule: recurrence || undefined,
        reminders,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim(),
        image_url: finalImageUrl,
        pdf_url: finalPdfUrl,
        source: "manual",
        is_done: false,
      };

      if (editEvent) {
        await updateEvent(editEvent.id, payload);
      } else {
        await addEvent(payload);
      }

      onOpenChange(false);
      toast({
        title: language === "ar" ? "تم الحفظ" : "Saved",
        description: language === "ar" ? "تم حفظ الحدث بنجاح" : "Event saved successfully",
      });
    } catch (err) {
      const message = getFriendlyErrorMessage(
        err,
        language === "ar"
          ? "تعذر حفظ الحدث. يرجى المحاولة مرة أخرى."
          : "Failed to save. Please try again."
      );
      setUploadError(message);
      toast({
        title: language === "ar" ? "تعذر حفظ الحدث" : "Couldn't save event",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const hasPdf = !!pdfName;

  const labels = {
    createEvent: language === "ar" ? "إضافة حدث" : language === "fr" ? "Créer un événement" : "Create Event",
    editEvent: language === "ar" ? "تعديل الحدث" : language === "fr" ? "Modifier l'événement" : "Edit Event",
    save: language === "ar" ? "حفظ" : language === "fr" ? "Enregistrer" : "Save",
    saveEvent: language === "ar" ? "حفظ الحدث" : language === "fr" ? "Enregistrer l'événement" : "Save Event",
    saveChanges: language === "ar" ? "حفظ التعديلات" : language === "fr" ? "Enregistrer les modifications" : "Save Changes",
    uploading: language === "ar" ? "جاري الحفظ..." : language === "fr" ? "Enregistrement..." : "Saving...",
    titleAndColor: language === "ar" ? "العنوان واللون" : language === "fr" ? "Titre & Couleur" : "TITLE & COLOR",
    eventTitlePlaceholder: language === "ar" ? "عنوان الحدث" : language === "fr" ? "Titre de l'événement" : "Event Title",
    dateAndTime: language === "ar" ? "التاريخ والوقت" : language === "fr" ? "Date & Heure" : "DATE & TIME",
    dateLabel: language === "ar" ? "التاريخ" : language === "fr" ? "Date" : "DATE",
    startLabel: language === "ar" ? "البدء" : language === "fr" ? "Début" : "START",
    endLabel: language === "ar" ? "الانتهاء" : language === "fr" ? "Fin" : "END",
    location: language === "ar" ? "الموقع" : language === "fr" ? "Lieu" : "LOCATION",
    locationPlaceholder: language === "ar" ? "الموقع / الرابط" : language === "fr" ? "Lieu / Lien" : "Location / Link",
    schedule: language === "ar" ? "الجدول" : language === "fr" ? "Planning" : "SCHEDULE",
    repeatNever: language === "ar" ? "التكرار: بدون تكرار" : "Repeat: Never",
    repeatDaily: language === "ar" ? "التكرار: يومياً" : "Repeat: Daily",
    repeatWeekly: language === "ar" ? "التكرار: أسبوعياً" : "Repeat: Weekly",
    repeatMonthly: language === "ar" ? "التكرار: شهرياً" : "Repeat: Monthly",
    reminderNone: language === "ar" ? "التذكير: بدون تذكير" : "Reminder: None",
    reminderAtTime: language === "ar" ? "التذكير: في وقت الحدث" : "Reminder: At time",
    reminder10m: language === "ar" ? "التذكير: قبل 10 دقائق" : "Reminder: 10m before",
    reminder15m: language === "ar" ? "التذكير: قبل 15 دقيقة" : "Reminder: 15m before",
    reminder30m: language === "ar" ? "التذكير: قبل 30 دقيقة" : "Reminder: 30m before",
    reminder1h: language === "ar" ? "التذكير: قبل ساعة" : "Reminder: 1h before",
    reminder1d: language === "ar" ? "التذكير: قبل يوم" : "Reminder: 1d before",
    contactInfo: language === "ar" ? "معلومات التواصل (اختياري)" : language === "fr" ? "Contact (optionnel)" : "CONTACT INFO (optional)",
    phonePlaceholder: language === "ar" ? "الهاتف" : language === "fr" ? "Téléphone" : "Phone",
    emailPlaceholder: language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "E-mail" : "Email",
    notesAndAttachment: language === "ar" ? "الملاحظات والمرفقات" : language === "fr" ? "Notes & Pièce jointe" : "NOTES & ATTACHMENT",
    notesPlaceholder: language === "ar" ? "أضف ملاحظة..." : language === "fr" ? "Ajouter une note..." : "Add a note...",
    subtext: language === "ar" ? "يمكنك تعديل التفاصيل لاحقاً من تقويمك." : language === "fr" ? "Vous pourrez modifier les détails plus tard depuis votre calendrier." : "You can edit the details later from your calendar.",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-0 z-50 w-full h-full max-h-screen bg-background border-none flex flex-col p-0 gap-0 translate-x-0 translate-y-0 top-0 left-0 max-w-none rounded-none sm:max-w-[430px] sm:h-[90vh] sm:max-h-[850px] sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border sm:border-border sm:shadow-2xl overflow-hidden outline-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {editEvent ? labels.editEvent : labels.createEvent}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {editEvent ? labels.editEvent : labels.createEvent}
        </DialogDescription>

        {/* ── STICKY TOP HEADER ── */}
        <div className="flex justify-between items-center px-4 py-3.5 border-b border-border/80 bg-background/95 backdrop-blur-xl sticky top-0 z-50 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-2 -ml-1 rounded-xl text-foreground hover:bg-secondary/60 active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {editEvent ? labels.editEvent : labels.createEvent}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="px-4 py-1.5 rounded-xl bg-[#5BC0DE]/15 hover:bg-[#5BC0DE]/25 border border-[#5BC0DE]/30 text-[#5BC0DE] font-semibold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
          >
            {isUploading && (
              <span className="w-3.5 h-3.5 border-2 border-[#5BC0DE]/30 border-t-[#5BC0DE] rounded-full animate-spin" />
            )}
            <span>{isUploading ? labels.uploading : labels.save}</span>
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="px-5 py-5 overflow-y-auto flex-1 flex flex-col gap-4 min-h-0 pb-6">

          {/* ── 1. TITLE & COLOR ── */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
              {labels.titleAndColor}
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={labels.eventTitlePlaceholder}
                className="flex-1 px-4 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-sm sm:text-base font-medium"
              />

              {/* Color Swatch & Popover */}
              <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-12 h-12 rounded-2xl shrink-0 cursor-pointer transition-transform active:scale-95 shadow-md flex items-center justify-center border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#5BC0DE]"
                    style={{ backgroundColor: color }}
                    aria-label="Select event color"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-sm" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-auto p-3 rounded-2xl bg-popover/95 backdrop-blur-xl border border-border shadow-2xl z-[100]"
                >
                  <div className="grid grid-cols-5 gap-2.5">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColor(c);
                          setIsColorPickerOpen(false);
                        }}
                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                          color === c
                            ? "scale-110 ring-2 ring-offset-2 ring-offset-background shadow-md"
                            : "hover:scale-105 opacity-80 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor: c,
                          ["--tw-ring-color" as string]: c,
                        }}
                        aria-label={`Color ${c}`}
                      >
                        {color === c && (
                          <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* ── 2. DATE & TIME (Directly typable, visible, responsive inputs) ── */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
              {labels.dateAndTime}
            </label>
            <div className="rounded-2xl border border-border/80 bg-secondary/40 overflow-hidden grid grid-cols-3 divide-x divide-border/60 rtl:divide-x-reverse shadow-sm">
              {/* DATE */}
              <div className="p-2 sm:p-2.5 flex flex-col justify-center min-w-0 bg-transparent hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                  {labels.dateLabel}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-foreground cursor-pointer min-w-0 p-0 ${
                    theme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"
                  }`}
                  required
                />
              </div>

              {/* START TIME */}
              <div className="p-2 sm:p-2.5 flex flex-col justify-center min-w-0 bg-transparent hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                  {labels.startLabel}
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-foreground cursor-pointer min-w-0 p-0 ${
                    theme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"
                  }`}
                />
              </div>

              {/* END TIME */}
              <div className="p-2 sm:p-2.5 flex flex-col justify-center min-w-0 bg-transparent hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                  {labels.endLabel}
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-foreground cursor-pointer min-w-0 p-0 ${
                    theme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ── 3. LOCATION ── */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
              {labels.location}
            </label>
            <div className="relative flex items-center">
              <MapPin className="w-4 h-4 text-[#5BC0DE] absolute left-4 rtl:left-auto rtl:right-4 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={labels.locationPlaceholder}
                className="w-full pl-11 pr-4 rtl:pl-4 rtl:pr-11 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-sm font-medium"
              />
            </div>
          </div>

          {/* ── 4. SCHEDULE (Repeat + Reminder) ── */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
              {labels.schedule}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Repeat */}
              <div className="relative flex items-center">
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full appearance-none px-3.5 sm:px-4 py-3.5 pr-9 rtl:pr-3.5 rtl:pl-9 rounded-2xl border border-border/80 bg-secondary/40 text-foreground text-xs sm:text-sm font-medium outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 cursor-pointer truncate"
                >
                  <option value="">{labels.repeatNever}</option>
                  <option value="FREQ=DAILY">{labels.repeatDaily}</option>
                  <option value="FREQ=WEEKLY">{labels.repeatWeekly}</option>
                  <option value="FREQ=MONTHLY">{labels.repeatMonthly}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground/60 absolute right-3 rtl:right-auto rtl:left-3 pointer-events-none" />
              </div>

              {/* Reminder */}
              <div className="relative flex items-center">
                <select
                  value={reminders.length > 0 ? String(reminders[0].minutes_before) : ""}
                  onChange={(e) =>
                    setReminders(
                      e.target.value ? [{ minutes_before: parseInt(e.target.value, 10) }] : []
                    )
                  }
                  className="w-full appearance-none px-3.5 sm:px-4 py-3.5 pr-9 rtl:pr-3.5 rtl:pl-9 rounded-2xl border border-border/80 bg-secondary/40 text-foreground text-xs sm:text-sm font-medium outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 cursor-pointer truncate"
                >
                  <option value="">{labels.reminderNone}</option>
                  <option value="0">{labels.reminderAtTime}</option>
                  <option value="10">{labels.reminder10m}</option>
                  <option value="15">{labels.reminder15m}</option>
                  <option value="30">{labels.reminder30m}</option>
                  <option value="60">{labels.reminder1h}</option>
                  <option value="1440">{labels.reminder1d}</option>
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground/60 absolute right-3 rtl:right-auto rtl:left-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ── 5. CONTACT INFO (optional) ── */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
              {labels.contactInfo}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Phone */}
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={labels.phonePlaceholder}
                  className="w-full pl-10 pr-3.5 rtl:pl-3.5 rtl:pr-10 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-xs sm:text-sm font-medium"
                />
              </div>

              {/* Email */}
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={labels.emailPlaceholder}
                  className="w-full pl-10 pr-3.5 rtl:pl-3.5 rtl:pr-10 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* ── 6. NOTES & ATTACHMENT ── */}
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
              {labels.notesAndAttachment}
            </label>
            <div className="relative rounded-2xl border border-border/80 bg-secondary/40 p-3.5 transition-all duration-200 focus-within:border-[#5BC0DE] focus-within:ring-2 focus-within:ring-[#5BC0DE]/20 shadow-sm">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={labels.notesPlaceholder}
                rows={3}
                className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 text-sm font-medium resize-none pb-7 leading-relaxed"
              />

              {/* Bottom bar inside notes box: Attachment icon */}
              <div className="absolute bottom-2.5 right-3 rtl:right-auto rtl:left-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => attachInputRef.current?.click()}
                  className={`p-1.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                    imagePreview || hasPdf
                      ? "text-[#5BC0DE] bg-[#5BC0DE]/15 hover:bg-[#5BC0DE]/25"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60"
                  }`}
                  aria-label="Attach file"
                  title={imagePreview || hasPdf ? "Attachment added" : "Attach image or PDF"}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hidden Attachment input */}
            <input
              ref={attachInputRef}
              type="file"
              accept="image/*"
              onChange={handleAttachSelect}
              className="hidden"
            />

            {/* Attachment preview pills */}
            {(imagePreview || hasPdf) && (
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {imagePreview && (
                  <div className="relative h-14 w-14 rounded-xl overflow-hidden border border-border/80 bg-black/20 group shadow-sm">
                    <img
                      src={imagePreview}
                      alt="Attachment preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                      }}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black/90 text-white rounded-full p-0.5 transition-colors"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {hasPdf && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border/80 max-w-full shadow-sm">
                    <FileCheck className="h-4 w-4 text-red-400 shrink-0" />
                    <span className="text-xs text-foreground truncate max-w-[200px] font-medium">
                      {pdfName || "document.pdf"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfFile(null);
                        setPdfName(null);
                        setExistingPdfUrl(null);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5"
                      aria-label="Remove PDF"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Conflict & Duplicate Warnings ── */}
          {isDuplicate && conflictTitle && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400 leading-relaxed font-medium">
                {language === "ar"
                  ? "قد يكون هذا الحدث موجوداً بالفعل في جدولك باسم: "
                  : language === "fr"
                  ? "Cet événement existe peut-être déjà dans votre calendrier : "
                  : "This event may already exist in your schedule: "}
                <span className="font-bold underline">{conflictTitle}</span>
              </p>
            </div>
          )}

          {!isDuplicate && conflictTitle && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400 leading-relaxed font-medium">
                {language === "ar"
                  ? "لديك حدث بالفعل مجدول في هذا الوقت: "
                  : language === "fr"
                  ? "Vous avez déjà un événement programmé à cette heure : "
                  : "You already have an event scheduled at this time: "}
                <span className="font-bold underline">{conflictTitle}</span>
              </p>
            </div>
          )}

          {/* ── Error Banner ── */}
          {uploadError && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-destructive/10 border border-destructive/25">
              <X className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive font-medium">{uploadError}</p>
            </div>
          )}
        </div>

        {/* ── STICKY FOOTER ── */}
        <div className="border-t border-border/80 px-5 py-4 shrink-0 bg-background/95 backdrop-blur-xl">
          <button
            onClick={handleSave}
            disabled={isUploading}
            className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-black transition-all duration-300 bg-[#5BC0DE] hover:bg-[#45B8D8] hover:shadow-[0_8px_24px_rgba(91,192,222,0.3)] active:scale-[0.99] flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            {isUploading ? (
              <>
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>{labels.uploading}</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {editEvent ? labels.saveChanges : labels.saveEvent}
                </span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] sm:text-xs text-muted-foreground/60 mt-2 font-normal">
            {labels.subtext}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
