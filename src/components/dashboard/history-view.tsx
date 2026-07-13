"use client"

import { History } from "lucide-react"
import { EventList } from "./event-list"
import { useApp, computePriority } from "@/lib/store"
import type { IQXOEvent } from "@/lib/types"
import { useMemo, useEffect } from "react"
import { InfiniteScroll } from "./infinite-scroll"

interface HistoryViewProps {
  onEventClick: (event: IQXOEvent) => void
}

export function HistoryView({ onEventClick }: HistoryViewProps) {
  const {
    events,
    deleteEvent,
    t,
    archiveLoading,
    archiveHasMore,
    fetchArchiveEvents,
    loadMoreArchiveEvents,
  } = useApp()

  useEffect(() => {
    fetchArchiveEvents();
  }, [fetchArchiveEvents]);

  const pastEvents = useMemo(
    () =>
      events
        .filter(
          (e) =>
            computePriority(e.date) === "past" &&
            e.source !== "work_schedule" &&
            e.source !== "work_schedule_virtual"
        )
        .sort(
          (a, b) =>
            new Date(`${b.date}T${b.time || "00:00"}`).getTime() -
            new Date(`${a.date}T${a.time || "00:00"}`).getTime()
        ),
    [events]
  )

  if (pastEvents.length === 0) {
    return (
      <div className="px-5 py-4">
        <h1 className="text-xl font-bold text-foreground mb-6">
          {t("pastTitle")}
        </h1>
        <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
            <History className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t("noPast")}
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
    <div className="py-4">
      <div className="px-5 mb-4">
        <h1 className="text-xl font-bold text-foreground">
          {t("pastTitle")}
        </h1>
      </div>
      <EventList
        priority="past"
        events={pastEvents}
        onEventClick={onEventClick}
        onDelete={deleteEvent}
      />
      <InfiniteScroll
        hasMore={archiveHasMore}
        isLoading={archiveLoading}
        onLoadMore={loadMoreArchiveEvents}
      />
    </div>
  )
}
