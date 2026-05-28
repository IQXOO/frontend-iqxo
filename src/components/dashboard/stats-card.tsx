"use client"

import { motion } from "framer-motion"
import { Zap, Calendar, Flame, Clock, Hourglass, Brain, Sparkles } from "lucide-react"
import { useApp } from "@/lib/store"
import { getSmartGreeting, computeCriticalityScore } from "@/lib/ai-insights"

export function StatsCard() {
  const { events, user, getEventsByPriority, t, language } = useApp()

  const urgentCount = getEventsByPriority("urgent").length
  const upcomingCount = getEventsByPriority("upcoming").length
  const laterCount = getEventsByPriority("later").length
  const displayName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name?.trim() ||
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name?.trim() ||
    user?.email?.split("@")[0] ||
    (language === "ar" ? "صديقي" : "there")
  const smartGreeting = getSmartGreeting(displayName, events)

  // Get top 3 critical items for highlighting
  const criticalItems = events
    .map((e) => ({ ...e, criticality: computeCriticalityScore(e) }))
    .filter((e) => e.criticality >= 40)
    .sort((a, b) => b.criticality - a.criticality)
    .slice(0, 3)

  return (
    <section className="px-5 py-2 space-y-3">
      {/* Life Summary Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/20 via-blue-500/10 to-purple-500/10 glass p-4 border border-primary/20 relative overflow-hidden"
      >
        {/* Decorative glow */}
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
        <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-primary/30 flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
              {language === "ar" ? "مساعدك الذكي" : "AI Assistant"}
            </span>
          </div>
          
          <p className="text-sm font-semibold text-foreground leading-relaxed mb-3">
            {smartGreeting}
          </p>

          {/* Critical Items Highlight */}
          {criticalItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-medium">
                {language === "ar" ? "العناصر التي تحتاج انتباهك:" : "Items that need your attention:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {criticalItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/15 border border-destructive/30"
                  >
                    <Sparkles className="h-3 w-3 text-destructive" />
                    <span className="text-[11px] font-medium text-destructive truncate max-w-[120px]">
                      {item.title}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground tracking-wide">
          {t("statsTitle")}
        </h2>
        <div className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold text-primary">
            {t("auto")}
          </span>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground font-mono">
              {events.length}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
              {t("totalEvents")}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-xl bg-destructive/15 flex items-center justify-center relative">
              <Flame className="h-5 w-5 text-destructive" />
              {urgentCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                  {urgentCount}
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-foreground font-mono">
              {urgentCount}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
              {t("urgentCount")}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-xl bg-chart-4/15 flex items-center justify-center">
              <Clock className="h-5 w-5 text-chart-4" />
            </div>
            <span className="text-xl font-bold text-foreground font-mono">
              {upcomingCount}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
              {t("upcomingCount")}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <Hourglass className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground font-mono">
              {laterCount}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
              {t("laterCount")}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            {t("smartInsight")}
          </p>
        </div>
      </div>
    </section>
  )
}
