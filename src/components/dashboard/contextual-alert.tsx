"use client"

import { MapPin, Clock, AlertTriangle } from "lucide-react"
import { useApp } from "@/lib/store"

interface ContextualAlertProps {
  alertType: "location" | "time" | "conflict"
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function ContextualAlert({ alertType, message, actionLabel, onAction }: ContextualAlertProps) {
  const { language } = useApp()

  const alertConfig = {
    location: { icon: MapPin, color: "from-blue-500 to-cyan-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    time: { icon: Clock, color: "from-amber-500 to-orange-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    conflict: { icon: AlertTriangle, color: "from-red-500 to-rose-500", bg: "bg-red-500/10", border: "border-red-500/30" },
  }

  const config = alertConfig[alertType]
  const Icon = config.icon

  return (
    <div className={`${language === "ar" ? "text-right" : "text-left"} px-5 py-2`}>
      <div className={`glass rounded-2xl border ${config.border} ${config.bg} p-3.5 backdrop-blur-md`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-2 rounded-lg bg-gradient-to-r ${config.color} bg-opacity-20 flex-shrink-0`}>
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{message}</p>
            {actionLabel && (
              <button
                onClick={onAction}
                className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {actionLabel} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
