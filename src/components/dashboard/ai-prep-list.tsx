"use client"

import { CheckCircle2, Circle, Sparkles } from "lucide-react"
import { useState } from "react"
import { useApp } from "@/lib/store"

interface PrepListItem {
  id: string
  text: string
  checked: boolean
}

interface AIPrepListProps {
  eventType: string
  eventTitle: string
  defaultItems?: PrepListItem[]
}

export function AIPrepList({ eventType, eventTitle, defaultItems }: AIPrepListProps) {
  const { language, t } = useApp()
  const [items, setItems] = useState<PrepListItem[]>(
    defaultItems || generatePrepList(eventType)
  )

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item))
  }

  const completedCount = items.filter(i => i.checked).length
  const progressPercent = (completedCount / items.length) * 100

  return (
    <div className={`${language === "ar" ? "text-right" : "text-left"} px-5 py-3`}>
      <div className="glass rounded-2xl p-4 border border-primary/20">
        <div className="flex items-start gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">{t("suggestion")}</p>
            <p className="text-sm font-semibold text-foreground">{t("prepare")} for {eventTitle}</p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                item.checked ? "bg-primary/15" : "hover:bg-secondary/30"
              }`}
            >
              {item.checked ? (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.text}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="w-full h-1 bg-secondary/50 rounded-full overflow-hidden mr-3">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">{completedCount}/{items.length}</span>
        </div>
      </div>
    </div>
  )
}

function generatePrepList(eventType: string): PrepListItem[] {
  const lists: Record<string, PrepListItem[]> = {
    doctor: [
      { id: "1", text: "Bring insurance card", checked: false },
      { id: "2", text: "List current medications", checked: false },
      { id: "3", text: "Note symptoms/concerns", checked: false },
      { id: "4", text: "Arrive 10 min early", checked: false },
    ],
    meeting: [
      { id: "1", text: "Prepare agenda", checked: false },
      { id: "2", text: "Review previous notes", checked: false },
      { id: "3", text: "Test audio/video", checked: false },
      { id: "4", text: "Have water nearby", checked: false },
    ],
    travel: [
      { id: "1", text: "Pack essentials", checked: false },
      { id: "2", text: "Check weather", checked: false },
      { id: "3", text: "Confirm transport", checked: false },
      { id: "4", text: "Share itinerary", checked: false },
    ],
  }

  return lists[eventType.toLowerCase()] || [
    { id: "1", text: "Prepare materials", checked: false },
    { id: "2", text: "Set reminder", checked: false },
    { id: "3", text: "Plan transport", checked: false },
  ]
}
