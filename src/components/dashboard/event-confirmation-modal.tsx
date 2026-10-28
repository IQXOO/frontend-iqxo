"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Trash2, Calendar, Clock, Edit2, ChevronLeft, MapPin, Phone, Link as LinkIcon, ExternalLink } from "lucide-react"
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
}

export function EventConfirmationModal({
  open,
  onOpenChange,
  extractedData,
  source,
  imageUrls,
}: EventConfirmationModalProps) {
  const { addEvent, language } = useApp()
  
  const [events, setEvents] = useState<EditableEvent[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
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
          location: ev.location || "",
          phone: ev.phone || "",
          notes: ev.notes || "",
          color: ev.color || "",
          recurrence_rule: ev.recurrence_rule || "",
          reminders: ev.reminders || [],
          _id: Math.random().toString(36).substring(7),
          selected: true
        }))
      )
      setEditingId(null)
    }
  }, [extractedData, open])

  const getSuccessMessage = () => {
    const messages = language === "fr" 
      ? ["C'est noté.", "Une chose de moins à penser.", "Tu gères.", "Tout est organisé."]
      : language === "ar"
      ? ["تم الحفظ.", "شيء أقل للتفكير فيه.", "أنت مسيطر.", "تمت إضافته للتقويم."]
      : ["All set.", "One less thing to think about.", "You're on top of it.", "It's in your calendar."]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const updateEventField = <K extends keyof EditableEvent>(id: string, field: K, value: EditableEvent[K]) => {
    setEvents(prev => prev.map(ev => ev._id === id ? { ...ev, [field]: value } : ev))
  }

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(ev => ev._id !== id))
    if (editingId === id) setEditingId(null)
  }

  const isEventPast = (eventDate?: string, eventTime?: string) => {
    if (!eventDate) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (eventDate < todayStr) return true;
    if (eventDate === todayStr && eventTime) {
      const nowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      return eventTime < nowTimeStr;
    }
    return false;
  };

  const handleConfirm = async () => {
    const validEvents = events.filter(ev => ev.selected && ev.title?.trim() && ev.date)

    if (validEvents.length === 0) {
      setToast({ type: "error", message: language === "fr" ? "Il me faut un titre et une date" : language === "ar" ? "أحتاج إلى عنوان وتاريخ لحدث واحد على الأقل" : "I need a title and date for at least one event" })
      return
    }

    setIsSaving(true)

    try {
      const primaryImageUrl = imageUrls?.[0]

      await Promise.all(
        validEvents.map(ev => addEvent({
          title: ev.title?.trim() || "Event",
          date: ev.date || "",
          time: ev.time || "",
          start_time: ev.start_time || undefined,
          end_time: ev.end_time || undefined,
          location: ev.location || undefined,
          phone: ev.phone || undefined,
          notes: ev.notes || "",
          color: ev.color || undefined,
          recurrence_rule: ev.recurrence_rule || undefined,
          reminders: ev.reminders && ev.reminders.length > 0 ? ev.reminders : undefined,
          image_url: primaryImageUrl || undefined,
          source: source === "photo" ? "upload" : "voice",
          is_done: false,
        }))
      )

      const hasAnyPastEvent = validEvents.some(ev => isEventPast(ev.date, ev.start_time || ev.time))
      const successMsg = hasAnyPastEvent
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
      setToast({ type: "error", message: language === "ar" ? "فشل حفظ الأحداث. يرجى المحاولة مرة أخرى." : "Failed to save events. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setToast(null)
    setEditingId(null)
  }

  const selectedCount = events.filter(e => e.selected).length

  if (!open) return null

  const labels = {
    title: language === "ar" ? "العنوان" : language === "fr" ? "Titre" : "TITLE",
    date: language === "ar" ? "متى" : language === "fr" ? "Quand" : "WHEN",
    startTime: language === "ar" ? "وقت البدء" : language === "fr" ? "Heure de début" : "START TIME",
    endTime: language === "ar" ? "وقت الانتهاء" : language === "fr" ? "Heure de fin" : "END TIME",
    location: language === "ar" ? "الموقع" : language === "fr" ? "Lieu" : "LOCATION",
    phone: language === "ar" ? "الهاتف" : language === "fr" ? "Téléphone" : "PHONE",
    notes: language === "ar" ? "ملاحظات" : language === "fr" ? "Notes" : "NOTES",
    color: language === "ar" ? "اللون" : language === "fr" ? "Couleur" : "COLOR",
    recurrence: language === "ar" ? "التكرار" : language === "fr" ? "Répétition" : "REPEAT",
    reminder: language === "ar" ? "تذكير" : language === "fr" ? "Rappel" : "REMINDER",
    confirmAll: language === "ar" ? `حفظ (${selectedCount})` : language === "fr" ? `Enregistrer (${selectedCount})` : `Save (${selectedCount})`,
    headerPhoto: language === "ar" ? "مراجعة الأحداث" : language === "fr" ? "Événements" : "Review Events",
    editEvent: language === "ar" ? "تعديل الحدث" : language === "fr" ? "Modifier l'événement" : "Edit Event",
    saving: language === "ar" ? "جاري الحفظ..." : language === "fr" ? "Un instant..." : "Saving...",
    empty: language === "ar" ? "لا توجد أحداث" : language === "fr" ? "Aucun événement" : "No events",
    newEvent: language === "ar" ? "حدث جديد" : language === "fr" ? "Nouvel événement" : "New Event",
    done: language === "ar" ? "تم" : language === "fr" ? "Terminé" : "Done"
  }

  const editingEvent = events.find(ev => ev._id === editingId)

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-in slide-in-from-top duration-300 ${
          toast.type === "success" 
            ? "bg-green-500 text-white" 
            : "bg-destructive text-destructive-foreground"
        }`}>
          {toast.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
      
      <div className="w-full max-w-md bg-background border border-border/30 rounded-[30px] p-5 shadow-2xl flex flex-col h-[85vh] sm:h-[700px] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0 px-1">
          {editingEvent ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="h-9 w-9 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                </button>
                <h3 className="text-lg font-bold text-foreground tracking-tight truncate">
                  {labels.editEvent}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-4 py-1.5 rounded-xl bg-[#5BC0DE]/15 hover:bg-[#5BC0DE]/25 border border-[#5BC0DE]/30 text-[#5BC0DE] font-semibold text-xs sm:text-sm transition-all active:scale-95 shadow-sm"
              >
                {labels.done}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  {labels.headerPhoto}
                </h3>
                <span className="bg-[#5BC0DE]/20 text-[#5BC0DE] text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {events.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="h-9 w-9 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Main Scrollable Area */}
        <div className="overflow-y-auto pr-1 -mr-1 flex-1 pb-4">
          
          {editingEvent ? (
            /* ================= EDIT VIEW ================= */
            <div className="space-y-4 px-1 pb-6 animate-in slide-in-from-right-4 duration-300">
              
              {/* Title & Color */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.title}
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    value={editingEvent.title || ""}
                    onChange={(e) => updateEventField(editingEvent._id, "title", e.target.value)}
                    className="flex-1 px-4 py-3.5 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-[16px] font-medium"
                    placeholder="e.g. Weekly Team Meeting"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-12 h-12 rounded-2xl border border-border/80 shrink-0 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                        style={{ backgroundColor: editingEvent.color || "#00C2FF" }}
                        aria-label="Color"
                      >
                        <div className="w-4 h-4 rounded-full bg-white/30 backdrop-blur-sm border border-white/40" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="p-3 w-auto bg-card border border-border/80 shadow-2xl rounded-2xl">
                      <div className="grid grid-cols-5 gap-2">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateEventField(editingEvent._id, "color", c)}
                            className="w-7 h-7 rounded-xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer"
                            style={{ backgroundColor: c }}
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

              {/* Date & Time (Unified Card) */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {language === "ar" ? "التاريخ والوقت" : "DATE & TIME"}
                </label>
                <div className="rounded-2xl border border-border/80 bg-secondary/30 p-3 flex flex-col gap-2.5">
                  {/* Date Row */}
                  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase">
                      <Calendar className="w-4 h-4 text-[#5BC0DE]" />
                      <span>{labels.date}</span>
                    </div>
                    <input
                      type="date"
                      value={editingEvent.date || ""}
                      onChange={(e) => updateEventField(editingEvent._id, "date", e.target.value)}
                      className="bg-transparent border-none outline-none text-sm sm:text-base text-foreground font-medium text-right cursor-pointer [color-scheme:dark]"
                    />
                  </div>

                  {/* Times Row (Start & End) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-background/50 border border-border/50">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{labels.startTime}</span>
                      </div>
                      <input
                        type="time"
                        value={editingEvent.start_time || editingEvent.time || ""}
                        onChange={(e) => {
                          updateEventField(editingEvent._id, "start_time", e.target.value);
                          updateEventField(editingEvent._id, "time", e.target.value);
                        }}
                        className="bg-transparent border-none outline-none text-sm text-foreground font-medium text-right cursor-pointer [color-scheme:dark]"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-background/50 border border-border/50">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{labels.endTime}</span>
                      </div>
                      <input
                        type="time"
                        value={editingEvent.end_time || ""}
                        onChange={(e) => updateEventField(editingEvent._id, "end_time", e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-foreground font-medium text-right cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                {/* Past Date Warning Banner */}
                {isEventPast(editingEvent.date, editingEvent.start_time || editingEvent.time) && (
                  <div className="mt-2.5 flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
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

              {/* Location */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.location}
                </label>
                <div className="relative flex items-center">
                  {(editingEvent.location || "").startsWith("http://") || (editingEvent.location || "").startsWith("https://") ? (
                    <LinkIcon className="w-4 h-4 text-[#5BC0DE] absolute left-4 rtl:left-auto rtl:right-4 pointer-events-none" />
                  ) : (
                    <MapPin className="w-4 h-4 text-muted-foreground absolute left-4 rtl:left-auto rtl:right-4 pointer-events-none" />
                  )}
                  <input
                    type="text"
                    value={editingEvent.location || ""}
                    onChange={(e) => updateEventField(editingEvent._id, "location", e.target.value)}
                    placeholder={language === "ar" ? "الموقع / الرابط" : "Location / Link"}
                    className={`w-full pl-11 py-3 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none text-[16px] font-medium ${
                      (editingEvent.location || "").startsWith("http://") || (editingEvent.location || "").startsWith("https://")
                        ? "pr-11 rtl:pr-4 rtl:pl-11"
                        : "pr-4 rtl:pl-4 rtl:pr-11"
                    }`}
                  />
                  {((editingEvent.location || "").startsWith("http://") || (editingEvent.location || "").startsWith("https://")) && (
                    <button
                      type="button"
                      onClick={() => window.open(editingEvent.location!, "_blank", "noopener,noreferrer")}
                      className="absolute right-3 rtl:right-auto rtl:left-3 p-1.5 rounded-xl text-[#5BC0DE] hover:bg-[#5BC0DE]/15 active:scale-95 transition-all"
                      title={language === "ar" ? "فتح الرابط" : "Open Link"}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Schedule (Repeat & Reminder) */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {language === "ar" ? "الجدول" : "SCHEDULE"}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <select 
                    value={editingEvent.recurrence_rule || ""} 
                    onChange={(e) => updateEventField(editingEvent._id, "recurrence_rule", e.target.value)}
                    className="w-full px-3.5 py-3 rounded-2xl border border-border/80 bg-secondary/40 text-foreground text-[14px] font-medium outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 cursor-pointer">
                    <option value="">{language === "ar" ? "بدون تكرار" : "Repeat: Never"}</option>
                    <option value="FREQ=DAILY">{language === "ar" ? "يومياً" : "Repeat: Daily"}</option>
                    <option value="FREQ=WEEKLY">{language === "ar" ? "أسبوعياً" : "Repeat: Weekly"}</option>
                    <option value="FREQ=MONTHLY">{language === "ar" ? "شهرياً" : "Repeat: Monthly"}</option>
                  </select>
                  <select 
                    value={editingEvent.reminders && editingEvent.reminders.length > 0 ? String(editingEvent.reminders[0].minutes_before) : ""} 
                    onChange={(e) => updateEventField(editingEvent._id, "reminders", e.target.value ? [{minutes_before: parseInt(e.target.value)}] : [])}
                    className="w-full px-3.5 py-3 rounded-2xl border border-border/80 bg-secondary/40 text-foreground text-[14px] font-medium outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 cursor-pointer">
                    <option value="">{language === "ar" ? "بدون تذكير" : "Reminder: None"}</option>
                    <option value="0">{language === "ar" ? "في وقت الحدث" : "Reminder: At time"}</option>
                    <option value="10">{language === "ar" ? "قبل 10 دقائق" : "Reminder: 10m before"}</option>
                    <option value="30">{language === "ar" ? "قبل 30 دقيقة" : "Reminder: 30m before"}</option>
                    <option value="60">{language === "ar" ? "قبل ساعة" : "Reminder: 1h before"}</option>
                    <option value="1440">{language === "ar" ? "قبل يوم" : "Reminder: 1d before"}</option>
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.phone}
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-border/80 bg-secondary/40 text-foreground">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="tel"
                    value={editingEvent.phone || ""}
                    onChange={(e) => updateEventField(editingEvent._id, "phone", e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[16px] text-foreground placeholder:text-muted-foreground/40 font-medium"
                    placeholder="e.g. +1 555 0123"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2">
                  {labels.notes}
                </label>
                <textarea
                  value={editingEvent.notes || ""}
                  onChange={(e) => updateEventField(editingEvent._id, "notes", e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-200 focus:border-[#5BC0DE] focus:ring-2 focus:ring-[#5BC0DE]/20 text-[16px] font-medium resize-none"
                  placeholder={language === "ar" ? "أضف ملاحظة..." : "Add a note..."}
                />
              </div>
            </div>
          ) : (
            /* ================= LIST VIEW ================= */
            <div className="space-y-3 px-1 animate-in fade-in duration-300">
              {events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {labels.empty}
                </div>
              ) : (
                events.map((ev) => (
                  <div 
                    key={ev._id} 
                    className={`relative rounded-[20px] p-4 transition-all duration-200 border ${
                      ev.selected 
                        ? 'bg-secondary/20 border-border/60 hover:border-border' 
                        : 'bg-background/50 border-border/30 opacity-70'
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
                        <h4 className={`text-base font-semibold truncate ${!ev.selected ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {ev.title || labels.newEvent}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 opacity-70" />
                            {ev.date || "---"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 opacity-70" />
                            {ev.start_time || ev.time || "---"}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1.5 max-w-[140px] truncate" title={ev.location}>
                              {ev.location.startsWith("http://") || ev.location.startsWith("https://") ? (
                                <LinkIcon className="h-3.5 w-3.5 opacity-70 text-[#5BC0DE] shrink-0" />
                              ) : (
                                <MapPin className="h-3.5 w-3.5 opacity-70 shrink-0" />
                              )}
                              <span className="truncate">{ev.location}</span>
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
                          onClick={() => setEditingId(ev._id)}
                          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          aria-label="Edit event"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        
                        {events.length > 1 && (
                          <button 
                            onClick={() => removeEvent(ev._id)}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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

        {/* Footer Actions (Only show in List View) */}
        {!editingEvent && (
          <div className="pt-3 shrink-0 border-t border-border/30 mt-2 animate-in fade-in duration-300">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0 || isSaving}
              className="w-full rounded-[20px] py-4 text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#5BC0DE] text-black hover:bg-[#5BC0DE]/90 shadow-lg flex justify-center items-center"
            >
              {isSaving ? (
                <span className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                labels.confirmAll
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
