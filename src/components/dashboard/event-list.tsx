"use client"

import { ChevronRight, Phone, MapPin, Calendar, Clock, Trash2, Lightbulb } from "lucide-react"
import { useApp } from "../../lib/store"
import { generateAIInsight } from "../../lib/ai-insights"
import type { IQXOEvent, Priority } from "../../lib/types"
import { format, isToday, isTomorrow } from "date-fns"

interface EventListProps {
  priority: Priority
  events: IQXOEvent[]
  onEventClick: (event: IQXOEvent) => void
  onDelete?: (id: string) => void
}

const priorityConfig: Record<Priority, {
  titleKey: string;
  badgeKey: string;
  emptyKey: string;
  accentFrom: string;
  accentVia: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  upcoming: {
    titleKey: "upcomingTitle" as const,
    badgeKey: "upcomingBadge" as const,
    emptyKey: "noUpcoming" as const,
    accentFrom: "from-primary/20",
    accentVia: "via-primary/5",
    iconColor: "text-primary",
    badgeBg: "bg-primary/15",
    badgeText: "text-primary",
  },
  later: {
    titleKey: "laterTitle" as const,
    badgeKey: "laterBadge" as const,
    emptyKey: "noLater" as const,
    accentFrom: "from-chart-3/30",
    accentVia: "via-chart-3/15",
    iconColor: "text-chart-3 font-extrabold",
    badgeBg: "bg-chart-3/25",
    badgeText: "text-chart-3 font-extrabold",
  },
  urgent: {
    titleKey: "urgentTitle" as const,
    badgeKey: "urgentBadge" as const,
    emptyKey: "noUrgent" as const,
    accentFrom: "from-destructive/20",
    accentVia: "via-destructive/5",
    iconColor: "text-destructive",
    badgeBg: "bg-destructive/15",
    badgeText: "text-destructive",
  },
  past: {
    titleKey: "pastTitle" as const,
    badgeKey: "pastBadge" as const,
    emptyKey: "noPast" as const,
    accentFrom: "from-muted/30",
    accentVia: "via-muted/10",
    iconColor: "text-muted-foreground",
    badgeBg: "bg-muted/30",
    badgeText: "text-muted-foreground",
  },
}

export function EventList({ priority, events, onEventClick, onDelete }: EventListProps) {
  const { t } = useApp()
  const config = priorityConfig[priority] || priorityConfig.upcoming

  if (events.length === 0) {
    return (
      <section className="px-5 py-2">
        <h2 className="text-sm font-semibold text-foreground tracking-wide mb-3">
          {t(config.titleKey)}
        </h2>
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-2">
          <Calendar className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">{t(config.emptyKey)}</p>
        </div>
      </section>
    )
  }

  // Use a creative staggered grid layout
  return (
    <section className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground tracking-wide">
          {t(config.titleKey)}
        </h2>
        <span className={`rounded-full ${config.badgeBg} px-2.5 py-0.5 text-[11px] font-semibold ${config.badgeText}`}>
          {events.length} {t(config.badgeKey)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {events.map((event, index) => (
          <EventGridCard
            key={event.id}
            event={event}
            onClick={() => onEventClick(event)}
            priority={priority}
            isFeature={index === 0 && events.length > 2}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  )
}

function EventGridCard({
  event,
  onClick,
  priority,
  isFeature,
  onDelete,
}: {
  event: IQXOEvent
  onClick: () => void
  priority: Priority
  isFeature: boolean
  onDelete?: (id: string) => void
}) {
  const eventDate = new Date(event.date)
  const { t } = useApp()
  const config = priorityConfig[priority] || priorityConfig.upcoming    

  const dateLabel = isToday(eventDate)
    ? t("today")
    : isTomorrow(eventDate)
      ? t("tomorrow")
      : format(eventDate, "MMM d")

  const dayName = isToday(eventDate)
    ? ""
    : isTomorrow(eventDate)
      ? ""
      : format(eventDate, "EEE")

  // The first card in a group of 3+ spans full width as a "feature" card
  if (isFeature) {
    return (
      <button
        onClick={onClick}
        className={`col-span-2 glass rounded-2xl p-4 flex items-center gap-4 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group bg-gradient-to-r ${config.accentFrom} ${config.accentVia} to-transparent`}
      >
        <div className="h-14 w-14 rounded-2xl bg-secondary/60 flex flex-col items-center justify-center shrink-0">
          <span className={`text-[10px] font-bold uppercase leading-none ${config.iconColor}`}>
            {format(eventDate, "MMM")}
          </span>
          <span className="text-xl font-bold text-foreground leading-none mt-0.5">
            {format(eventDate, "d")}
          </span>
          {dayName && (
            <span className="text-[9px] font-medium text-muted-foreground leading-none mt-0.5">
              {dayName}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {dateLabel}{event.time ? ` \u00B7 ${event.time}` : ""}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{event.location}</span>
            </div>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
    )
  }

  // Standard grid card
  const aiInsight = generateAIInsight(event)
  
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`w-full glass rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group min-h-[130px] ${priority === "past" ? "opacity-70" : ""}`}
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className={`h-9 w-9 rounded-xl bg-secondary/60 flex flex-col items-center justify-center`}>
              <span className={`text-[8px] font-bold uppercase leading-none ${config.iconColor}`}>
                {format(eventDate, "MMM")}
              </span>
              <span className="text-sm font-bold text-foreground leading-none mt-px">
                {format(eventDate, "d")}
              </span>
            </div>
            {event.phone && (
              <Phone className="h-3 w-3 text-muted-foreground/50" />
            )}
          </div>
          <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">
            {event.title}
          </h3>
          {aiInsight && (
            <div className="mt-2 flex items-center gap-1.5 p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Lightbulb className="h-3 w-3 text-primary flex-shrink-0" />
              <span className="text-[9px] text-primary font-medium line-clamp-1">
                {aiInsight.icon} {aiInsight.text}
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {dateLabel}{event.time ? ` \u00B7 ${event.time}` : ""}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate">{event.location}</span>
            </div>
          )}
        </div>
      </button>
      {priority === "past" && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(event.id)
          }}
          className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-destructive/15 hover:bg-destructive/25 flex items-center justify-center transition-colors"
          aria-label={t("delete")}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      )}
    </div>
  )
}
