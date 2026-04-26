"use client"

import { useState } from "react"
import { Phone, MapPin, Share2, Pencil, Trash2, FileText, Download, ImageIcon } from "lucide-react"
import { motion } from "framer-motion"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
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
import { ImageLightbox } from "./image-lightbox"
import type { IQXOEvent } from "@/lib/types"
import { format, isToday, isTomorrow } from "date-fns"

interface EventDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: IQXOEvent | null
  onEdit: (event: IQXOEvent) => void
}

export function EventDetailModal({
  open,
  onOpenChange,
  event,
  onEdit,
}: EventDetailModalProps) {
  const { deleteEvent, t, language } = useApp()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showImageLightbox, setShowImageLightbox] = useState(false)
  const [imgError, setImgError] = useState(false)
  const isRTL = language === "ar"

  if (!event) return null

  const priority = computePriority(event.date)
  const dateStr = format(new Date(event.date), "MMM d, yyyy")
  const isEventToday = isToday(new Date(event.date))
  const isEventTomorrow = isTomorrow(new Date(event.date))
  const hasImage = !!event.image_url && !imgError

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="bg-background border-border max-h-[90vh] overflow-hidden flex flex-col"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* ── HERO IMAGE — full-width at the very top ── */}
          {hasImage && (
            <div
              className="relative w-full overflow-hidden cursor-pointer shrink-0"
              style={{ height: "220px" }}
              onClick={() => setShowImageLightbox(true)}
            >
              <img
                src={event.image_url!}
                alt={event.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
              {/* Gradient overlay so header text stays readable */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />

              {/* Tap-to-expand hint */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                <ImageIcon className="w-3 h-3 text-white/80" />
                <span className="text-[10px] text-white/80 font-medium">
                  {language === "ar" ? "انقر للتكبير" : language === "fr" ? "Agrandir" : "Tap to expand"}
                </span>
              </div>

              {/* Edit button overlaid on image */}
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(event); onOpenChange(false) }}
                className="absolute top-3 right-3 h-8 w-8 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── HEADER ── */}
          <DrawerHeader className="relative shrink-0 pb-2">
            <DrawerTitle className={`text-foreground ${hasImage ? "pr-4" : "pr-10"}`}>
              {event.title}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{event.title} details</DrawerDescription>

            {/* Edit button (only shown when no image — otherwise it's on the image) */}
            {!hasImage && (
              <button
                onClick={() => { onEdit(event); onOpenChange(false) }}
                className="absolute top-3 right-4 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </DrawerHeader>

          {/* ── SCROLLABLE CONTENT ── */}
          <div className="px-4 pb-4 overflow-y-auto flex-1 space-y-4">

            {/* Priority + Today/Tomorrow badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                priority === "urgent"   ? "bg-red-500/20 text-red-400" :
                priority === "upcoming" ? "bg-yellow-500/20 text-yellow-400" :
                priority === "later"    ? "bg-green-500/20 text-green-400" :
                                          "bg-gray-500/20 text-gray-400"
              }`}>
                {priority === "urgent"   ? "🔴 Urgent"   :
                 priority === "upcoming" ? "🟡 Upcoming" :
                 priority === "later"    ? "🟢 Later"    : "⚪ Past"}
              </span>
              {isEventToday    && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">Today</span>}
              {isEventTomorrow && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">Tomorrow</span>}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="text-sm font-medium text-foreground">{dateStr}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</p>
                <p className="text-sm font-medium text-foreground">{event.time || "—"}</p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-blue-500/10 transition-colors group"
              >
                <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location</p>
                  <p className="text-sm text-foreground mt-1">{event.location}</p>
                </div>
                <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Open Maps ›</span>
              </a>
            )}

            {/* Phone */}
            {event.phone && (
              <a href={`tel:${event.phone}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-emerald-500/10 transition-colors group"
              >
                <Phone className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</p>
                  <p className="text-sm text-foreground mt-1">{event.phone}</p>
                </div>
                <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">Call ›</span>
              </a>
            )}

            {/* Notes */}
            {event.notes && (
              <div className="space-y-2 p-3 rounded-xl bg-secondary/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</p>
                <p className="text-sm text-foreground leading-relaxed">{event.notes}</p>
              </div>
            )}

            {/* PDF Attachment */}
            {event.pdf_url && (
              <a
                href={event.pdf_url}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 border border-border hover:bg-secondary/60 transition-colors group"
              >
                <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {decodeURIComponent(event.pdf_url.split("/").pop() ?? "document.pdf")}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF Document</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </a>
            )}
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div className="px-4 py-4 border-t border-border flex gap-3 shrink-0">
            <motion.button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium text-sm transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 className="w-4 h-4" />
              {t("delete")}
            </motion.button>
            <motion.button
              onClick={async () => {
                const text = [
                  event.title,
                  event.date + (event.time ? " " + event.time : ""),
                  event.location ? "📍 " + event.location : "",
                  event.phone    ? "📞 " + event.phone    : "",
                  event.notes || "",
                ].filter(Boolean).join("\n")
                try {
                  if (navigator.share) {
                    await navigator.share({ title: event.title, text })
                  } else {
                    await navigator.clipboard.writeText(text)
                    alert("Copied to clipboard!")
                  }
                } catch {}
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-sm transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              <Share2 className="w-4 h-4" />
              {t("share")}
            </motion.button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this event? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteEvent(event.id)
                onOpenChange(false)
                setShowDeleteConfirm(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox */}
      {hasImage && (
        <ImageLightbox
          isOpen={showImageLightbox}
          imageUrl={event.image_url!}
          title={event.title}
          onClose={() => setShowImageLightbox(false)}
        />
      )}
    </>
  )
}
