"use client"

import { useApp } from "@/lib/store"

export function BentoChart() {
  const { events, language } = useApp()

  // Calculate statistics for the current week
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const thisWeekEvents = events.filter((e) => {
    const eventDate = new Date(e.date)
    return eventDate >= weekStart && eventDate <= weekEnd
  })

  // Categories
  const categories = {
    documents: events.filter((e) =>
      e.title.toLowerCase().includes("insurance") ||
      e.title.toLowerCase().includes("passport") ||
      e.title.toLowerCase().includes("visa") ||
      e.title.toLowerCase().includes("document") ||
      e.title.toLowerCase().includes("contract")
    ).length,
    health: events.filter((e) =>
      e.title.toLowerCase().includes("doctor") ||
      e.title.toLowerCase().includes("medical") ||
      e.title.toLowerCase().includes("health") ||
      e.title.toLowerCase().includes("appointment")
    ).length,
    personal: events.filter((e) =>
      e.title.toLowerCase().includes("meeting") ||
      e.title.toLowerCase().includes("event") ||
      e.title.toLowerCase().includes("party")
    ).length,
    other: thisWeekEvents.length -
      events.filter((e) =>
        e.title.toLowerCase().includes("insurance") ||
        e.title.toLowerCase().includes("passport") ||
        e.title.toLowerCase().includes("doctor") ||
        e.title.toLowerCase().includes("meeting")
      ).length,
  }

  const maxValue = Math.max(...Object.values(categories), 1)

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
      color: "from-red-500/40 to-red-600/20",
      icon: "🏥",
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
      color: "from-emerald-500/40 to-emerald-600/20",
      icon: "📌",
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {language === "ar" ? "تقدم التنظيم" : language === "fr" ? "Progrès d'organisation" : "Organization Progress"}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {language === "ar" ? "المهام حسب الفئة هذا الأسبوع" : language === "fr" ? "Tâches par catégorie cette semaine" : "Tasks by category this week"}
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
            <p className="text-2xl font-bold text-foreground">{events.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 backdrop-blur-sm border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">
              {language === "ar" ? "هذا الأسبوع" : language === "fr" ? "Cette semaine" : "This Week"}
            </p>
            <p className="text-2xl font-bold text-foreground">{thisWeekEvents.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
