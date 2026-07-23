"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Compass, TrendingUp, ChevronRight, Clock, MapPin, Calendar } from "lucide-react"
import { useApp } from "../../lib/store"
import { toEndOfMonthStr, parseLocalDate, format } from "../../lib/store"
import { supabase } from "../../lib/supabase"
import type { IQXOEvent } from "../../lib/types"
import { FutureExplorerSkeleton } from "./skeleton"

interface FutureExplorerViewProps {
  onEventClick: (event: IQXOEvent) => void
}

interface MonthGroup {
  key: string // e.g. "2026-08"
  year: number
  month: number
  label: string
  events: IQXOEvent[]
}

function rowToEvent(row: Record<string, string | boolean | null | undefined>): IQXOEvent {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    notes: (row.notes as string) ?? "",
    date: row.date as string,
    time: (row.time as string) ?? "",
    phone: (row.phone as string) ?? undefined,
    location: (row.location as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    source: (row.source as string) ?? "manual",
    image_url: (row.image_url as string) ?? undefined,
    pdf_url: (row.pdf_url as string) ?? undefined,
    is_done: (row.is_done as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

const DOT_PALETTE = ["bg-purple-400", "bg-primary", "bg-emerald-400", "bg-amber-400", "bg-rose-400"]

export function FutureExplorerView({ onEventClick }: FutureExplorerViewProps) {
  const { user, language, t } = useApp()
  const isRTL = language === "ar"

  const [futureEvents, setFutureEvents] = useState<IQXOEvent[]>([])
  const [loadingFuture, setLoadingFuture] = useState(true)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user?.id) return

    const fetchFutureEvents = async () => {
      setLoadingFuture(true)
      try {
        // جلب الأحداث التي تبدأ من أول الشهر القادم وما بعده
        const startStr = toEndOfMonthStr()
        const { data, error } = await supabase
          .from("events")
          .select(
            "id,user_id,title,notes,date,time,phone,location,email,source,image_url,pdf_url,is_done,created_at,updated_at"
          )
          .eq("user_id", user.id)
          .gt("date", startStr) // بعد آخر يوم في الشهر الحالي (من بداية الشهر القادم)
          .not("source", "eq", "work_schedule")
          .not("source", "eq", "work_schedule_virtual")
          .order("date", { ascending: true })
          .limit(300)

        if (error) throw error

        setFutureEvents((data ?? []).map(rowToEvent))
      } catch (err) {
        console.error("FutureExplorerView: failed to load future events", err)
      } finally {
        setLoadingFuture(false)
      }
    }

    fetchFutureEvents()
  }, [user?.id])

  if (loadingFuture) return <FutureExplorerSkeleton weeks={2} />

  // Group events by Month (Year-Month)
  const groupedMap: Record<string, { year: number; month: number; events: IQXOEvent[] }> = {}

  futureEvents.forEach((event) => {
    const d = parseLocalDate(event.date)
    const year = d.getFullYear()
    const month = d.getMonth()
    const key = `${year}-${String(month + 1).padStart(2, "0")}`

    if (!groupedMap[key]) {
      groupedMap[key] = { year, month, events: [] }
    }
    groupedMap[key].events.push(event)
  })

  // Sort months chronologically
  const monthGroups: MonthGroup[] = Object.keys(groupedMap)
    .sort()
    .map((key) => {
      const { year, month, events } = groupedMap[key]
      const dateObj = new Date(year, month, 1)
      const label = dateObj.toLocaleDateString(
        language === "ar" ? "ar-EG" : language === "fr" ? "fr-FR" : "en-US",
        { month: "long", year: "numeric" }
      )
      return { key, year, month, label, events }
    })

  const isMonthOpen = (key: string, idx: number) => {
    if (openMonths[key] !== undefined) return openMonths[key]
    return idx === 0 // افتراضياً أول شهر مفتوح
  }

  const toggleMonth = (key: string, idx: number) => {
    const currentState = isMonthOpen(key, idx)
    setOpenMonths((prev) => ({ ...prev, [key]: !currentState }))
  }

  if (futureEvents.length === 0) {
    return (
      <div className="px-5 py-12 flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-3xl bg-secondary/60 flex items-center justify-center">
          <Compass className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground">
            {language === "ar"
              ? "لا توجد مواعيد مستقبلية من الشهر القادم"
              : language === "fr"
              ? "Aucun événement à partir du mois prochain"
              : "No upcoming events from next month"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar"
              ? "ابدأ بتخطيط مواعيدك للشهر القادم والأشهر التالية"
              : language === "fr"
              ? "Planifiez vos événements pour les mois à venir"
              : "Start planning ahead for upcoming months"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-6 space-y-4">

      {monthGroups.map((group, groupIdx) => {
        const isOpen = isMonthOpen(group.key, groupIdx)
        const displayedDots = group.events.slice(0, 5)

        return (
          <motion.div
            key={group.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.06, duration: 0.25 }}
            className="glass rounded-2xl border border-border/40 overflow-hidden shadow-lg transition-all duration-200 hover:border-primary/30"
          >
            {/* Category Header Bar (Matching screenshot design + IQXO app style) */}
            <button
              onClick={() => toggleMonth(group.key, groupIdx)}
              className={`w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-secondary/40 via-secondary/15 to-transparent hover:bg-secondary/60 transition-colors cursor-pointer group select-none ${
                isRTL ? "flex-row-reverse text-right" : "text-left"
              }`}
            >
              {/* Arrow + Month Title */}
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all shrink-0">
                  <motion.div
                    animate={{ rotate: isOpen ? 90 : isRTL ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </div>
                <span className="text-sm font-semibold text-foreground tracking-tight capitalize">
                  {group.label}
                </span>
              </div>

              {/* Indicator Dots + Count Badge */}
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {displayedDots.map((_, dotIdx) => (
                    <span
                      key={dotIdx}
                      className={`w-2.5 h-2.5 rounded-full ${DOT_PALETTE[dotIdx % DOT_PALETTE.length]} shadow-sm`}
                    />
                  ))}
                </div>

                {/* Pill count badge */}
                <span className="rounded-full bg-primary/15 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {group.events.length} {language === "ar" ? "عنصر" : language === "fr" ? "éléments" : "items"}
                </span>
              </div>
            </button>

            {/* Collapsible Events List */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2 border-t border-border/30 bg-background/30">
                    {group.events.map((event, idx) => {
                      const eventDate = parseLocalDate(event.date)
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => onEventClick(event)}
                          className={`glass rounded-xl p-3 flex items-center gap-3 justify-between transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group bg-secondary/30 hover:bg-secondary/60 border border-border/30 cursor-pointer ${
                            isRTL ? "flex-row-reverse text-right" : "text-left"
                          }`}
                        >
                          {/* Date Block matching EventGridCard style */}
                          <div className="h-10 w-10 rounded-xl bg-secondary/80 flex flex-col items-center justify-center shrink-0 border border-border/40">
                            <span className="text-[9px] font-bold uppercase leading-none text-primary">
                              {dateObjToMonth(eventDate, language)}
                            </span>
                            <span className="text-sm font-bold text-foreground leading-none mt-0.5">
                              {eventDate.getDate()}
                            </span>
                          </div>

                          {/* Event info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {event.title}
                            </p>
                            <div className={`flex items-center gap-3 mt-1 text-xs text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
                              {event.time && (
                                <span className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span>{event.time}</span>
                                </span>
                              )}
                              {event.location && (
                                <span className={`flex items-center gap-1 truncate max-w-[140px] ${isRTL ? "flex-row-reverse" : ""}`}>
                                  <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Chevron icon */}
                          <ChevronRight className={`w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0 ${isRTL ? "rotate-180" : ""}`} />
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}

      {/* Footer Trend Summary */}
      <div className={`px-2 py-2 flex items-center justify-between text-xs text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
          <span>
            {language === "ar"
              ? `${futureEvents.length} مواعيد مقبلة موزعة على ${monthGroups.length} أشهر`
              : language === "fr"
              ? `${futureEvents.length} événements répartis sur ${monthGroups.length} mois`
              : `${futureEvents.length} upcoming events across ${monthGroups.length} months`}
          </span>
        </div>
      </div>
    </div>
  )
}

function dateObjToMonth(d: Date, lang: string): string {
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : lang === "fr" ? "fr-FR" : "en-US", { month: "short" })
}
