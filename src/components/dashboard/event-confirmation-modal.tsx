"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Trash2, Calendar, Clock, Edit2, ChevronLeft } from "lucide-react"
import { useApp } from "../../lib/store"
import type { ParsedEvent } from "../../lib/parse-voice-input"

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

  const handleConfirm = async () => {
    const validEvents = events.filter(ev => ev.selected && ev.title?.trim() && ev.date)

    if (validEvents.length === 0) {
      setToast({ type: "error", message: language === "fr" ? "Il me faut un titre et une date" : language === "ar" ? "أحتاج إلى عنوان وتاريخ لحدث واحد على الأقل" : "I need a title and date for at least one event" })
      return
    }

    setIsSaving(true)

    try {
      const primaryImageUrl = imageUrls?.[0]

      for (const ev of validEvents) {
        await addEvent({
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
        })
      }

      setToast({ type: "success", message: getSuccessMessage() })

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

  const inputClass = "w-full px-4 py-3.5 rounded-[20px] border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-[#5BC0DE] focus:ring-4 focus:ring-[#5BC0DE]/15"
  const labelClass = "text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block"

  const availableColors = [
    "#007AFF", // Blue
    "#FF3B30", // Red
    "#34C759", // Green
    "#FF9500", // Orange
    "#AF52DE", // Purple
    "#FF2D55", // Pink
    "#06B6D4", // Cyan
    "#EAB308", // Yellow
    "#5856D6", // Indigo
    "#14B8A6"  // Teal
  ]

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
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="h-9 w-9 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-bold text-foreground tracking-tight truncate">
                {labels.editEvent}
              </h3>
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
            <div className="space-y-5 px-1 pb-6 animate-in slide-in-from-right-4 duration-300">
              
              {/* Title */}
              <div className="flex flex-col">
                <label className={labelClass}>{labels.title}</label>
                <input
                  type="text"
                  value={editingEvent.title || ""}
                  onChange={(e) => updateEventField(editingEvent._id, "title", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Weekly Team Meeting"
                />
              </div>

              {/* Date, Start Time, & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col min-w-0">
                  <label className={labelClass}>{labels.date}</label>
                  <div className="w-full rounded-[20px] border border-border bg-secondary/40 transition-all duration-300 focus-within:border-[#5BC0DE] focus-within:ring-4 focus-within:ring-[#5BC0DE]/15 overflow-hidden flex items-center">
                    <input
                      type="date"
                      value={editingEvent.date || ""}
                      onChange={(e) => updateEventField(editingEvent._id, "date", e.target.value)}
                      className="w-full bg-transparent border-none outline-none px-3 sm:px-4 py-3.5 text-sm sm:text-base text-foreground min-w-0 [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <label className={labelClass}>{labels.startTime}</label>
                  <div className="w-full rounded-[20px] border border-border bg-secondary/40 transition-all duration-300 focus-within:border-[#5BC0DE] focus-within:ring-4 focus-within:ring-[#5BC0DE]/15 overflow-hidden flex items-center">
                    <input
                      type="time"
                      value={editingEvent.start_time || editingEvent.time || ""}
                      onChange={(e) => {
                        updateEventField(editingEvent._id, "start_time", e.target.value)
                        updateEventField(editingEvent._id, "time", e.target.value)
                      }}
                      className="w-full bg-transparent border-none outline-none px-3 sm:px-4 py-3.5 text-sm sm:text-base text-foreground min-w-0 [color-scheme:dark]"
                    />
                  </div>
                </div>
                <div className="flex flex-col min-w-0">
                  <label className={labelClass}>{labels.endTime}</label>
                  <div className="w-full rounded-[20px] border border-border bg-secondary/40 transition-all duration-300 focus-within:border-[#5BC0DE] focus-within:ring-4 focus-within:ring-[#5BC0DE]/15 overflow-hidden flex items-center">
                    <input
                      type="time"
                      value={editingEvent.end_time || ""}
                      onChange={(e) => updateEventField(editingEvent._id, "end_time", e.target.value)}
                      className="w-full bg-transparent border-none outline-none px-3 sm:px-4 py-3.5 text-sm sm:text-base text-foreground min-w-0 [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* Color Picker */}
              <div className="flex flex-col">
                <label className={labelClass}>{labels.color}</label>
                <div className="grid grid-cols-5 gap-3 bg-background/50 p-4 rounded-[20px] border border-border/50 justify-items-center">
                  {availableColors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateEventField(editingEvent._id, "color", c)}
                      className={`w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center ${
                        editingEvent.color === c 
                          ? 'scale-110 ring-2 ring-offset-2 ring-offset-background shadow-[0_0_15px_rgba(255,255,255,0.15)]' 
                          : 'hover:scale-110 opacity-70 hover:opacity-100 shadow-sm hover:shadow-md'
                      }`}
                      style={{ backgroundColor: c, '--tw-ring-color': c } as React.CSSProperties}
                      aria-label={`Select color ${c}`}
                    >
                      {editingEvent.color === c && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white/90 shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurrence & Reminder */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col min-w-0">
                  <label className={labelClass}>{labels.recurrence}</label>
                  <select 
                    value={editingEvent.recurrence_rule || ""} 
                    onChange={(e) => updateEventField(editingEvent._id, "recurrence_rule", e.target.value)}
                    className={inputClass}>
                    <option value="">{language === "ar" ? "بدون تكرار" : language === "fr" ? "Jamais" : "Never"}</option>
                    <option value="FREQ=DAILY">{language === "ar" ? "يومياً" : language === "fr" ? "Quotidien" : "Daily"}</option>
                    <option value="FREQ=WEEKLY">{language === "ar" ? "أسبوعياً" : language === "fr" ? "Hebdomadaire" : "Weekly"}</option>
                    <option value="FREQ=MONTHLY">{language === "ar" ? "شهرياً" : language === "fr" ? "Mensuel" : "Monthly"}</option>
                  </select>
                </div>
                <div className="flex flex-col min-w-0">
                  <label className={labelClass}>{labels.reminder}</label>
                  <select 
                    value={editingEvent.reminders && editingEvent.reminders.length > 0 ? String(editingEvent.reminders[0].minutes_before) : ""} 
                    onChange={(e) => updateEventField(editingEvent._id, "reminders", e.target.value ? [{minutes_before: parseInt(e.target.value)}] : [])}
                    className={inputClass}>
                    <option value="">{language === "ar" ? "بدون تذكير" : language === "fr" ? "Aucun" : "None"}</option>
                    <option value="0">{language === "ar" ? "في وقت الحدث" : language === "fr" ? "A l'heure" : "At time of event"}</option>
                    <option value="10">{language === "ar" ? "قبل 10 دقائق" : language === "fr" ? "10 min avant" : "10 min before"}</option>
                    <option value="30">{language === "ar" ? "قبل 30 دقيقة" : language === "fr" ? "30 min avant" : "30 min before"}</option>
                    <option value="60">{language === "ar" ? "قبل ساعة" : language === "fr" ? "1 heure avant" : "1 hour before"}</option>
                    <option value="1440">{language === "ar" ? "قبل يوم" : language === "fr" ? "1 jour avant" : "1 day before"}</option>
                  </select>
                </div>
              </div>

              {/* Phone & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className={labelClass}>{labels.phone}</label>
                  <input
                    type="tel"
                    value={editingEvent.phone || ""}
                    onChange={(e) => updateEventField(editingEvent._id, "phone", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. +1 555 0123"
                  />
                </div>
                <div className="flex flex-col">
                  <label className={labelClass}>{labels.location}</label>
                  <input
                    type="text"
                    value={editingEvent.location || ""}
                    onChange={(e) => updateEventField(editingEvent._id, "location", e.target.value)}
                    className={inputClass}
                    placeholder="Location"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col">
                <label className={labelClass}>{labels.notes}</label>
                <textarea
                  value={editingEvent.notes || ""}
                  onChange={(e) => updateEventField(editingEvent._id, "notes", e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-none`}
                  placeholder="Add any extra details..."
                />
              </div>
              
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="w-full mt-4 rounded-[20px] bg-secondary/80 py-4 text-base font-bold text-foreground hover:bg-secondary transition-colors"
              >
                {labels.done}
              </button>
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
