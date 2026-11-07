"use client"

import { useMemo } from "react"
import { useApp } from "@/lib/store"
import { categorizeEvent } from "@/lib/event-category"

export interface BentoChartProps {
  totalTasks?: number;
  thisWeekCount?: number;
  documentsCount?: number;
}

export function BentoChart({ totalTasks, thisWeekCount, documentsCount }: BentoChartProps = {}) {
  const { events, language } = useApp()

  // Real events excluding virtual and work schedule shifts
  const realEvents = useMemo(() => {
    return events.filter(
      (e) => e.source !== "work_schedule" && e.source !== "work_schedule_virtual"
    )
  }, [events])

  // Calculate statistics for the current week (Sunday to Saturday)
  const thisWeekEvents = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    return realEvents.filter((e) => {
      const eventDate = new Date(e.date)
      return eventDate >= weekStart && eventDate < weekEnd
    })
  }, [realEvents])

  // Categorize events reliably with full Arabic, French, and English support
  const categories = useMemo(() => {
    let docs = 0
    let health = 0
    let work = 0
    let personal = 0
    let other = 0

    for (const e of realEvents) {
      const cat = categorizeEvent(e)
      if (cat === "documents") docs++
      else if (cat === "health") health++
      else if (cat === "work") work++
      else if (cat === "personal") personal++
      else other++
    }

    const finalDocs = Math.max(docs, documentsCount ?? 0)
    const effectiveTotal = Math.max(totalTasks ?? realEvents.length, finalDocs + health + work + personal + other)
    const finalOther = Math.max(0, effectiveTotal - (finalDocs + health + work + personal))

    return {
      documents: finalDocs,
      health,
      work,
      personal,
      other: finalOther,
    }
  }, [realEvents, documentsCount, totalTasks])

  const maxValue = Math.max(...Object.values(categories), 1)
  const finalTotalTasks = totalTasks ?? realEvents.length
  const finalThisWeekCount = thisWeekCount ?? thisWeekEvents.length

  const chartItems = [
    {
      label: language === "ar" ? "المستندات" : language === "fr" ? "Documents" : "Documents",
      value: categories.documents,
      color: "from-blue-500/40 to-blue-600/20",
      icon: "📋",
    },
    {
      label: language === "ar" ? "الصحة" : language === "fr" ? "Santé" : "Health",
      value: categories.health,
      color: "from-emerald-500/40 to-emerald-600/20",
      icon: "🏥",
    },
    {
      label: language === "ar" ? "العمل" : language === "fr" ? "Travail" : "Work",
      value: categories.work,
      color: "from-cyan-500/40 to-cyan-600/20",
      icon: "💼",
    },
    {
      label: language === "ar" ? "شخصي" : language === "fr" ? "Personnel" : "Personal",
      value: categories.personal,
      color: "from-purple-500/40 to-purple-600/20",
      icon: "👤",
    },
    {
      label: language === "ar" ? "أخرى" : language === "fr" ? "Autre" : "Other",
      value: categories.other,
      color: "from-amber-500/40 to-amber-600/20",
      icon: "📌",
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {language === "ar" ? "تقدم التنظيم" : language === "fr" ? "Progrès d'organisation" : "Organization Progress"}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {language === "ar" ? "توزيع المهام حسب الفئة" : language === "fr" ? "Répartition des tâches par catégorie" : "Tasks by category"}
        </p>
      </div>

      <div className="space-y-4">
        {chartItems.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                <span>{item.icon}</span>
                {item.label}
              </span>
              <span className="text-xs font-mono font-semibold text-foreground">{item.value}</span>
            </div>
            <div className="h-8 rounded-lg bg-secondary/50 overflow-hidden backdrop-blur-sm border border-border/50">
              <div
                className={`h-full bg-gradient-to-r ${item.color} transition-all duration-500 flex items-center px-3`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              >
                {item.value > 0 && (
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                    {item.value}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border/50">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-secondary/30 backdrop-blur-sm border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">
              {language === "ar" ? "إجمالي المهام" : language === "fr" ? "Total des tâches" : "Total Tasks"}
            </p>
            <p className="text-2xl font-bold text-foreground">{finalTotalTasks}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 backdrop-blur-sm border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">
              {language === "ar" ? "هذا الأسبوع" : language === "fr" ? "Cette semaine" : "This Week"}
            </p>
            <p className="text-2xl font-bold text-foreground">{finalThisWeekCount}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
