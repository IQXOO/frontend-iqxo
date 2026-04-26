"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Bell, AlertCircle, Calendar, CheckCircle, Trash2, X } from "lucide-react"
import { useApp } from "@/lib/store"
import { useState, useEffect } from "react"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success"
  icon: React.ComponentType<{ className?: string }>
  timestamp: Date
  actionLabel?: string
  onAction?: () => void
}

export function SmartNotificationCenter() {
  const { events, language } = useApp()
  const isRTL = language === "ar"
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // Generate smart notifications based on events
    const generatedNotifications: Notification[] = []

    // Check for events expiring soon
    events.forEach((event) => {
      const eventDate = new Date(event.date)
      const today = new Date()
      const daysUntil = Math.ceil(
        (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntil === 7 && event.title.toLowerCase().includes("passport")) {
        generatedNotifications.push({
          id: `${event.id}-passport`,
          title:
            language === "ar" ? "انتبه: جواز سفرك قريب الانتهاء" : "Heads up: Your passport expires soon",
          message:
            language === "ar"
              ? `جواز سفرك ينتهي خلال 7 أيام. هل نبدأ معاً؟`
              : `Your passport expires in 7 days. Should we start the renewal process together?`,
          type: "warning",
          icon: AlertCircle,
          timestamp: new Date(),
          actionLabel: language === "ar" ? "ابدأ الآن" : "Start Now",
        })
      }

      if (daysUntil === 1) {
        generatedNotifications.push({
          id: `${event.id}-reminder`,
          title:
            language === "ar" ? "تذكير: " + event.title : `Reminder: ${event.title}`,
          message:
            language === "ar"
              ? `هذا الحدث غداً. هل أنت مستعد؟`
              : `This is happening tomorrow. Are you ready?`,
          type: "info",
          icon: Calendar,
          timestamp: new Date(),
        })
      }
    })

    // Completed events celebration
    const today = new Date().toISOString().split("T")[0]
    const completedToday = events.filter((e) => e.date === today).length
    if (completedToday > 0) {
      generatedNotifications.push({
        id: "completed-celebration",
        title:
          language === "ar"
            ? `رائع! أكملت ${completedToday} مهام`
            : `Amazing! You completed ${completedToday} tasks today`,
        message:
          language === "ar"
            ? "أنت على الطريق الصحيح!"
            : "You're on fire!",
        type: "success",
        icon: CheckCircle,
        timestamp: new Date(),
      })
    }

    setNotifications(generatedNotifications)
  }, [events, language])

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const getColorClasses = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return "from-amber-500/20 to-amber-500/5 border-amber-500/30"
      case "success":
        return "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30"
      default:
        return "from-blue-500/20 to-blue-500/5 border-blue-500/30"
    }
  }

  const getIconColor = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return "text-amber-400"
      case "success":
        return "text-emerald-400"
      default:
        return "text-blue-400"
    }
  }

  return (
    <div className={`px-5 py-8 space-y-4 ${isRTL ? "dir-rtl" : ""}`}>
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-foreground">
          {language === "ar" ? "مركز الإخطارات" : "Notification Center"}
        </h1>
      </div>

      {notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-8 border border-white/5 text-center"
        >
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {language === "ar"
              ? "أنت جميع الاطلاع. لا توجد إخطارات الآن."
              : "You're all caught up. No notifications right now."}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          {notifications.map((notification, idx) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ delay: idx * 0.1 }}
              className={`glass rounded-2xl p-4 border bg-gradient-to-br ${getColorClasses(
                notification.type
              )} group hover:border-opacity-100 transition-all`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <notification.icon className={`w-6 h-6 ${getIconColor(notification.type)}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">
                    {notification.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.message}
                  </p>

                  {/* Action button */}
                  {notification.actionLabel && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={notification.onAction}
                      className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-blue-400"
                    >
                      {notification.actionLabel}
                    </motion.button>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="flex-shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress indicator */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 8 }}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-transparent origin-left"
                style={{ originX: 0 }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Notification preferences hint */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <p className="text-xs text-muted-foreground text-center">
          {language === "ar"
            ? "إدارة تفضيلات الإخطارات في الإعدادات"
            : "Manage notification preferences in Settings"}
        </p>
      </div>
    </div>
  )
}
