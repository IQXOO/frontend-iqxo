"use client"

import { useState, useEffect } from "react"
import {
  X,
  ArrowLeft,
  Check,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Edit2,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog"
import { useApp } from "../../lib/store"
import type { ParsedEvent } from "../../lib/parse-voice-input"
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover"

const COLOR_PALETTE = [
  "#00C2FF", // Cyan / Sky
  "#007AFF", // Blue
  "#FF3B30", // Red
  "#34C759", // Green
  "#FF9500", // Orange
  "#AF52DE", // Purple
  "#FF2D55", // Pink
  "#EAB308", // Yellow
  "#5856D6", // Indigo
  "#14B8A6", // Teal
]

interface EventConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extractedData: ParsedEvent[] | null
  source: "voice" | "photo"
  imageUrls?: string[]
}

interface EditableEvent extends ParsedEvent {
  _id: string
  selected: boolean
  email?: string
}

export function EventConfirmationModal({
  open,
  onOpenChange,
  extractedData,
  source,
  imageUrls,
}: EventConfirmationModalProps) {
  const { addEvent, language, theme } = useApp()

  const [events, setEvents] = useState<EditableEvent[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (extractedData && open) {
      setEvents(
        extractedData.map((ev) => ({
          ...ev,
          title: ev.title || "",
          date: ev.date || "",
          time: ev.time || "",
          start_time: ev.start_time || "",
          end_time: ev.end_time || "",
          location:
            ev.location && !/^(https?:\/\/|www\.|zoom\.us|meet\.google\.com)/i.test(ev.location)
              ? ev.location
              : !ev.link && ev.location
              ? ""
              : ev.location || "",
          link:
            ev.link || (/^(https?:\/\/|www\.|zoom\.us|meet\.google\.com)/i.test(ev.location || "") ? ev.location : ""),
          phone: ev.phone || "",
          email: (ev as any).email || "",
          notes: ev.notes || "",
          color: ev.color || "#00C2FF",
          recurrence_rule: ev.recurrence_rule || "",
          reminders: ev.reminders || [],
          _id: Math.random().toString(36).substring(7),
          selected: true,
        }))
      )
      setEditingId(null)
    }
  }, [extractedData, open])

  const getSuccessMessage = () => {
    const messages =
      language === "fr"
        ? ["C'est noté.", "Une chose de moins à penser.", "Tu gères.", "Tout est organisé."]
        : language === "ar"
        ? ["تم الحفظ.", "شيء أقل للتفكير فيه.", "أنت مسيطر.", "تمت إضافته للتقويم."]
        : ["All set.", "One less thing to think about.", "You're on top of it.", "It's in your calendar."]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const updateEventField = <K extends keyof EditableEvent>(id: string, field: K, value: EditableEvent[K]) => {
    setEvents((prev) => prev.map((ev) => (ev._id === id ? { ...ev, [field]: value } : ev)))
  }

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((ev) => ev._id !== id))
    if (editingId === id) setEditingId(null)
  }

  const isEventPast = (eventDate?: string, eventTime?: string) => {
    if (!eventDate) return false
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`
    if (eventDate < todayStr) return true
    if (eventDate === todayStr && eventTime) {
      const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      return eventTime < nowTimeStr
    }
    return false
  }

  const handleConfirm = async () => {
    const validEvents = events.filter((ev) => ev.selected && ev.title?.trim() && ev.date)

    if (validEvents.length === 0) {
      setToast({
        type: "error",
        message:
          language === "fr"
            ? "Il me faut un titre et une date"
            : language === "ar"
            ? "أحتاج إلى عنوان وتاريخ لحدث واحد على الأقل"
            : "I need a title and date for at least one event",
      })
      return
    }

    setIsSaving(true)

    try {
      const primaryImageUrl = imageUrls?.[0]

      await Promise.all(
        validEvents.map((ev) =>
          addEvent({
            title: ev.title?.trim() || "Event",
            date: ev.date || "",
            time: ev.time || "",
            start_time: ev.start_time || undefined,
            end_time: ev.end_time || undefined,
            location: ev.location?.trim() || undefined,
            link: ev.link?.trim() || undefined,
            phone: ev.phone || undefined,
            notes: [ev.notes || "", ev.email ? `Email: ${ev.email}` : ""].filter(Boolean).join("\n"),
            color: ev.color || undefined,
            recurrence_rule: ev.recurrence_rule || undefined,
            reminders: ev.reminders && ev.reminders.length > 0 ? ev.reminders : undefined,
            image_url: primaryImageUrl || undefined,
            source: source === "photo" ? "upload" : "voice",
            is_done: false,
          })
        )
      )

      const hasPastEvents = validEvents.some((ev) => isEventPast(ev.date, ev.start_time || ev.time))
      const successMsg = hasPastEvents
        ? language === "ar"
          ? "تم حفظ الأحداث بنجاح (الأحداث السابقة نُقلت للأرشيف)"
          : language === "fr"
          ? "Événements enregistrés (les événements passés sont archivés)"
          : "Events saved successfully (past events stored in Archive)"
        : getSuccessMessage()

      setToast({ type: "success", message: successMsg })

      setTimeout(() => {
        setToast(null)
        onOpenChange(false)
        setEvents([])
        setEditingId(null)
      }, 800)
    } catch (err) {
      console.error("Failed to save event:", err)
      setToast({
        type: "error",
        message:
          language === "ar"
            ? "فشل حفظ الأحداث. يرجى المحاولة مرة أخرى."
            : language === "fr"
            ? "Échec de l'enregistrement des événements. Veuillez réessayer."
            : "Failed to save events. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setToast(null)
    setEditingId(null)
  }

  const selectedCount = events.filter((e) => e.selected).length

  const labels = {
    titleAndColor: language === "ar" ? "العنوان واللون" : language === "fr" ? "Titre & Couleur" : "TITLE & COLOR",
    eventTitlePlaceholder: language === "ar" ? "عنوان الحدث" : language === "fr" ? "Titre de l'événement" : "Event Title",
    dateAndTime: language === "ar" ? "التاريخ والوقت" : language === "fr" ? "Date & Heure" : "DATE & TIME",
    dateLabel: language === "ar" ? "التاريخ" : language === "fr" ? "Date" : "DATE",
    startLabel: language === "ar" ? "البدء" : language === "fr" ? "Début" : "START",
    endLabel: language === "ar" ? "الانتهاء" : language === "fr" ? "Fin" : "END",
    location: language === "ar" ? "الموقع (العنوان الفعلي)" : language === "fr" ? "Lieu (adresse physique)" : "LOCATION (PHYSICAL VENUE)",
    locationPlaceholder: language === "ar" ? "اسم القاعة، العنوان، المدينة..." : language === "fr" ? "Nom de la salle, adresse, ville..." : "Venue name, street address, city...",
    meetingLink: language === "ar" ? "رابط الاجتماع / الويب" : language === "fr" ? "Lien de réunion / Web" : "MEETING / WEB LINK",
    linkPlaceholder: language === "ar" ? "https://zoom.us/..., Google Meet, Teams, w..." : language === "fr" ? "https://zoom.us/..., Google Meet, Teams, w..." : "https://zoom.us/..., Google Meet, Teams, w...",
    schedule: language === "ar" ? "الجدول" : language === "fr" ? "Planning" : "SCHEDULE",
    repeatNever: language === "ar" ? "بدون تكرار" : language === "fr" ? "Répétition : Jamais" : "Repeat: Never",
    repeatDaily: language === "ar" ? "يومياً" : language === "fr" ? "Répétition : Tous les jours" : "Repeat: Daily",
    repeatWeekly: language === "ar" ? "أسبوعياً" : language === "fr" ? "Répétition : Toutes les semaines" : "Repeat: Weekly",
    repeatMonthly: language === "ar" ? "شهرياً" : language === "fr" ? "Répétition : Tous les mois" : "Repeat: Monthly",
    reminderNone: language === "ar" ? "بدون تذكير" : language === "fr" ? "Rappel : Aucun" : "Reminder: None",
    reminderAtTime: language === "ar" ? "في وقت الحدث" : language === "fr" ? "Rappel : À l'heure" : "Reminder: At time",
    reminder10m: language === "ar" ? "قبل 10 دقائق" : language === "fr" ? "Rappel : 10 min avant" : "Reminder: 10m before",
    reminder15m: language === "ar" ? "قبل 15 دقيقة" : language === "fr" ? "Rappel : 15 min avant" : "Reminder: 15m before",
    reminder30m: language === "ar" ? "قبل 30 دقيقة" : language === "fr" ? "Rappel : 30 min avant" : "Reminder: 30m before",
    reminder1h: language === "ar" ? "قبل ساعة" : language === "fr" ? "Rappel : 1 h avant" : "Reminder: 1h before",
    reminder1d: language === "ar" ? "قبل يوم" : language === "fr" ? "Rappel : 1 jour avant" : "Reminder: 1d before",
    contactInfo: language === "ar" ? "معلومات الاتصال (اختياري)" : language === "fr" ? "Contact (optionnel)" : "CONTACT INFO (OPTIONAL)",
    phonePlaceholder: language === "ar" ? "الهاتف" : language === "fr" ? "Téléphone" : "Phone",
    emailPlaceholder: language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "E-mail" : "Email",
    notes: language === "ar" ? "ملاحظات" : language === "fr" ? "Notes" : "NOTES",
    notesPlaceholder: language === "ar" ? "أضف ملاحظة..." : language === "fr" ? "Ajouter une note..." : "Add a note...",
    save: language === "ar" ? "حفظ" : language === "fr" ? "Enregistrer" : "Save",
    saveChanges: language === "ar" ? "حفظ التعديلات" : language === "fr" ? "Enregistrer les modifications" : "Save Changes",
    confirmAll:
      language === "ar"
        ? `حفظ (${selectedCount})`
        : language === "fr"
        ? `Enregistrer (${selectedCount})`
        : `Save (${selectedCount})`,
    headerPhoto: language === "ar" ? "مراجعة الأحداث" : language === "fr" ? "Événements" : "Review Events",
    editEvent: language === "ar" ? "تعديل الحدث" : language === "fr" ? "Modifier l'événement" : "Edit Event",
    empty: language === "ar" ? "لا توجد أحداث" : language === "fr" ? "Aucun événement" : "No events",
    newEvent: language === "ar" ? "حدث جديد" : language === "fr" ? "Nouvel événement" : "New Event",
    done: language === "ar" ? "تم" : language === "fr" ? "Terminé" : "Done",
    subtext:
      language === "ar"
        ? "يمكنك تعديل التفاصيل لاحقاً من تقويمك."
        : language === "fr"
        ? "Vous pourrez modifier les détails plus tard depuis votre calendrier."
        : "You can edit the details later from your calendar.",
  }

  const editingEvent = events.find((ev) => ev._id === editingId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:w-full max-w-[430px] h-auto max-h-[90dvh] sm:max-h-[850px] rounded-[24px] sm:rounded-[28px] border border-border bg-background shadow-2xl flex flex-col p-0 gap-0 overflow-hidden outline-none duration-150"
        style={{ transform: "translate(-50%, -50%)" }}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {editingEvent ? labels.editEvent : labels.headerPhoto}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {editingEvent ? labels.editEvent : labels.headerPhoto}
        </DialogDescription>

        {/* Floating Toast inside modal */}
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xl animate-in fade-in duration-200 ${
              toast.type === "success" ? "bg-green-500 text-white" : "bg-destructive text-destructive-foreground"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* ── STICKY TOP HEADER (Identical to Manual Event Modal) ── */}
        <div className="flex justify-between items-center px-4 py-3.5 border-b border-border/80 bg-background/95 backdrop-blur-xl sticky top-0 z-50 shrink-0">
          {editingEvent ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="p-2 -ml-1 rounded-xl text-foreground hover:bg-secondary/60 active:scale-95 transition-all cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                  {labels.editEvent}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-4 py-1.5 rounded-xl bg-[#5BC0DE]/15 hover:bg-[#5BC0DE]/25 border border-[#5BC0DE]/30 text-[#5BC0DE] font-semibold text-xs sm:text-sm transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                {labels.save}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  {labels.headerPhoto}
                </h1>
                <span className="bg-[#5BC0DE]/20 text-[#5BC0DE] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {events.length}
                </span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 -mr-1 rounded-xl text-foreground hover:bg-secondary/60 active:scale-95 transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* ── SCROLLABLE BODY (Zero-wobble, overflow-x-hidden, identical layout to manual modal) ── */}
        <div className="px-5 py-5 overflow-y-auto overflow-x-hidden flex-1 flex flex-col gap-4 min-h-0 pb-6 overscroll-contain w-full max-w-full">
          {editingEvent ? (
            /* ================= EDIT VIEW (100% IDENTICAL TO MANUAL EVENT FORM) ================= */
            <div className="flex flex-col gap-4 w-full min-w-0">
              {/* 1. TITLE & COLOR */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.titleAndColor}
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={editingEvent.title || ""}
                    onChange={(e) => updateEventField(editingEvent._id, "title", e.target.value)}
                    placeholder={labels.eventTitlePlaceholder}
                    className="flex-1 px-4 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-[16px] font-medium"
                  />

                  {/* Color Swatch & Popover */}
                  <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-12 h-12 rounded-2xl shrink-0 cursor-pointer transition-transform active:scale-95 shadow-md flex items-center justify-center border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#5BC0DE]"
                        style={{ backgroundColor: editingEvent.color || "#00C2FF" }}
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
                              updateEventField(editingEvent._id, "color", c)
                              setIsColorPickerOpen(false)
                            }}
                            className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                              (editingEvent.color || "#00C2FF") === c
                                ? "scale-110 ring-2 ring-offset-2 ring-offset-background shadow-md"
                                : "hover:scale-105 opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: c }}
                            aria-label={`Color ${c}`}
                          >
                            {(editingEvent.color || "#00C2FF") === c && (
                              <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* 2. DATE & TIME (Unified 3-column bar, exact match) */}
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
                      value={editingEvent.date || ""}
                      onChange={(e) => updateEventField(editingEvent._id, "date", e.target.value)}
                      className={`w-full bg-transparent border-none outline-none text-[16px] sm:text-sm font-semibold text-foreground cursor-pointer min-w-0 p-0 ${
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
                      value={editingEvent.start_time || editingEvent.time || ""}
                      onChange={(e) => {
                        updateEventField(editingEvent._id, "start_time", e.target.value)
                        updateEventField(editingEvent._id, "time", e.target.value)
                      }}
                      className={`w-full bg-transparent border-none outline-none text-[16px] sm:text-sm font-semibold text-foreground cursor-pointer min-w-0 p-0 ${
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
                      value={editingEvent.end_time || ""}
                      onChange={(e) => updateEventField(editingEvent._id, "end_time", e.target.value)}
                      className={`w-full bg-transparent border-none outline-none text-[16px] sm:text-sm font-semibold text-foreground cursor-pointer min-w-0 p-0 ${
                        theme === "dark" ? "[color-scheme:dark]" : "[color-scheme:light]"
                      }`}
                    />
                  </div>
                </div>

                {/* Past Date Warning Banner */}
                {isEventPast(editingEvent.date, editingEvent.start_time || editingEvent.time) && (
                  <div className="mt-2.5 flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div className="leading-relaxed font-medium">
                      <span className="font-bold block">
                        {language === "ar"
                          ? "تنبيه: هذا الموعد في الماضي وقد مضى بالفعل"
                          : language === "fr"
                          ? "Attention : Cette date est déjà passée"
                          : "Notice: This date has already passed"}
                      </span>
                      <span className="text-[11px] opacity-80 mt-0.5 block">
                        {language === "ar"
                          ? "يمكنك حفظه بشكل طبيعي؛ سيتم إدراجه في الأرشيف تلقائياً."
                          : language === "fr"
                          ? "Vous pouvez l'enregistrer normalement ; il sera archivé automatiquement."
                          : "You can save it normally; it will be stored in your Archive automatically."}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. LOCATION (Physical Venue) */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.location}
                </label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-[#5BC0DE] absolute left-4 rtl:left-auto rtl:right-4 pointer-events-none" />
                  <input
                    type="text"
                    value={editingEvent.location || ""}
                    onChange={(e) => updateEventField(editingEvent._id, "location", e.target.value)}
                    placeholder={labels.locationPlaceholder}
                    className="w-full pl-11 pr-4 rtl:pl-4 rtl:pr-11 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-[16px] font-medium"
                  />
                </div>
              </div>

              {/* 4. MEETING / WEB LINK */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.meetingLink}
                </label>
                <div className="relative flex items-center">
                  <LinkIcon className="w-4 h-4 text-[#5BC0DE] absolute left-4 rtl:left-auto rtl:right-4 pointer-events-none" />
                  <input
                    type="text"
                    value={editingEvent.link || ""}
                    onChange={(e) => updateEventField(editingEvent._id, "link", e.target.value)}
                    placeholder={labels.linkPlaceholder}
                    className={`w-full pl-11 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-[16px] font-medium ${
                      editingEvent.link ? "pr-11 rtl:pr-4 rtl:pl-11" : "pr-4 rtl:pl-4 rtl:pr-11"
                    }`}
                  />
                  {editingEvent.link && (
                    <button
                      type="button"
                      onClick={() => {
                        const fullUrl = /^https?:\/\//i.test(editingEvent.link!)
                          ? editingEvent.link!
                          : `https://${editingEvent.link!}`
                        window.open(fullUrl, "_blank", "noopener,noreferrer")
                      }}
                      className="absolute right-3 rtl:right-auto rtl:left-3 p-1.5 rounded-xl text-[#5BC0DE] hover:bg-[#5BC0DE]/15 active:scale-95 transition-all"
                      title="Open Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* 5. SCHEDULE (Repeat + Reminder) */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.schedule}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Repeat */}
                  <div className="relative flex items-center">
                    <select
                      value={editingEvent.recurrence_rule || ""}
                      onChange={(e) => updateEventField(editingEvent._id, "recurrence_rule", e.target.value)}
                      className="w-full appearance-none px-3.5 sm:px-4 py-3.5 pr-9 rtl:pr-3.5 rtl:pl-9 rounded-2xl border border-border/80 bg-secondary/40 text-foreground text-[16px] sm:text-sm font-medium outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 cursor-pointer truncate"
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
                      value={
                        editingEvent.reminders && editingEvent.reminders.length > 0
                          ? String(editingEvent.reminders[0].minutes_before)
                          : ""
                      }
                      onChange={(e) =>
                        updateEventField(
                          editingEvent._id,
                          "reminders",
                          e.target.value ? [{ minutes_before: parseInt(e.target.value, 10) }] : []
                        )
                      }
                      className="w-full appearance-none px-3.5 sm:px-4 py-3.5 pr-9 rtl:pr-3.5 rtl:pl-9 rounded-2xl border border-border/80 bg-secondary/40 text-foreground text-[16px] sm:text-sm font-medium outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 cursor-pointer truncate"
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

              {/* 6. CONTACT INFO (Phone + Email in 2-column grid) */}
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
                      value={editingEvent.phone || ""}
                      onChange={(e) => updateEventField(editingEvent._id, "phone", e.target.value)}
                      placeholder={labels.phonePlaceholder}
                      className="w-full pl-10 pr-3.5 rtl:pl-3.5 rtl:pr-10 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-[16px] sm:text-sm font-medium"
                    />
                  </div>

                  {/* Email */}
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={editingEvent.email || ""}
                      onChange={(e) => updateEventField(editingEvent._id, "email", e.target.value)}
                      placeholder={labels.emailPlaceholder}
                      className="w-full pl-10 pr-3.5 rtl:pl-3.5 rtl:pr-10 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-[16px] sm:text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 7. NOTES */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.notes}
                </label>
                <textarea
                  value={editingEvent.notes || ""}
                  onChange={(e) => updateEventField(editingEvent._id, "notes", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-[16px] font-medium resize-none leading-relaxed"
                  placeholder={labels.notesPlaceholder}
                />
              </div>
            </div>
          ) : (
            /* ================= LIST VIEW ================= */
            <div className="space-y-3 w-full min-w-0">
              {events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">{labels.empty}</div>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev._id}
                    className={`relative rounded-[22px] p-4 transition-all duration-200 border ${
                      ev.selected
                        ? "bg-secondary/20 border-border/70 hover:border-border"
                        : "bg-background/50 border-border/30 opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={ev.selected}
                          onChange={(e) => updateEventField(ev._id, "selected", e.target.checked)}
                          className="w-5 h-5 rounded border-border text-[#5BC0DE] focus:ring-[#5BC0DE] bg-background cursor-pointer accent-[#5BC0DE]"
                        />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4
                          className={`text-base font-semibold truncate ${
                            !ev.selected ? "text-muted-foreground line-through" : "text-foreground"
                          }`}
                        >
                          {ev.title || labels.newEvent}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {ev.date || "---"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {ev.start_time || ev.time || "---"}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1.5 max-w-[140px] truncate" title={ev.location}>
                              <MapPin className="h-3.5 w-3.5 opacity-70 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </span>
                          )}
                          {ev.link && (
                            <span
                              className="flex items-center gap-1.5 max-w-[140px] truncate text-[#5BC0DE]"
                              title={ev.link}
                            >
                              <LinkIcon className="h-3.5 w-3.5 opacity-70 shrink-0" />
                              <span className="truncate">{ev.link}</span>
                            </span>
                          )}
                          {isEventPast(ev.date, ev.start_time || ev.time) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                              <AlertCircle className="w-3 h-3" />
                              {language === "ar" ? "تاريخ قديم" : language === "fr" ? "Date passée" : "Past date"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingId(ev._id)}
                          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          aria-label="Edit event"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {events.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEvent(ev._id)}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── STICKY FOOTER (Exact match to Manual Create/Edit Event Modal) ── */}
        <div className="border-t border-border/80 px-5 pt-3.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shrink-0 bg-background/95 backdrop-blur-xl">
          {editingEvent ? (
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-black transition-all duration-300 bg-[#5BC0DE] hover:bg-[#45B8D8] hover:shadow-[0_8px_24px_rgba(91,192,222,0.3)] active:scale-[0.99] flex items-center justify-center gap-2 text-sm sm:text-base shadow-md cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{labels.saveChanges}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isSaving}
              className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-black transition-all duration-300 bg-[#5BC0DE] hover:bg-[#45B8D8] hover:shadow-[0_8px_24px_rgba(91,192,222,0.3)] active:scale-[0.99] flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
            >
              {isSaving ? (
                <span className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>{labels.confirmAll}</span>
                </>
              )}
            </button>
          )}
          <p className="text-center text-[11px] sm:text-xs text-muted-foreground/60 mt-2 font-normal">
            {labels.subtext}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
