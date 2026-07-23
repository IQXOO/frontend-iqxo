"use client"

import { motion } from "framer-motion"
import { Zap, MapPin, Phone, Clock, ChevronRight } from "lucide-react"
import { useApp } from "../../lib/store"
import { toLocalDateStr, parseLocalDate } from "../../lib/store"
import type { IQXOEvent } from "../../lib/types"
import { TomorrowSkeleton } from "./skeleton"

interface TomorrowViewProps {
  onEventClick: (event: IQXOEvent) => void
}

export function TomorrowView({ onEventClick }: TomorrowViewProps) {
  const { events, language, loading } = useApp()
  const isRTL = language === "ar"

  if (loading) return <TomorrowSkeleton count={3} />

  // Get tomorrow's date in LOCAL timezone (avoids UTC-shift bugs)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDateStr = toLocalDateStr(tomorrow)

  // Filter events for tomorrow (exclude work schedule events)
  const tomorrowEvents = events.filter(
    (e) =>
      e.date === tomorrowDateStr &&
      e.source !== "work_schedule" &&
      e.source !== "work_schedule_virtual"
  )

  if (tomorrowEvents.length === 0) {
    return (
      <div className="px-5 py-12 flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-3xl bg-secondary/60 flex items-center justify-center">
          <Zap className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground">
            {language === "ar"
              ? "لا مواعيد غداً"
              : language === "fr"
              ? "Rien de prévu pour demain"
              : "All clear for tomorrow"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar"
              ? "استمتع براحتك اليوم"
              : language === "fr"
              ? "Profitez de votre journée"
              : "Enjoy your peace today"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-6 space-y-4">
      {/* Header section title matching app style */}
      <div className={`flex items-center justify-between px-1 mb-2.5 ${isRTL ? "flex-row-reverse" : ""}`}>
        <h2 className="text-sm font-semibold text-foreground tracking-wide">
          {language === "ar" ? "مواعيد غداً" : language === "fr" ? "Événements de demain" : "Tomorrow's Schedule"}
        </h2>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          {tomorrowEvents.length} {language === "ar" ? "أحداث" : language === "fr" ? "événements" : "events"}
        </span>
      </div>

      <div className="space-y-2.5">
        {tomorrowEvents.map((event, idx) => {
          const eventDate = parseLocalDate(event.date)
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              onClick={() => onEventClick(event)}
              className={`glass rounded-xl p-3.5 flex items-center gap-3.5 justify-between transition-all duration-200 hover:bg-secondary/60 hover:scale-[1.01] active:scale-[0.99] border border-border/40 cursor-pointer group shadow-sm ${
                isRTL ? "flex-row-reverse text-right" : "text-left"
              }`}
            >
              {/* Date Block matching new card style */}
              <div className="h-11 w-11 rounded-xl bg-secondary/80 flex flex-col items-center justify-center shrink-0 border border-border/50">
                <span className="text-[9px] font-bold uppercase leading-none text-primary">
                  {dateObjToMonth(eventDate, language)}
                </span>
                <span className="text-sm font-bold text-foreground leading-none mt-0.5">
                  {eventDate.getDate()}
                </span>
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {event.title}
                </p>
                <div className={`flex items-center gap-3.5 mt-1 text-xs text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
                  {event.time && (
                    <span className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{event.time}</span>
                    </span>
                  )}
                  {event.location && (
                    <span className={`flex items-center gap-1 truncate max-w-[130px] ${isRTL ? "flex-row-reverse" : ""}`}>
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </span>
                  )}
                  {event.phone && (
                    <span className={`flex items-center gap-1 truncate ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{event.phone}</span>
                    </span>
                  )}
                </div>
                {event.notes && (
                  <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">
                    {event.notes}
                  </p>
                )}
              </div>

              {/* Arrow Icon */}
              <ChevronRight className={`w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0 ${isRTL ? "rotate-180" : ""}`} />
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function dateObjToMonth(d: Date, lang: string): string {
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : lang === "fr" ? "fr-FR" : "en-US", { month: "short" })
}
