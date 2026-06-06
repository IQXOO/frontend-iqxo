"use client"

import { useState } from "react"
import { Clock, Check } from "lucide-react"
import { useApp } from "@/lib/store"

interface SmartReminderProps {
  eventTitle: string
  eventTime: string
  onConfirm: () => void
  onSnooze: (minutes: number) => void
}

export function SmartReminder({ eventTitle, eventTime, onConfirm, onSnooze }: SmartReminderProps) {
  const { language, t } = useApp()
  const [snoozeMins, setSnoozeMins] = useState(10)
  const [confirmed, setConfirmed] = useState(false)

  const handleSnooze = () => {
    onSnooze(snoozeMins)
    setSnoozeMins(10)
  }

  const handleConfirm = () => {
    setConfirmed(true)
    onConfirm()
    setTimeout(() => setConfirmed(false), 2000)
  }

  return (
    <div className={`fixed bottom-24 ${language === "ar" ? "left" : "right"}-5 z-40 animate-in slide-in-from-bottom-5`}>
      <div className="glass rounded-3xl backdrop-blur-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 p-4 shadow-xl max-w-xs">
        {confirmed ? (
          <div className="flex items-center gap-2 justify-center py-3">
            <Check className="h-5 w-5 text-primary animate-pulse" />
            <p className="text-sm font-semibold text-foreground">{eventTitle} confirmed</p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">{eventTitle}</p>
              <p className="text-sm font-bold text-foreground">{eventTime}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={snoozeMins}
                  onChange={(e) => setSnoozeMins(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-secondary/50 rounded-full cursor-pointer"
                />
                <span className="text-xs font-semibold text-foreground w-8 text-right">{snoozeMins}m</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSnooze}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  {t("snooze")}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Check className="h-4 w-4" />
                  {t("confirm")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
