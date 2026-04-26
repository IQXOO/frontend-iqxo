"use client"

import { useMemo } from "react"
import type { IQXOEvent } from "@/lib/types"

interface UrgencyHeatMapProps {
  event: IQXOEvent
}

export function UrgencyHeatMap({ event }: UrgencyHeatMapProps) {
  const urgencyLevel = useMemo(() => {
    const eventDate = new Date(event.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    eventDate.setHours(0, 0, 0, 0)

    const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) return { level: "expired", color: "from-red-600 to-red-500", glow: "red" }
    if (daysUntil === 0) return { level: "today", color: "from-red-500 to-orange-500", glow: "red" }
    if (daysUntil <= 3) return { level: "soon", color: "from-orange-500 to-amber-500", glow: "orange" }
    if (daysUntil <= 7) return { level: "week", color: "from-amber-500 to-yellow-500", glow: "amber" }
    return { level: "later", color: "from-green-500 to-emerald-500", glow: "green" }
  }, [event.date])

  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/5 border border-white/10">
      <div
        className={`h-full w-full bg-gradient-to-r ${urgencyLevel.color} transition-all duration-300 animate-pulse`}
        style={{
          boxShadow: `0 0 12px rgba(${
            urgencyLevel.glow === "red" ? "239, 68, 68" :
            urgencyLevel.glow === "orange" ? "249, 115, 22" :
            urgencyLevel.glow === "amber" ? "217, 119, 6" :
            "34, 197, 94"
          }, 0.6)`,
        }}
      />
    </div>
  )
}
