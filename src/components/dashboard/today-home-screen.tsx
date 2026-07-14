"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Coffee, Phone, MapPin } from "lucide-react"
import { useApp } from "@/lib/store"
import { TomorrowChainFAB } from "@/components/dashboard/tomorrow-chain-modal"
import type { IQXOEvent } from "@/lib/types"
import { format, isToday, differenceInHours, isPast } from "../../lib/date-utils"

interface TodayHomeScreenProps {
  onEventClick: (event: IQXOEvent) => void
  onFabClick: () => void
}

type UrgencyLevel = "expired" | "urgent" | "soon" | "safe"

function getUrgencyLevel(date: string, time: string): UrgencyLevel {
  const eventDateTime = new Date(`${date}T${time || "23:59"}`)
  if (isPast(eventDateTime)) return "expired"
  const hoursUntil = differenceInHours(eventDateTime, new Date())
  if (hoursUntil < 24) return "urgent"
  if (hoursUntil < 72) return "soon"
  return "safe"
}

const URGENCY_STYLES: Record<UrgencyLevel, { bar: string; badge: string; badgeText: string; shadow: string }> = {
  expired: {
    bar: "bg-red-500",
    badge: "bg-red-500/15 text-red-300 border-red-500/30",
    badgeText: "منتهي",
    shadow: "shadow-red-900/20",
  },
  urgent: {
    bar: "bg-red-400",
    badge: "bg-red-400/15 text-red-300 border-red-400/30",
    badgeText: "عاجل",
    shadow: "shadow-red-900/20",
  },
  soon: {
    bar: "bg-orange-400",
    badge: "bg-orange-400/15 text-orange-300 border-orange-400/30",
    badgeText: "قريباً",
    shadow: "shadow-orange-900/10",
  },
  safe: {
    bar: "bg-blue-400",
    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    badgeText: "مرتاح",
    shadow: "shadow-blue-900/20",
  },
}

export function TodayHomeScreen({ onEventClick, onFabClick: _onFabClick }: TodayHomeScreenProps) {
  const { events, language } = useApp()

  const todayEvents = useMemo(() =>
    events
      .filter((e) => isToday(new Date(e.date)))
      .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00")),
    [events]
  )

  const isRTL = language === "ar"
  const today = format(new Date(), "EEEE, MMMM d")

  const emptyMessage =
    language === "ar"
      ? "النهارده حرية كاملة"
      : language === "fr"
        ? "Journée libre aujourd'hui"
        : "You're free today"

  const emptySubtext =
    language === "ar"
      ? "مفيش حاجة على الأجندة. استمتع بيومك 😌"
      : language === "fr"
        ? "Rien au programme. Profite de ta journée 😌"
        : "Nothing on the agenda. Enjoy your day 😌"

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-160px)]" dir={isRTL ? "rtl" : "ltr"}>
      {/* Ambient background glow blobs */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-blue-600/10 blur-[80px]" />
      <div className="pointer-events-none absolute top-1/2 -right-16 w-56 h-56 rounded-full bg-blue-400/8 blur-[70px]" />

      {/* Date header */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-xs font-medium text-blue-300/60 uppercase tracking-widest">{today}</p>
        <h1 className="text-2xl font-bold text-white mt-1 tracking-tight">
          {language === "ar" ? "اليوم" : language === "fr" ? "Aujourd'hui" : "Today"}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-32">
        {todayEvents.length === 0 ? (
          /* ---- Empty state ---- */
          <motion.div
            className="flex flex-col items-center justify-center min-h-[380px] text-center px-6"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Glass circle illustration */}
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
                <Coffee className="w-11 h-11 text-blue-300/70" strokeWidth={1.5} />
              </div>
              {/* Outer soft ring */}
              <div className="absolute -inset-3 rounded-full border border-blue-400/10" />
              <div className="absolute -inset-6 rounded-full border border-blue-400/5" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2 leading-snug">
              {emptyMessage}
            </h2>
            <p className="text-sm text-blue-200/50 max-w-[220px] leading-relaxed">
              {emptySubtext}
            </p>
          </motion.div>
        ) : (
          /* ---- Event cards ---- */
          <div className="space-y-3 mt-2">
            {todayEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.07, duration: 0.35, type: "spring", stiffness: 260, damping: 22 }}
              >
                <TodayEventCard event={event} onClick={() => onEventClick(event)} isRTL={isRTL} language={language} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Tomorrow FAB — self-contained with modal */}
      <TomorrowChainFAB />
    </div>
  )
}

// ---- Event Card ----
function TodayEventCard({
  event,
  onClick,
  isRTL,
  language,
}: {
  event: IQXOEvent
  onClick: () => void
  isRTL: boolean
  language: string
}) {
  const urgency = getUrgencyLevel(event.date, event.time)
  const styles = URGENCY_STYLES[urgency]
  const isPulsing = urgency === "urgent" || urgency === "expired"

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.015, y: -1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      className={`
        w-full text-${isRTL ? "right" : "left"}
        rounded-3xl overflow-hidden
        bg-white/[0.07] border border-white/[0.09]
        backdrop-blur-xl
        shadow-lg ${styles.shadow}
        transition-shadow
      `}
    >
      {/* Urgency glow on urgent events */}
      {isPulsing && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{ opacity: [0, 0.12, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          style={{ background: urgency === "expired" || urgency === "urgent" ? "radial-gradient(circle at 20% 50%, rgba(239,68,68,0.3), transparent 70%)" : undefined }}
        />
      )}

      <div className="relative flex items-stretch gap-0">
        {/* Left urgency bar */}
        <div className={`w-1 flex-shrink-0 ${styles.bar} rounded-l-3xl`} />

        {/* Card body */}
        <div className="flex-1 px-4 py-4">
          {/* Top row: time + badge */}
          <div className={`flex items-center justify-between mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
              {event.time || (language === "ar" ? "طول اليوم" : "All day")}            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}>
              {styles.badgeText}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-white/90 leading-snug mb-1">
            {event.title}
          </h3>

          {/* Notes */}
          {event.notes && (
            <p className="text-xs text-white/40 line-clamp-2 leading-relaxed mb-2">
              {event.notes}
            </p>
          )}

          {/* Meta row */}
          {(event.location || event.phone) && (
            <div className={`flex items-center gap-4 mt-1 ${isRTL ? "flex-row-reverse" : ""}`}>
              {event.location && (
                <span className="flex items-center gap-1.5 text-xs text-blue-300/60">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{event.location}</span>
                </span>
              )}
              {event.phone && (
                <span className="flex items-center gap-1.5 text-xs text-blue-300/60">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span>{event.phone}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  )
}
