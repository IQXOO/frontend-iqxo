"use client"

import { motion } from "framer-motion"
import { Compass, CalendarDays, TrendingUp } from "lucide-react"
import { useApp } from "@/lib/store"
import { toLocalDateStr, parseLocalDate } from "@/lib/store"
import type { IQXOEvent } from "@/lib/types"

interface FutureExplorerViewProps {
  onEventClick: (event: IQXOEvent) => void
}

export function FutureExplorerView({ onEventClick }: FutureExplorerViewProps) {
  const { events, t, language } = useApp()
  const isRTL = language === "ar"

  // Events starting from day-after-tomorrow (LOCAL timezone)
  const dayAfterTomorrow = new Date()
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
  const dayAfterTomorrowStr = toLocalDateStr(dayAfterTomorrow)

  const futureEvents = events
    .filter((e) => e.date >= dayAfterTomorrowStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Group by week (week = Monday-based, keyed by week-start LOCAL date)
  const groupedByWeek: Record<string, IQXOEvent[]> = {}
  futureEvents.forEach((event) => {
    const date = parseLocalDate(event.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = toLocalDateStr(weekStart)
    if (!groupedByWeek[weekKey]) groupedByWeek[weekKey] = []
    groupedByWeek[weekKey].push(event)
  })

  if (futureEvents.length === 0) {
    return (
      <div className="px-5 py-12 flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-3xl bg-purple-500/10 flex items-center justify-center">
          <Compass className="h-10 w-10 text-purple-400/50" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground">
            {language === "ar" ? "لا خطط مستقبلية" : "The future is blank"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar" ? "ابدأ بتخطيط شيء ما" : "Start planning ahead"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-6 space-y-6">
      {Object.entries(groupedByWeek).map(([weekKey, weekEvents], weekIdx) => (
        <motion.div
          key={weekKey}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: weekIdx * 0.15, duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3 px-2">
            <CalendarDays className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-muted-foreground">
              {new Date(weekKey).toLocaleDateString(language === "ar" ? "ar-EG" : language === "fr" ? "fr-FR" : "en-US", {
                month: "short",
                day: "numeric",
              })}
            </h4>
          </div>
          <div className="space-y-2">
            {weekEvents.map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onEventClick(event)}
                className="glass rounded-xl p-3 cursor-pointer transition-all hover:bg-white/10 active:scale-95"
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </p>
                {event.time && (
                  <p className="text-xs text-muted-foreground mt-1">{event.time}</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Trend indicator */}
      <div className="px-2 py-4 flex items-center gap-2 text-xs text-muted-foreground">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <span>
          {language === "ar"
            ? `${futureEvents.length} مواعيد في الأفق`
            : `${futureEvents.length} upcoming events`}
        </span>
      </div>
    </div>
  )
}
