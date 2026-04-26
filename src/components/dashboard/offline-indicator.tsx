"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff } from "lucide-react"

interface OfflineIndicatorProps {
  language: "en" | "fr" | "ar"
}

export function OfflineIndicator({ language }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!hydrated || isOnline) return null

  return (
    <div className="fixed top-4 right-4 left-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 backdrop-blur-md">
      <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
      <span className="text-sm font-medium text-red-600">
        {language === "fr" 
          ? "Mode hors ligne – vos données sont sauvegardées" 
          : language === "ar" 
            ? "وضع غير متصل – تم حفظ بيانات"
            : "Offline – your data is saved"}
      </span>
    </div>
  )
}
