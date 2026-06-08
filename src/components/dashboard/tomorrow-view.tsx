"use client"

import { motion } from "framer-motion"
import { Zap, MapPin, Phone, Clock } from "lucide-react"
import { useApp } from "../../lib/store"
import { toLocalDateStr } from "../../lib/store"
import type { IQXOEvent } from "../../lib/types"

interface TomorrowViewProps {
  onEventClick: (event: IQXOEvent) => void
}

export function TomorrowView({ onEventClick }: TomorrowViewProps) {
  const { events, t, language } = useApp()
  const isRTL = language === "ar"

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
        <div className="h-20 w-20 rounded-3xl bg-blue-500/10 flex items-center justify-center">
          <Zap className="h-10 w-10 text-blue-400/50" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground">
            {language === "ar" ? "لا مواعيد غداً" : "All clear for tomorrow"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar" ? "استمتع براحتك اليوم" : "Enjoy your peace today"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-6 space-y-3">
      {tomorrowEvents.map((event, idx) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.4 }}
          onClick={() => onEventClick(event)}
          className="group glass rounded-2xl p-4 cursor-pointer transition-all hover:bg-white/10 active:scale-95"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {event.title}
              </h3>
              {event.time && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{event.time}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{event.phone}</span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
