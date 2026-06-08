"use client"

import { useState, useEffect } from "react"
import { X, Calendar, Clock, MapPin, Phone, FileText, Check, Edit3, CheckCircle, AlertCircle } from "lucide-react"
import { useApp } from "../../lib/store"
import type { ParsedEvent } from "../../lib/parse-voice-input"

interface EventConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extractedData: ParsedEvent | null
  source: "voice" | "photo"
}

export function EventConfirmationModal({
  open,
  onOpenChange,
  extractedData,
  source,
  imageUrl,
}: EventConfirmationModalProps & { imageUrl?: string }) {
  const { addEvent, language } = useApp()
  
  // Editable fields
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [location, setLocation] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Populate fields when data changes
  useEffect(() => {
    if (extractedData && open) {
      setTitle(extractedData.title || "")
      setDate(extractedData.date || "")
      setTime(extractedData.time || "")
      setLocation(extractedData.location || "")
      setPhone(extractedData.phone || "")
      setNotes("") // ParsedEvent doesn't have notes, so set empty
      setIsEditing(false)
    }
  
  }, [extractedData, open])

  // Random motivational messages for success (defined here so we can use it in handleConfirm)
  const getSuccessMessage = () => {
    const messages = language === "fr" 
      ? ["C'est note.", "Une chose de moins a penser.", "Tu geres.", "Tout est organise."]
      : ["All set.", "One less thing to think about.", "You're on top of it.", "It's in your calendar."]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const handleConfirm = async () => {
    if (!title.trim() || !date) {
      setToast({ type: "error", message: language === "fr" ? "Il me faut un titre et une date" : "I need a title and date" })
      return
    }

    setIsSaving(true)

    try {
      // Save directly to Supabase via store addEvent (scoped to current user)
      await addEvent({
        title: title.trim(),
        date,
        time: time || "",
        location: location || undefined,
        phone: phone || undefined,
        notes: notes || "",
        image_url: imageUrl || undefined,
        source: source === "photo" ? "upload" : "voice",
        is_done: false,
      })

      setToast({ type: "success", message: getSuccessMessage() })

      // Reset fields
      setTitle("")
      setDate("")
      setTime("")
      setLocation("")
      setPhone("")
      setNotes("")

      setTimeout(() => {
        setToast(null)
        onOpenChange(false)
      }, 600)
    } catch (err) {
      console.error("Failed to save event:", err)
      setToast({ type: "error", message: "Failed to save event. Please try again." })
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setIsEditing(false)
    setToast(null)
  }

  if (!open) return null

  const labels = {
    title: language === "fr" ? "Quoi" : "What",
    date: language === "fr" ? "Quand" : "When",
    time: language === "fr" ? "Heure" : "Time",
    location: language === "fr" ? "Ou" : "Where",
    phone: language === "fr" ? "Telephone" : "Phone",
    notes: language === "fr" ? "Notes" : "Notes",
    confirm: language === "fr" ? "C'est bon" : "Looks good",
    edit: language === "fr" ? "Modifier" : "Change something",
    cancel: language === "fr" ? "Annuler" : "Never mind",
    headerVoice: language === "fr" ? "J'ai trouve ca" : "Found this for you",
    headerPhoto: language === "fr" ? "J'ai vu ca" : "I spotted this",
    saving: language === "fr" ? "Un instant..." : "Just a moment...",
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not the modal content
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-in slide-in-from-top duration-300 ${
          toast.type === "success" 
            ? "bg-green-500 text-white" 
            : "bg-destructive text-destructive-foreground"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
      
      <div className="w-full max-w-md glass rounded-3xl p-5 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto" style={{ paddingBottom: "24px" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">
            {source === "voice" ? labels.headerVoice : labels.headerPhoto}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              {labels.title}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={labels.title}
              />
            ) : (
              <p className="rounded-xl bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground">
                {title || "-"}
              </p>
            )}
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {labels.date}
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <p className="rounded-xl bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground">
                  {date || "-"}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {labels.time}
              </label>
              {isEditing ? (
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <p className="rounded-xl bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground">
                  {time || "-"}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {labels.location}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={labels.location}
              />
            ) : (
              <p className="rounded-xl bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground">
                {location || "-"}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              {labels.phone}
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={labels.phone}
              />
            ) : (
              <p className="rounded-xl bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground">
                {phone || "-"}
              </p>
            )}
          </div>

          {/* Notes (only in edit mode or if has content) */}
          {(isEditing || notes) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {labels.notes}
              </label>
              {isEditing ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder={labels.notes}
                />
              ) : (
                <p className="rounded-xl bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground">
                  {notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 rounded-2xl bg-secondary py-3 text-sm font-semibold text-foreground transition-all hover:bg-secondary/80"
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!title.trim() || !date || isSaving}
                className="flex-1 rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSaving ? labels.saving : labels.confirm}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                disabled={isSaving}
                className="flex-1 rounded-2xl bg-secondary py-3 text-sm font-semibold text-foreground flex items-center justify-center gap-2 transition-all hover:bg-secondary/80 disabled:opacity-50"
              >
                <Edit3 className="h-4 w-4" />
                {labels.edit}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!title.trim() || !date || isSaving}
                className="flex-1 rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSaving ? labels.saving : labels.confirm}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
