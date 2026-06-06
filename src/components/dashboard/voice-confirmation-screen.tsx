"use client"

import { Check, X, Pencil, Calendar, Clock, MapPin, Phone, FileText } from "lucide-react"
import { motion } from "framer-motion"
import { useApp } from "../../lib/store"
import type { IQXOEvent } from "../../lib/types"
import type { ParsedEvent } from "../../lib/parse-voice-input"

interface VoiceConfirmationScreenProps {
  isOpen: boolean
  data: ParsedEvent | IQXOEvent | null
  onConfirm: (event: IQXOEvent) => void
  onEdit: () => void
  onCancel: () => void
}

export function VoiceConfirmationScreen({
  isOpen,
  data,
  onConfirm,
  onEdit,
  onCancel,
}: VoiceConfirmationScreenProps) {
  const { addEvent, language } = useApp()
  const isRTL = language === "ar"

  if (!isOpen || !data) return null

  const title = "title" in data ? data.title : ""
  const date = "date" in data ? data.date : ""
  const time = "time" in data ? data.time : ""
  const phone = "phone" in data ? data.phone : ""
  const location = "location" in data ? data.location : ""
  const notes = "notes" in data ? data.notes : ""

  const handleConfirm = async () => {
    try {
      await addEvent({
        title: title || "",
        date: date || "",
        time: time || "",
        phone: phone || undefined,
        location: location || undefined,
        notes: notes || "",
        image_url: undefined,
        source: "voice",
        is_done: false,
      })
    } catch (err) {
      console.error("voice confirm save failed:", err)
    }
    // Still call onConfirm so parent can close the screen
    onConfirm({
      id: crypto.randomUUID(),
      user_id: "",
      title: title || "",
      date: date || "",
      time: time || "",
      phone: phone || undefined,
      location: location || undefined,
      notes: notes || "",
      image_url: undefined,
      source: "voice",
      is_done: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />

      {/* Modal */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-sm rounded-3xl bg-background border border-border shadow-2xl overflow-hidden pointer-events-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/20">
            <h2 className="text-lg font-semibold text-foreground flex-1 text-center">
              {language === "ar" ? "تأكيد الموعد" : language === "fr" ? "Confirmer l'événement" : "Found this for you"}
            </h2>
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* What */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm">📝</span>
                </div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === "ar" ? "ماذا" : language === "fr" ? "Quoi" : "What"}
                </label>
              </div>
              <p className="text-sm text-foreground leading-relaxed pl-10">{title}</p>
            </div>

            {/* When & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-500" />
                  </div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {language === "ar" ? "متى" : language === "fr" ? "Quand" : "When"}
                  </label>
                </div>
                <p className="text-sm text-foreground pl-10">{date || "—"}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {language === "ar" ? "الوقت" : language === "fr" ? "Heure" : "Time"}
                  </label>
                </div>
                <p className="text-sm text-foreground pl-10">{time || "—"}</p>
              </div>
            </div>

            {/* Where */}
            {location && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                  </div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {language === "ar" ? "أين" : language === "fr" ? "Où" : "Where"}
                  </label>
                </div>
                <p className="text-sm text-foreground pl-10">{location}</p>
              </div>
            )}

            {/* Phone */}
            {phone && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-violet-500" />
                  </div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {language === "ar" ? "الهاتف" : language === "fr" ? "Téléphone" : "Phone"}
                  </label>
                </div>
                <p className="text-sm text-foreground pl-10">{phone}</p>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-rose-500" />
                  </div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {language === "ar" ? "ملاحظات" : language === "fr" ? "Notes" : "Notes"}
                  </label>
                </div>
                <p className="text-sm text-foreground pl-10">{notes}</p>
              </div>
            )}
          </div>

          {/* Footer - Buttons */}
          <div className="px-5 py-4 border-t border-border bg-secondary/10 flex gap-3">
            <motion.button
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-sm transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <X className="w-4 h-4" />
              {language === "ar" ? "إلغاء" : language === "fr" ? "Annuler" : "Never mind"}
            </motion.button>
            <motion.button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-sm transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <Pencil className="w-4 h-4" />
              {language === "ar" ? "تعديل" : language === "fr" ? "Modifier" : "Change"}
            </motion.button>
            <motion.button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/30"
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -1 }}
            >
              <Check className="w-4 h-4" />
              {language === "ar" ? "تم" : language === "fr" ? "Confirmer" : "Looks good"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
