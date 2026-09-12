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
        const formatDate = (dateStr: string, timeStr: string) => {
          if (!timeStr) return dateStr.replace(/-/g, "");
          return `${dateStr.replace(/-/g, "")}T${timeStr.replace(/:/g, "")}00`;
        };

        const dtStartStr = formatDate(event.date, event.start_time || event.time);
        
        let dtEndStr = "";
        if (event.end_time) {
           dtEndStr = formatDate(event.date, event.end_time);
        } else if (event.time) {
           const [h, m] = event.time.split(":");
           const nextH = (parseInt(h) + 1).toString().padStart(2, "0");
           dtEndStr = `${event.date.replace(/-/g, "")}T${nextH}${m}00`;
        }

        let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//IQXO//NONSGML Event//EN\nBEGIN:VEVENT\n`;
        if (event.time) {
           icsContent += `DTSTART:${dtStartStr}\n`;
           if (dtEndStr) icsContent += `DTEND:${dtEndStr}\n`;
        } else {
           icsContent += `DTSTART;VALUE=DATE:${dtStartStr}\n`;
        }
        
        icsContent += `SUMMARY:${event.title || ""}\n`;
        if (event.location) icsContent += `LOCATION:${event.location}\n`;
        if (event.notes) icsContent += `DESCRIPTION:${event.notes.replace(/\n/g, '\\n')}\n`;
        if ((event as any).recurrence_rule) icsContent += `RRULE:${(event as any).recurrence_rule}\n`;
        
        icsContent += `END:VEVENT\nEND:VCALENDAR`;

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
