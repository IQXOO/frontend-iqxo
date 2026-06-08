"use client"

import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { useApp } from "@/lib/store"

interface EnergyScoreBadgeProps {
  timeOfDay?: "morning" | "afternoon" | "evening"
}

export function EnergyScoreBadge({ timeOfDay = "afternoon" }: EnergyScoreBadgeProps) {
  const { language, t } = useApp()

  const energyMap = {
    morning: { level: 90, label: "energyHigh", color: "from-emerald-500 to-teal-500", icon: TrendingUp, suggestion: "Peak time for meetings" },
    afternoon: { level: 65, label: "energyMed", color: "from-amber-500 to-orange-500", icon: AlertCircle, suggestion: "Best for admin tasks" },
    evening: { level: 40, label: "energyLow", color: "from-rose-500 to-pink-500", icon: TrendingDown, suggestion: "Rest & recharge time" },
  }

  const current = energyMap[timeOfDay]
  const Icon = current.icon

  return (
    <div className={`${language === "ar" ? "text-right" : "text-left"} px-5 py-3`}>
      <div className={`glass rounded-2xl p-4 bg-gradient-to-r ${current.color} bg-opacity-10 border border-current`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-12 w-12 rounded-xl bg-gradient-to-r ${current.color} flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">{t("energyScore")}</p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <p className="text-lg font-bold text-foreground">{t(current.label as any)}</p>
          </div>
          <div className="text-2xl font-bold text-foreground">{current.level}%</div>
        </div>
        <div className="w-full h-1.5 bg-secondary/50 rounded-full overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${current.color} transition-all duration-300`} style={{ width: `${current.level}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-tight">
          <span className="font-semibold text-foreground">{t("suggestion")}:</span> {current.suggestion}
        </p>
      </div>
    </div>
  )
}
