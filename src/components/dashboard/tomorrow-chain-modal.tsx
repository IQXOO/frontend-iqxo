"use client"

import { useMemo, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Stethoscope, FileText, Wrench, Zap, Clock, MapPin, ArrowDown, Calendar } from "lucide-react"
import { useApp } from "@/lib/store"
import { isTomorrow, format } from "date-fns"
import type { IQXOEvent } from "@/lib/types"

// --- Types ---
interface TomorrowChainModalProps {
  open: boolean
  onClose: () => void
}

// --- Helpers ---
function getEventIcon(title: string) {
  const lower = title.toLowerCase()
  if (lower.includes("doctor") || lower.includes("médecin") || lower.includes("clinic") || lower.includes("طبيب") || lower.includes("عيادة"))
    return <Stethoscope className="h-5 w-5" />
  if (lower.includes("insurance") || lower.includes("assurance") || lower.includes("تأمين") || lower.includes("document"))
    return <FileText className="h-5 w-5" />
  if (lower.includes("car") || lower.includes("voiture") || lower.includes("سيارة") || lower.includes("service"))
    return <Wrench className="h-5 w-5" />
  return <Zap className="h-5 w-5" />
}

function getUrgencyColor(event: IQXOEvent): "red" | "orange" | "green" {
  if (!event.date) return "green"
  const diffMs = new Date(event.date).getTime() - Date.now()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return "red"
  if (diffDays <= 1) return "red"
  if (diffDays <= 3) return "orange"
  return "green"
}

function getPrepTips(event: IQXOEvent, language: string): string[] {
  const lower = event.title.toLowerCase()
  const tips: string[] = []
  if (lower.includes("doctor") || lower.includes("médecin") || lower.includes("طبيب") || lower.includes("clinic")) {
    if (language === "ar") tips.push("احضر بطاقة التأمين والوصفة القديمة")
    else if (language === "fr") tips.push("Apporte ta carte d'assurance et ancienne ordonnance")
    else tips.push("Bring insurance card and old prescription")
  }
  if (lower.includes("car") || lower.includes("voiture") || lower.includes("سيارة")) {
    if (language === "ar") tips.push("احضر رخصة القيادة والهوية")
    else if (language === "fr") tips.push("Prends ton permis de conduire et ta carte ID")
    else tips.push("Bring your car license and ID")
  }
  if (lower.includes("insurance") || lower.includes("assurance") || lower.includes("تأمين")) {
    if (language === "ar") tips.push("احضر جميع المستندات اللازمة")
    else if (language === "fr") tips.push("Apporte tous les documents nécessaires")
    else tips.push("Bring all required documents")
  }
  if (event.location) {
    if (language === "ar") tips.push(`التنقل إلى: ${event.location}`)
    else if (language === "fr") tips.push(`Trajet vers : ${event.location}`)
    else tips.push(`Travel to: ${event.location}`)
  }
  if (event.notes) tips.push(event.notes.slice(0, 60) + (event.notes.length > 60 ? "…" : ""))
  if (tips.length === 0) {
    if (language === "ar") tips.push("خصص وقتاً كافياً للتحضير")
    else if (language === "fr") tips.push("Prends le temps de bien te préparer")
    else tips.push("Allow enough time to prepare")
  }
  return tips.slice(0, 2)
}

// --- Mock tomorrow events (shown when no real events exist tomorrow) ---
const MOCK_EVENTS: IQXOEvent[] = [
  { 
    id: "m1", 
    title: "موعد الطبيب", 
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0], 
    time: "10:00", 
    location: "عيادة النور، شارع الجامعة", 
    notes: "فحص دوري", 
    phone: "", 
    source: "manual",
    is_done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: "m2", 
    title: "تجديد التأمين", 
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0], 
    time: "12:30", 
    location: "مكتب التأمين الوطني", 
    notes: "احضر وثيقة السيارة", 
    phone: "", 
    source: "manual",
    is_done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: "m3", 
    title: "خدمة السيارة", 
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0], 
    time: "15:00", 
    location: "مركز الصيانة", 
    notes: "تغيير الزيت + فحص الفرامل", 
    phone: "", 
    source: "manual",
    is_done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
]

