"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, ImagePlus, FileCheck, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle,
  DialogDescription,
} from "../ui/dialog";
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

async function uploadToStorage(file: File, userId: string, bucket: "event-images" | "event-pdfs"): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function EventFormModal({ open, onOpenChange, editEvent, prefillData, voiceData, prefillImageUrl }: EventFormModalProps) {
  const { addEvent, updateEvent, user, t, theme, language, events } = useApp();
  const { toast } = useToast();
  const [workSchedule, setWorkSchedule] = useState<{day_of_week:number;start_time:string;end_time:string}[]>([]);

  const [title, setTitle]       = useState("");
  const [date, setDate]         = useState("");
  const [time, setTime]         = useState("");
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes]       = useState("");

  const [imagePreview, setImagePreview]     = useState<string | null>(null);
  const [imageFile, setImageFile]           = useState<File | null>(null);
  const imageInputRef                       = useRef<HTMLInputElement>(null);
  const attachInputRef                      = useRef<HTMLInputElement>(null);

  const [pdfFile, setPdfFile]               = useState<File | null>(null);
  const [pdfName, setPdfName]               = useState<string | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const pdfInputRef                         = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading]     = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);
  const [conflictTitle, setConflictTitle] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate]     = useState(false);

  // ── Fill form ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setUploadError(null); setConflictTitle(null); setIsDuplicate(false);
    // Fetch user's work schedule for conflict checking
    // SECURITY: this client-side call requires Supabase Row Level Security (RLS)
    // to be configured. Do not rely on client filtering as a security boundary.
    if (user) {
      devLog('EventForm', 'Loading work schedule for conflict checks')
      supabase
        .from("work_schedules")
        .select("day_of_week,start_time,end_time")
        .eq("user_id", user.id)
        .then(({ data, error }) => {
          if (error) {
            devError('EventForm', 'Failed to load work schedule', error)
            toast({
              title: "Couldn't load work schedule",
              description: "Conflict checks may be incomplete. Please try again.",
              variant: "destructive",
            });
            return;
          }
          if (data) setWorkSchedule(data);
        });
    } else {
      devWarn('EventForm', 'work_schedules fetch skipped: no authenticated user')
    }
    if (editEvent) {
      setTitle(editEvent.title); setDate(editEvent.date); setTime(editEvent.time);
      setPhone(editEvent.phone || ""); setEmail(editEvent.email || ""); setLocation(editEvent.location || ""); setNotes(editEvent.notes || "");
      setImagePreview(editEvent.image_url || null); setImageFile(null);
      setExistingPdfUrl(editEvent.pdf_url || null); setPdfFile(null);
      setPdfName(editEvent.pdf_url ? decodeURIComponent(editEvent.pdf_url.split("/").pop() ?? "document.pdf") : null);
    } else if (prefillData) {
      setTitle(prefillData.title || ""); setDate(prefillData.date || ""); setTime(prefillData.time || "");
      setPhone(prefillData.phone || ""); setLocation(prefillData.location || ""); setNotes("");
      setImagePreview(prefillImageUrl || null); setImageFile(null); setPdfFile(null); setPdfName(null); setExistingPdfUrl(null);
    } else {
      setTitle(""); setDate(""); setTime(""); setPhone(""); setLocation(""); setNotes("");
      setImagePreview(null); setImageFile(null); setPdfFile(null); setPdfName(null); setExistingPdfUrl(null);
    }
  }, [open, editEvent, prefillData, prefillImageUrl]);

  useEffect(() => {
    if (voiceData) { setTitle(voiceData.title || ""); setDate(voiceData.date || ""); setTime(voiceData.time || ""); setLocation(voiceData.location || ""); setPhone(voiceData.phone || ""); }
  }, [voiceData]);

  // ── Task 3: Conflict / Duplicate check ─────────────────────────────────────
  const checkDuplicateAndConflict = useCallback((currentTitle: string, d: string, tm: string) => {
    if (!d || !tm) {
      setIsDuplicate(false);
      setConflictTitle(null);
      return;
    }
    
    const checkDt = new Date(`${d}T${tm}`);
    const checkMins = checkDt.getHours() * 60 + checkDt.getMinutes();
    const cleanCurrentTitle = currentTitle.trim().toLowerCase();

    let foundConflictName: string | null = null;
    let foundDuplicateName: string | null = null;

    // Check existing events
    for (const ev of events) {
      if (ev.id === editEvent?.id) continue;
      if (ev.date !== d || !ev.time) continue;

      const evDt = new Date(`${ev.date}T${ev.time}`);
      const timeDiffMinutes = Math.abs(checkDt.getTime() - evDt.getTime()) / 60000;

      // Duplicate Check: Same Date, Same Time (within 1 minute), Similar Title
      if (timeDiffMinutes < 1.0) {
        const cleanEvTitle = ev.title.trim().toLowerCase();
        if (
          cleanCurrentTitle &&
          (cleanCurrentTitle === cleanEvTitle ||
            cleanCurrentTitle.includes(cleanEvTitle) ||
            cleanEvTitle.includes(cleanCurrentTitle))
        ) {
          foundDuplicateName = ev.title;
          break; // Duplicate warning takes priority
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
    const ws = workSchedule.find(w => w.day_of_week === dow);
    if (ws) {
      const [sh, sm] = ws.start_time.split(":").map(Number);
      const [eh, em] = ws.end_time.split(":").map(Number);
      const wsStart = sh * 60 + sm;
      const wsEnd = eh * 60 + em < wsStart ? eh * 60 + em + 24 * 60 : eh * 60 + em;
      const checkAdjusted = checkMins < wsStart ? checkMins + 24 * 60 : checkMins;
      if (checkAdjusted >= wsStart && checkAdjusted < wsEnd) {
        const workHoursLabel = language === "ar"
          ? `ساعات العمل (${ws.start_time}–${ws.end_time})`
          : language === "fr"
          ? `Heures de travail (${ws.start_time}–${ws.end_time})`
          : `Work hours (${ws.start_time}–${ws.end_time})`;
        setConflictTitle(workHoursLabel);
        return;
      }
    }

    setConflictTitle(null);
  }, [events, editEvent, workSchedule, language]);

  // Run conflict & duplicate check reactive to title, date, time or schedule data changes
  useEffect(() => {
    checkDuplicateAndConflict(title, date, time);
  }, [title, date, time, checkDuplicateAndConflict]);

  const handleDateChange = (val: string) => { setDate(val); };
  const handleTimeChange = (val: string) => { setTime(val); };

  // ── File handlers ──────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type !== "application/pdf") { setUploadError("Only PDF files are accepted."); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("PDF must be under 10 MB."); return; }
    setPdfFile(file); setPdfName(file.name); setExistingPdfUrl(null); setUploadError(null);
  };

  // ── Combined attach handler (image OR pdf) ────────────────────────────────
  const handleAttachSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type.startsWith("image/")) {
      handleImageSelect(e);
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      handlePdfSelect(e);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim() || !date || !user) return;
    setIsUploading(true); setUploadError(null);
    try {
      let finalImageUrl: string | undefined = imageFile ? undefined : (imagePreview ?? undefined);
      if (imageFile) finalImageUrl = await uploadToStorage(imageFile, user.id, "event-images");
      let finalPdfUrl: string | undefined = pdfFile ? undefined : (existingPdfUrl ?? undefined);
      if (pdfFile) finalPdfUrl = await uploadToStorage(pdfFile, user.id, "event-pdfs");
      const payload = {
        title: title.trim(), date, time,
        phone: phone.trim() || undefined, email: email.trim() || undefined, location: location.trim() || undefined,
        notes: notes.trim(), image_url: finalImageUrl, pdf_url: finalPdfUrl,
        source: "manual", is_done: false,
      };
      if (editEvent) { await updateEvent(editEvent.id, payload); }
      else           { await addEvent(payload); }
      onOpenChange(false);
    } catch (err) {
      const message = getFriendlyErrorMessage(err, "Failed to save. Please try again.");
      setUploadError(message);
      toast({
        title: "Couldn't save event",
        description: message,
        variant: "destructive",
      });
    } finally { setIsUploading(false); }
  };

  const isValid = title.trim().length > 0 && date.length > 0;
  const hasPdf  = !!pdfName;

  const lbl = {
    uploading:   language === "ar" ? "جاري الرفع..." : language === "fr" ? "Envoi..." : "Uploading...",
    addPhoto:    language === "ar" ? "أضف صورة" : language === "fr" ? "Ajouter photo" : "Add Photo",
    changePhoto: language === "ar" ? "تغيير" : language === "fr" ? "Changer" : "Change",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-0 z-50 w-full h-full max-h-screen bg-background border-none flex flex-col p-0 gap-0 translate-x-0 translate-y-0 top-0 left-0 max-w-none rounded-none sm:max-w-[430px] sm:h-[90vh] sm:max-h-[850px] sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border sm:border-border sm:shadow-2xl overflow-hidden outline-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{editEvent ? t("editEvent") : t("addEvent")}</DialogTitle>
        <DialogDescription className="sr-only">{editEvent ? t("editEvent") : t("addEvent")}</DialogDescription>

        {/* ── STICKY HEADER ── */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-background/90 backdrop-blur-xl sticky top-0 z-50 shrink-0">
          <div className="text-xl font-bold tracking-tight">
            <span className="text-foreground">IQ</span>
            <span className="text-[#5BC0DE]">X</span>
            <span className="text-foreground">O</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all text-base select-none"
          >
            ✕
          </button>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="px-5 py-6 overflow-y-auto flex-1 flex flex-col gap-5 min-h-0 pb-10">

          {/* ── Form Header ── */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {editEvent 
                ? (language === "ar" ? "تعديل الحدث" : "Edit Event")
                : (language === "ar" ? "إضافة حدث جديد" : "Let's add this")
              }
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {editEvent
                ? (language === "ar" ? "قم بتعديل تفاصيل الحدث الخاص بك أدناه" : "Modify the details of your event below")
                : (language === "ar" ? "يرجى ملء تفاصيل حدثك الجديد أدناه" : "Fill in the details for your new event")
              }
            </p>
          </div>

          {/* ── Attachments — single button ─────────────────────────────── */}
          <div className="space-y-2">
            {/* Preview when photo attached */}
            {imagePreview && (
              <div className="relative rounded-[20px] overflow-hidden border border-border">
                <img src={imagePreview} alt="Event" className="w-full h-36 object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <button type="button" onClick={() => { setImagePreview(null); setImageFile(null); }}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
                {hasPdf && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/65 backdrop-blur-sm rounded-xl px-2 py-1 max-w-[140px]">
                    <FileCheck className="h-3 w-3 text-red-400 shrink-0" />
                    <span className="text-white text-[10px] truncate">{pdfName}</span>
                    <button type="button" onClick={() => { setPdfFile(null); setPdfName(null); setExistingPdfUrl(null); }} className="text-white/60 hover:text-white"><X className="h-2.5 w-2.5" /></button>
                  </div>
                )}
              </div>
            )}
            {/* Small attachment icon button */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => attachInputRef.current?.click()}
                  className={`relative h-11 w-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                    imagePreview || hasPdf
                      ? "bg-primary/15 border border-primary/30 text-primary"
                      : "bg-secondary/50 border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5"
                  }`}>
                  <ImagePlus className="h-5 w-5" />
                  {(imagePreview || hasPdf) && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                    </span>
                  )}
                </button>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {language === "ar" ? "مرفق" : language === "fr" ? "Joindre" : "Attachment"}
                </span>
              </div>
              {/* Show attached file name if any */}
              {(imagePreview || hasPdf) && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/30 border border-border min-w-0">
                  <span className="text-xs text-foreground truncate flex-1">
                    {imagePreview && hasPdf ? (language === "ar" ? "صورة + PDF" : "Photo + PDF")
                      : imagePreview ? (language === "ar" ? "صورة مرفقة" : language === "fr" ? "Photo jointe" : "Photo attached")
                      : pdfName || "PDF"}
                  </span>
                  <button type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null); setPdfFile(null); setPdfName(null); setExistingPdfUrl(null); }}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            {/* Single hidden input — both image and PDF */}
            <input ref={attachInputRef} type="file" accept="image/*,application/pdf,.pdf" onChange={handleAttachSelect} className="hidden" />
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfSelect} className="hidden" />
          </div>

          {/* ── Title ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("eventTitle")}</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t("eventTitlePlaceholder")}
              className="w-full px-4 py-3.5 rounded-[20px] border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-[#5BC0DE] focus:ring-4 focus:ring-[#5BC0DE]/15" />
          </div>

          {/* ── Date + Time ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col min-w-0">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("eventDate")}</label>
              <div className="w-full rounded-[20px] border border-border bg-secondary/40 transition-all duration-300 focus-within:border-[#5BC0DE] focus-within:ring-4 focus-within:ring-[#5BC0DE]/15 overflow-hidden flex items-center">
                <input type="date" value={date} onChange={e => handleDateChange(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none px-3 sm:px-4 py-3.5 text-sm sm:text-base text-foreground min-w-0 ${theme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"}`} />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("eventTime")}</label>
              <div className="w-full rounded-[20px] border border-border bg-secondary/40 transition-all duration-300 focus-within:border-[#5BC0DE] focus-within:ring-4 focus-within:ring-[#5BC0DE]/15 overflow-hidden flex items-center">
                <input type="time" value={time} onChange={e => handleTimeChange(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none px-3 sm:px-4 py-3.5 text-sm sm:text-base text-foreground min-w-0 ${theme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"}`} />
              </div>
            </div>
          </div>

          {/* ── TASK 3: Conflict / Duplicate warning ───────────────────────── */}
          {isDuplicate && conflictTitle && (
            <div className="flex items-start gap-2 p-3 rounded-[20px] bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400 leading-relaxed">
                {language === "ar"
                  ? "قد يكون هذا الحدث موجوداً بالفعل في جدولك باسم: "
                  : language === "fr"
                  ? "Cet événement existe peut-être déjà dans votre calendrier : "
                  : "This event may already exist in your schedule: "}
                <span className="font-semibold">{conflictTitle}</span>
              </p>
            </div>
          )}

          {!isDuplicate && conflictTitle && (
            <div className="flex items-start gap-2 p-3 rounded-[20px] bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400 leading-relaxed">
                {language === "ar"
                  ? "لديك حدث بالفعل مجدول في هذا الوقت: "
                  : language === "fr"
                  ? "Vous avez déjà un événement programmé à cette heure : "
                  : "You already have an event scheduled at this time: "}
                <span className="font-semibold">{conflictTitle}</span>
              </p>
            </div>
          )}

          {/* ── Phone + Email ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("eventPhone")}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder={t("eventPhonePlaceholder")}
                className="w-full px-4 py-3.5 rounded-[20px] border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-[#5BC0DE] focus:ring-4 focus:ring-[#5BC0DE]/15" />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                {language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "E-mail" : "Email"}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@..."
                className="w-full px-4 py-3.5 rounded-[20px] border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-[#5BC0DE] focus:ring-4 focus:ring-[#5BC0DE]/15" />
            </div>
          </div>

          {/* ── Location ──────────────────────────────────────────────────── */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("eventLocation")}</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder={t("eventLocationPlaceholder")}
              className="w-full px-4 py-3.5 rounded-[20px] border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-[#5BC0DE] focus:ring-4 focus:ring-[#5BC0DE]/15" />
          </div>

          {/* ── Notes ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("eventNotes")}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={t("eventNotesPlaceholder")} rows={3}
              className="w-full px-4 py-3.5 rounded-[20px] border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-[#5BC0DE] focus:ring-4 focus:ring-[#5BC0DE]/15 resize-none" />
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {uploadError && (
            <div className="flex items-center gap-2 p-3 rounded-[20px] bg-destructive/10 border border-destructive/20">
              <X className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{uploadError}</p>
            </div>
          )}
        </div>

        {/* ── STICKY FOOTER SAVE BUTTON ── */}
        <div className="border-t border-border px-5 py-4 shrink-0 bg-background">
          <button
            onClick={handleSave}
            disabled={!isValid || isUploading}
            className="w-full py-4 rounded-[20px] font-semibold text-black transition-all duration-300 bg-[#5BC0DE] hover:bg-[#45B8D8] hover:shadow-[0_8px_24px_rgba(91,192,222,0.25)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isUploading ? lbl.uploading : (language === "ar" ? "حفظ الحدث" : "Save Event")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
