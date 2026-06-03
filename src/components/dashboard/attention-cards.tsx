"use client"

import { Bell, Phone, MapPin } from "lucide-react"
import { useApp } from "@/lib/store"
import type { IQXOEvent } from "@/lib/types"
import { format, isToday, isTomorrow } from "date-fns"

interface UrgentCardsProps {
  onEventClick: (event: IQXOEvent) => void
}

export function UrgentCards({ onEventClick }: UrgentCardsProps) {
  const { getEventsByPriority, t } = useApp()
  const urgentEvents = getEventsByPriority("urgent")

  if (urgentEvents.length === 0) return null

  return (
    <section className="py-2">
      <div className="flex items-center justify-between px-5 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground tracking-wide">
            {t("urgentTitle")}
          </h2>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
        </div>
        <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive/80">
          {urgentEvents.length} {t("urgentBadge")}
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide p-3 snap-mandatory">
        {urgentEvents.map((event) => (
          <UrgentEventCard key={event.id} event={event} onClick={() => onEventClick(event)} />
        ))}
      </div>
    </section>
  )
}

function UrgentEventCard({
  event,
  onClick,
}: {
  event: IQXOEvent
  onClick: () => void
}) {
  const { t } = useApp()
  const eventDate = new Date(event.date)

  const dateLabel = isToday(eventDate)
    ? t("today")
    : isTomorrow(eventDate)
      ? t("tomorrow")
      : format(eventDate, "EEE, MMM d")

  return (
    <button
      onClick={onClick}
      className="snap-start shrink-0 w-[240px] rounded-2xl bg-gradient-to-br from-destructive/15 via-destructive/10 to-transparent glass p-4 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-destructive animate-pulse" />
          <span className="text-[11px] font-semibold text-destructive/90 uppercase tracking-wider">
            {t("urgentBadge")}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {event.time}
        </span>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground leading-snug truncate">
          {event.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
      </div>

      {(event.phone || event.location) && (
        <div className="flex items-center gap-2 mt-auto">
          {event.phone && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="sr-only">{t("call")}</span>
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
        </div>
      )}
    </button>
  )
}
