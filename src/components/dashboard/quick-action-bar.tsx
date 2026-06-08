"use client"

import { Phone, MapPin, Calendar, Share2 } from "lucide-react"
import type { IQXOEvent } from "@/lib/types"

interface QuickActionBarProps {
  event: IQXOEvent
  language: "en" | "fr" | "ar"
}

export function QuickActionBar({ event, language }: QuickActionBarProps) {
  const actions = [
    event.phone && {
      icon: Phone,
      label: language === "fr" ? "Appeler" : language === "ar" ? "اتصال" : "Call",
      onClick: () => window.location.href = `tel:${event.phone}`,
      color: "text-blue-500",
    },
    event.location && {
      icon: MapPin,
      label: language === "fr" ? "Carte" : language === "ar" ? "الخريطة" : "Map",
      onClick: () => window.location.href = `https://maps.google.com/maps/search/${encodeURIComponent(event.location!)}`,
      color: "text-green-500",
    },
    {
      icon: Calendar,
      label: language === "fr" ? "Ajouter" : language === "ar" ? "إضافة" : "Add",
      onClick: () => {
        const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//IQXO//NONSGML Event//EN\nBEGIN:VEVENT\nDTSTART:${event.date.replace(/-/g, "")}T${event.time.replace(/:/g, "")}00Z\nDTEND:${event.date.replace(/-/g, "")}T${(parseInt(event.time.split(":")[0]) + 1).toString().padStart(2, "0")}${event.time.split(":")[1]}00Z\nSUMMARY:${event.title}\nDESCRIPTION:${event.notes}\nEND:VEVENT\nEND:VCALENDAR`
        const blob = new Blob([icsContent], { type: "text/calendar" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${event.title}.ics`
        a.click()
      },
      color: "text-orange-500",
    },
    {
      icon: Share2,
      label: language === "fr" ? "Partager" : language === "ar" ? "مشاركة" : "Share",
      onClick: () => {
        if (navigator.share) {
          navigator.share({
            title: event.title,
            text: `${event.date} at ${event.time}: ${event.title}\n${event.notes}`,
          })
        }
      },
      color: "text-purple-500",
    },
  ].filter(Boolean) as Array<{
    icon: React.ComponentType<{ className?: string }>
    label: string
    onClick: () => void
    color: string
  }>

  return (
    <div className={`flex gap-2 ${language === "ar" ? "flex-row-reverse" : ""}`}>
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={action.onClick}
          className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/20 transition-all active:scale-95 ${action.color}`}
          title={action.label}
        >
          <action.icon className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  )
}
