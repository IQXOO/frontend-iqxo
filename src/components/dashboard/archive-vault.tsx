"use client"

import { motion } from "framer-motion"
import { Archive, RotateCcw, X } from "lucide-react"
import { useApp } from "@/lib/store"
import { toLocalDateStr } from "@/lib/store"
import type { IQXOEvent } from "@/lib/types"
import { useEffect } from "react"
import { InfiniteScroll } from "./infinite-scroll"
import { ArchiveSkeleton } from "./skeleton"

interface ArchiveVaultProps {
  onEventClick: (event: IQXOEvent) => void
}

export function ArchiveVault({ onEventClick }: ArchiveVaultProps) {
  const {
    events,
    deleteEvent,
    addEvent,
    language,
    archiveLoading,
    archiveHasMore,
    fetchArchiveEvents,
    loadMoreArchiveEvents
  } = useApp()

  useEffect(() => {
    fetchArchiveEvents();
  }, [fetchArchiveEvents]);

  // Get past events (using LOCAL today, exclude virtual schedule events)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toLocalDateStr(today)

  const pastEvents = events
    .filter(
      (e) =>
        e.date < todayStr &&
        e.source !== "work_schedule_virtual" &&
        e.source !== "work_schedule"
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  const handleRestore = async (event: IQXOEvent) => {
    // Delete from past and re-add with today's date
    await deleteEvent(event.id)
    await addEvent({
      ...event,
      date: toLocalDateStr(),
    })
  }

  // عرض skeleton لما يكون في loading أولية (مفيش داتا لسه وبيتحمل)
  if (archiveLoading && pastEvents.length === 0) {
    return <ArchiveSkeleton count={5} />
  }

  if (pastEvents.length === 0) {
    return (
      <div className="px-5 py-12 flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-3xl bg-gray-500/10 flex items-center justify-center">
          <Archive className="h-10 w-10 text-gray-400/50" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground">
            {language === "ar" ? "الأرشيف فارغ" : "Memory Vault is empty"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar"
              ? "الأحداث السابقة ستظهر هنا"
              : "Past events will appear here"}
          </p>
        </div>
        {archiveLoading && (
          <div className="py-4 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-5 py-6 space-y-3">
      <p className="text-xs text-muted-foreground px-2 mb-4">
        {language === "ar"
          ? `${pastEvents.length} ذكريات محفوظة`
          : `${pastEvents.length} memories saved`}
      </p>

      {pastEvents.map((event, idx) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.08, duration: 0.4 }}
          className="group glass rounded-2xl p-4 opacity-60 hover:opacity-100 transition-opacity"
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onEventClick(event)}
            >
              <h3 className="font-semibold text-foreground truncate">
                {event.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(event.date).toLocaleDateString(
                  language === "ar" ? "ar-EG" : language === "fr" ? "fr-FR" : "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                )}
              </p>
              {event.notes && (
                <p className="text-xs text-muted-foreground/60 mt-2 line-clamp-2">
                  {event.notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleRestore(event)}
                className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"
                title={language === "ar" ? "استعادة" : "Restore"}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteEvent(event.id)}
                className="flex-shrink-0 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                title={language === "ar" ? "حذف" : "Delete"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
      <InfiniteScroll
        hasMore={archiveHasMore}
        isLoading={archiveLoading}
        onLoadMore={loadMoreArchiveEvents}
      />
    </div>
  )
}