// --- Typewriter hook ---
function useTypewriter(text: string, speed = 50, start = false) {
  const [displayed, setDisplayed] = useState("")
  useEffect(() => {
    if (!start) { setDisplayed(""); return }
    setDisplayed("")
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, start])
  return displayed
}

// --- Sparkle particle (CSS-only, no lib) ---
function SparkleParticle({ angle, delay }: { angle: number; delay: number }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full bg-blue-300 pointer-events-none"
      style={{ top: "50%", left: "50%", originX: "50%", originY: "50%" }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: Math.cos(angle) * 36,
        y: Math.sin(angle) * 36,
        opacity: 0,
        scale: 0,
      }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    />
  )
}

// --- Main FAB + Modal export ---
export function TomorrowChainFAB() {
  const [open, setOpen] = useState(false)
  const [tapped, setTapped] = useState(false)

  const handleTap = () => {
    setTapped(true)
    setTimeout(() => setTapped(false), 600)
    setOpen(true)
  }

  const sparkleAngles = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8)

  return (
    <>
      {/* Tomorrow FAB - positioned above mic button with gap-5 */}
      <div className="fixed bottom-48 right-4 z-50">
        <motion.button
          aria-label="What's on tomorrow?"
          onClick={handleTap}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 shadow-xl shadow-blue-500/40 flex items-center justify-center overflow-visible border border-white/20"
          whileHover={{ scale: 1.08, boxShadow: "0 0 32px 8px rgba(56,189,248,0.4)" }}
          whileTap={{ scale: 1.15, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          {/* Glow pulse ring on tap */}
          <AnimatePresence>
            {tapped && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-sky-300/70 pointer-events-none"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* Sparkle burst particles */}
          <AnimatePresence>
            {tapped && sparkleAngles.map((angle, i) => (
              <SparkleParticle key={i} angle={angle} delay={i * 0.03} />
            ))}
          </AnimatePresence>

          {/* Calendar icon - larger for w-16 button */}
          <Calendar className="w-7 h-7 text-white relative z-10" strokeWidth={2} />
        </motion.button>
      </div>

      <TomorrowChainModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

// --- Modal ---
export function TomorrowChainModal({ open, onClose }: TomorrowChainModalProps) {
  const { events, language } = useApp()
  const isRTL = language === "ar"

  const realTomorrowEvents = useMemo(() =>
    events
      .filter((e) => isTomorrow(new Date(e.date)))
      .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00")),
    [events]
  )

  // Use mock events when nothing is scheduled
  const tomorrowEvents = realTomorrowEvents.length > 0 ? realTomorrowEvents : MOCK_EVENTS

  const title = language === "ar"
    ? "بكرًا عندي إيه؟"
    : language === "fr"
      ? "Que se passe-t-il demain ?"
      : "What's on Tomorrow?"

  const displayedTitle = useTypewriter(title, 50, open)

  const totalHours = Math.round(tomorrowEvents.length * 1.5)
  const recommendation = language === "ar"
    ? "خذ نصف يوم إجازة إذا أمكن"
    : language === "fr"
      ? "Prends une demi-journée si possible"
      : "Block your morning for these"

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" dir={isRTL ? "rtl" : "ltr"}>
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="relative z-10 w-full max-w-lg rounded-t-[2rem] bg-blue-950/90 border border-white/[0.08] shadow-2xl shadow-blue-950/80 max-h-[88vh] overflow-hidden flex flex-col"
            style={{ backdropFilter: "blur(32px) saturate(1.6)" }}
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 30, duration: 0.5 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className={`flex items-start justify-between px-5 py-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div>
                {/* Typewriter title */}
                <h2 className="text-xl font-bold text-white min-h-[1.75rem] font-sans tracking-tight">
                  {displayedTitle}
                  <motion.span
                    className="inline-block w-0.5 h-5 bg-blue-400 ml-0.5 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                  />
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {format(new Date(Date.now() + 86400000), "EEEE, MMMM d")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="h-4 w-4 text-white/60" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2 pt-1">
              {tomorrowEvents.map((event, index) => (
                <div key={event.id}>
                  {/* Event card with staggered fade-in + bounce */}
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      delay: 0.25 + index * 0.15,
                      duration: 0.4,
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    }}
                  >
                    <ChainEventCard event={event} language={language} isRTL={isRTL} />
                  </motion.div>

                  {/* Connector */}
                  {index < tomorrowEvents.length - 1 && (
                    <motion.div
                      className="flex justify-center py-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + index * 0.15 }}
                    >
                      <ArrowDown className="h-4 w-4 text-blue-500/30" />
                    </motion.div>
                  )}
                </div>
              ))}

              {/* Summary bar */}
              <motion.div
                className="mt-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 flex items-center justify-between gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + tomorrowEvents.length * 0.15 + 0.1 }}
              >
                <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <span className="text-xs text-blue-300">
                    {language === "ar" ? `~${totalHours} ساعات` : language === "fr" ? `~${totalHours}h dehors` : `~${totalHours}h out`}
                  </span>
                </div>
                <span className={`text-xs text-white/40 ${isRTL ? "text-right" : "text-right"}`}>{recommendation}</span>
              </motion.div>

              {/* Trailing sparkles */}
              <motion.div
                className="flex justify-center gap-3 pt-2 pb-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + tomorrowEvents.length * 0.15 + 0.25 }}
              >
                {["✦", "✧", "✦"].map((s, i) => (
                  <motion.span
                    key={i}
                    className="text-blue-400/50 text-xs"
                    animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                  >
                    {s}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// --- Chain Event Card ---
function ChainEventCard({ event, language, isRTL }: { event: IQXOEvent; language: string; isRTL: boolean }) {
  const prepTips = getPrepTips(event, language)
  const urgency = getUrgencyColor(event)

  const urgencyStyles = {
    red: {
      border: "border-red-500/50",
      glow: "shadow-red-500/20",
      dot: "bg-red-400",
      pulse: true,
      time: "text-red-400",
    },
    orange: {
      border: "border-orange-400/40",
      glow: "shadow-orange-500/15",
      dot: "bg-orange-400",
      pulse: false,
      time: "text-orange-400",
    },
    green: {
      border: "border-blue-500/30",
      glow: "shadow-blue-500/10",
      dot: "bg-blue-400",
      pulse: false,
      time: "text-blue-400",
    },
  }[urgency]

  return (
    <motion.div
      className={`rounded-2xl bg-white/[0.05] border ${urgencyStyles.border} backdrop-blur-sm p-4 space-y-2.5 shadow-lg ${urgencyStyles.glow}`}
      animate={
        urgency === "red"
          ? { boxShadow: ["0 0 0px rgba(239,68,68,0.2)", "0 0 18px rgba(239,68,68,0.35)", "0 0 0px rgba(239,68,68,0.2)"] }
          : {}
      }
      transition={urgency === "red" ? { repeat: Infinity, duration: 2.2 } : {}}
    >
      {/* Title row */}
      <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Urgency dot */}
        <div className="relative flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${urgencyStyles.dot}`} />
          {urgencyStyles.pulse && (
            <div className={`absolute inset-0 rounded-full ${urgencyStyles.dot} opacity-60 animate-ping`} />
          )}
        </div>

        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400">
          {getEventIcon(event.title)}
        </div>

        {/* Title + time */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-white/90 truncate">{event.title}</h3>
          {event.time && (
            <p className={`text-xl font-bold tabular-nums leading-tight ${urgencyStyles.time}`}>{event.time}</p>
          )}
        </div>
      </div>

      {/* Location */}
      {event.location && (
        <div className={`flex items-center gap-1.5 text-xs text-white/40 ${isRTL ? "flex-row-reverse" : ""}`}>
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      )}

      {/* Prep tips */}
      {prepTips.length > 0 && (
        <div className="space-y-1.5 pt-1.5 border-t border-white/5">
          {prepTips.map((tip, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs text-white/50 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
              <span className="text-blue-400 font-semibold mt-0.5 flex-shrink-0">→</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
