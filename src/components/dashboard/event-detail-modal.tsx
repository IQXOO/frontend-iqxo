"use client"

import { useState } from "react"
import { Pencil, Trash2, FileText, Download, ImageIcon, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useApp, computePriority } from "@/lib/store"
import { parseLocalDate } from "@/lib/store"
import { ImageLightbox } from "./image-lightbox"
import type { IQXOEvent } from "@/lib/types"
import { format, isToday, isTomorrow } from "date-fns"

interface EventDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: IQXOEvent | null
  onEdit: (event: IQXOEvent) => void
}

/* ── helpers ── */
function getCategoryFromEvent(event: IQXOEvent): { label: string; emoji: string; color: string; bg: string; border: string } {
  const src = event.source ?? ""
  if (src.includes("work") || src.includes("schedule")) {
    return { label: "Work", emoji: "💼", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" }
  }
  const priority = computePriority(event.date)
  if (priority === "urgent") {
    return { label: "Urgent", emoji: "🔴", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" }
  }
  return { label: "Personal", emoji: "✨", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" }
}

interface InfoCardProps {
  iconEmoji: string
  iconBg: string
  label: string
  children: React.ReactNode
  onClick?: () => void
  href?: string
}

function InfoCard({ iconEmoji, iconBg, label, children, onClick, href }: InfoCardProps) {
  const inner = (
    <div className="flex items-center gap-4 p-4 rounded-2xl border transition-colors"
         style={{ background: "var(--card, rgba(255,255,255,0.03))", borderColor: "rgba(255,255,255,0.06)" }}>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${iconBg}`}
      >
        {iconEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
           style={{ color: "var(--muted-foreground)" }}>
          {label}
        </p>
        <div className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>
          {children}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
         className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className="w-full text-left hover:opacity-80 transition-opacity">
        {inner}
      </button>
    )
  }

  return inner
}

export function EventDetailModal({
  open,
  onOpenChange,
  event,
  onEdit,
}: EventDetailModalProps) {
  const { deleteEvent, updateEvent, t, language } = useApp()
  const { toast } = useToast()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showImageLightbox, setShowImageLightbox] = useState(false)
  const [imgError, setImgError] = useState(false)
  const isRTL = language === "ar"

  if (!event) return null

  const _priority     = computePriority(event.date)
  const localDate    = parseLocalDate(event.date)
  const dateStr      = format(localDate, "EEEE, MMMM d, yyyy")
  const isEventToday    = isToday(localDate)
  const isEventTomorrow = isTomorrow(localDate)
  const hasImage     = !!event.image_url && !imgError
  const isVirtual    = event.source === "work_schedule_virtual"
  const category     = getCategoryFromEvent(event)

  const handleComplete = async () => {
    try {
      await updateEvent(event.id, { is_done: !event.is_done })
      onOpenChange(false)
      toast({
        title: event.is_done
          ? (language === "ar" ? "تم إلغاء الإتمام" : "Marked as pending")
          : (language === "ar" ? "تم الإتمام" : "Event completed! ✓"),
      })
    } catch {
      toast({ title: "Error", variant: "destructive" })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="fixed inset-0 z-50 w-full h-full max-h-screen bg-[#0C0C0E] border-none flex flex-col p-0 gap-0 translate-x-0 translate-y-0 top-0 left-0 max-w-none rounded-none sm:max-w-[430px] sm:h-[90vh] sm:max-h-[850px] sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border sm:border-white/5 sm:shadow-2xl overflow-hidden outline-none"
          showCloseButton={false}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* visually hidden titles for accessibility */}
          <DialogTitle className="sr-only">{event.title}</DialogTitle>
          <DialogDescription className="sr-only">{event.title} details</DialogDescription>

          {/* ── STICKY HEADER ── */}
          <div className="flex justify-between items-center px-5 py-4 border-b border-white/[0.04] bg-[#0C0C0E]/90 backdrop-blur-xl sticky top-0 z-50 shrink-0">
            <div className="text-xl font-bold tracking-tight">
              <span className="text-white">IQ</span>
              <span className="text-[#5BC0DE]">X</span>
              <span className="text-white">O</span>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.04] flex items-center justify-center text-white/70 hover:bg-white/[0.06] hover:border-white/[0.08] hover:text-white transition-all text-base select-none"
            >
              ✕
            </button>
          </div>

          {/* ── HERO IMAGE (if present) ── */}
          {hasImage && (
            <div
              className="relative w-full overflow-hidden cursor-pointer shrink-0"
              style={{ height: "200px" }}
              onClick={() => setShowImageLightbox(true)}
            >
              <img
                src={event.image_url!}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                <ImageIcon className="w-3 h-3 text-white/80" />
                <span className="text-[10px] text-white/80 font-medium">
                  {language === "ar" ? "انقر للتكبير" : language === "fr" ? "Agrandir" : "Tap to expand"}
                </span>
              </div>
            </div>
          )}

          {/* ── SCROLLABLE BODY ── */}
          <div className="flex-1 overflow-y-auto">

            {/* ── HERO CARD ── */}
            <div className="mx-4 mt-4 mb-3 rounded-2xl p-5 relative overflow-hidden"
                 style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>

              {/* subtle top accent line */}
              <div className="absolute top-0 left-[25%] right-[25%] h-[1.5px] rounded-full opacity-40"
                   style={{ background: "linear-gradient(90deg, transparent, var(--primary), transparent)" }} />

              {/* Category badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 border ${category.bg} ${category.color} ${category.border}`}>
                <span>{category.emoji}</span>
                <span>{category.label}</span>
              </div>

              {/* Today / Tomorrow chip */}
              {(isEventToday || isEventTomorrow) && (
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isEventToday ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                  {isEventToday ? (language === "ar" ? "اليوم" : "Today") : (language === "ar" ? "غداً" : "Tomorrow")}
                </span>
              )}

              {/* Completed badge */}
              {event.is_done && (
                <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> Done
                </span>
              )}

              {/* Title */}
              <h2 className="text-[22px] font-bold leading-snug mt-1 mb-2"
                  style={{ color: "var(--foreground)" }}>
                {event.title}
              </h2>

              {/* Notes / Description */}
              {event.notes && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {event.notes}
                </p>
              )}
            </div>

            {/* ── INFO CARDS ── */}
            <div className="px-4 space-y-2 pb-4">

              {/* Date */}
              <InfoCard iconEmoji="📅" iconBg="bg-cyan-500/10" label={language === "ar" ? "التاريخ" : language === "fr" ? "DATE" : "DATE"}>
                {dateStr}
              </InfoCard>

              {/* Time */}
              <InfoCard iconEmoji="⏰" iconBg="bg-amber-500/10" label={language === "ar" ? "الوقت" : language === "fr" ? "HEURE" : "TIME"}>
                {event.time || "—"}
              </InfoCard>

              {/* Location */}
              {event.location && (
                <InfoCard
                  iconEmoji="📍"
                  iconBg="bg-purple-500/10"
                  label={language === "ar" ? "الموقع" : language === "fr" ? "LIEU" : "LOCATION"}
                  href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                >
                  {event.location}
                </InfoCard>
              )}

              {/* Phone */}
              {event.phone && (
                <InfoCard
                  iconEmoji="📞"
                  iconBg="bg-green-500/10"
                  label={language === "ar" ? "الهاتف" : language === "fr" ? "TÉLÉPHONE" : "PHONE"}
                  href={`tel:${event.phone}`}
                >
                  {event.phone}
                </InfoCard>
              )}

              {/* Email */}
              {event.email && (
                <InfoCard
                  iconEmoji="✉️"
                  iconBg="bg-blue-500/10"
                  label={language === "ar" ? "البريد الإلكتروني" : language === "fr" ? "E-MAIL" : "EMAIL"}
                  href={`mailto:${event.email}`}
                >
                  {event.email}
                </InfoCard>
              )}

              {/* PDF Attachment */}
              {event.pdf_url && (
                <a
                  href={event.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl border transition-colors hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/10 shrink-0">
                    <FileText className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                       style={{ color: "var(--muted-foreground)" }}>DOCUMENT</p>
                    <p className="text-[15px] font-semibold truncate" style={{ color: "var(--foreground)" }}>
                      {decodeURIComponent(event.pdf_url.split("/").pop() ?? "document.pdf")}
                    </p>
                  </div>
                  <Download className="h-4 w-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                </a>
              )}
            </div>
          </div>

          {/* ── ACTION BUTTONS FOOTER ── */}
          <div className="px-4 py-4 shrink-0 flex gap-3"
               style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

            {/* Edit — amber */}
            {!isVirtual && (
              <button
                onClick={() => { onEdit(event); onOpenChange(false) }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(212,168,83,0.10)",
                  border: "1px solid rgba(212,168,83,0.25)",
                  color: "#D4A853",
                }}
              >
                <Pencil className="w-4 h-4" />
                {language === "ar" ? "تعديل" : language === "fr" ? "Modifier" : "Edit"}
              </button>
            )}

            {/* Complete — cyan */}
            <button
              onClick={handleComplete}
              className="flex-[1.4] flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: event.is_done ? "rgba(91,214,142,0.15)" : "var(--primary, #5BC0DE)",
                color: event.is_done ? "#5BD68E" : "var(--background, #0C0C0E)",
                border: event.is_done ? "1px solid rgba(91,214,142,0.3)" : "none",
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              {event.is_done
                ? (language === "ar" ? "إلغاء" : language === "fr" ? "Annuler" : "Undo")
                : (language === "ar" ? "اكتمل" : language === "fr" ? "Terminer" : "Complete")}
            </button>

            {/* Delete — red */}
            {!isVirtual && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(222,91,91,0.10)",
                  border: "1px solid rgba(222,91,91,0.25)",
                  color: "#DE5B5B",
                }}
              >
                <Trash2 className="w-4 h-4" />
                {language === "ar" ? "حذف" : language === "fr" ? "Supprimer" : "Delete"}
              </button>
            )}
          </div>

          {/* ── IMAGE LIGHTBOX ── */}
          {hasImage && (
            <ImageLightbox
              isOpen={showImageLightbox}
              imageUrl={event.image_url!}
              title={event.title}
              onClose={() => setShowImageLightbox(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION ── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ar" ? "حذف الحدث" : language === "fr" ? "Supprimer l'événement" : "Delete Event"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ar"
                ? "هل أنت متأكد أنك تريد حذف هذا الحدث؟ لا يمكن التراجع عن هذا الإجراء."
                : language === "fr"
                ? "Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible."
                : "Are you sure you want to delete this event? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteEvent(event.id)
                  onOpenChange(false)
                  setShowDeleteConfirm(false)
                  toast({
                    title: language === "ar" ? "تم الحذف" : language === "fr" ? "Supprimé" : "Event deleted",
                    description:
                      language === "ar"
                        ? "تم حذف الحدث بنجاح."
                        : language === "fr"
                        ? "L'événement a été supprimé avec succès."
                        : "The event has been successfully deleted.",
                  })
                } catch (err) {
                  console.error("Failed to delete event:", err)
                  const errMessage = err instanceof Error ? err.message : String(err)
                  toast({
                    title: language === "ar" ? "فشل الحذف" : "Delete failed",
                    description: errMessage || (language === "ar" ? "حدث خطأ غير متوقع." : "An unexpected error occurred."),
                    variant: "destructive",
                  })
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  )
}
