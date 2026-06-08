"use client"

import { Zap, TrendingUp, Lightbulb } from "lucide-react"

interface EnergySchedulerProps {
  eventType: string
  suggestedTime: string
  language: "en" | "fr" | "ar"
}

export function EnergyScheduler({ eventType, suggestedTime: _suggestedTime, language }: EnergySchedulerProps) {
  const getEnergyTip = (type: string, lang: string) => {
    const tips: Record<string, Record<string, { text: string; icon: React.ComponentType<{ className?: string }>; color: string }>> = {
      "doctor": {
        "en": { text: "Morning visit = clearer thinking", icon: Lightbulb, color: "text-blue-400" },
        "fr": { text: "Visite le matin = plus clair", icon: Lightbulb, color: "text-blue-400" },
        "ar": { text: "الزيارة صباحاً = تركيز أفضل", icon: Lightbulb, color: "text-blue-400" },
      },
      "meeting": {
        "en": { text: "10-11am peak focus window", icon: TrendingUp, color: "text-green-400" },
        "fr": { text: "10-11h = pic de concentration", icon: TrendingUp, color: "text-green-400" },
        "ar": { text: "10-11 = أفضل تركيز", icon: TrendingUp, color: "text-green-400" },
      },
    }
    
    return tips[type]?.[lang] || { 
      text: lang === "fr" ? "Optimal pour votre énergie" : lang === "ar" ? "الوقت الأمثل" : "Optimal timing",
      icon: Zap,
      color: "text-yellow-400"
    }
  }

  const tip = getEnergyTip(eventType.toLowerCase(), language)
  const TipIcon = tip.icon

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
      <TipIcon className={`w-4 h-4 ${tip.color}`} />
      <span className="text-xs font-medium text-purple-300">{tip.text}</span>
    </div>
  )
}
