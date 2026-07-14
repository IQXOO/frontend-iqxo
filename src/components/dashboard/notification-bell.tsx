"use client"

import { Suspense } from "react"
import { motion } from "framer-motion"
import { Bell } from "lucide-react"
import { useMemo, useState, memo } from "react"
import { useApp } from "@/lib/store"
import { useNotifications } from "@/hooks/use-notifications"
import { lazyNamed } from "@/lib/lazy"

const NotificationPanel = lazyNamed(() => import("./notification-panel"), "NotificationPanel")

export const NotificationBell = memo(function NotificationBell() {
  const { language } = useApp()
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    loading,
    error,
    recentNotificationId,
    markAsRead,
    markAllAsRead,
    retry,
  } = useNotifications()

  const badgeLabel = useMemo(() => {
    if (unreadCount <= 0) return null
    return unreadCount > 99 ? "99+" : String(unreadCount)
  }, [unreadCount])

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative glass rounded-xl p-2.5 transition-all duration-200 active:scale-95 ${
          open ? "bg-primary/20" : "hover:bg-secondary/50"
        }`}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} ${language === "ar" ? "إشعار غير مقروء" : language === "fr" ? "notifications non lues" : "unread notifications"}`
            : language === "ar"
              ? "الإشعارات"
              : language === "fr"
                ? "Notifications"
                : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className={`h-5 w-5 ${open || unreadCount > 0 ? "text-primary" : "text-muted-foreground"}`} />

        {badgeLabel && (
          <motion.span
            aria-hidden="true"
            className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground shadow-[0_0_18px_rgba(59,130,246,0.45)]"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            {badgeLabel}
          </motion.span>
        )}

        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-xl bg-primary/10 opacity-30 transition-opacity duration-300 animate-pulse" />
        )}
      </motion.button>

      <Suspense fallback={null}>
        <NotificationPanel
          open={open}
          onOpenChange={setOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          recentNotificationId={recentNotificationId}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onRetry={retry}
          language={language}
        />
      </Suspense>
    </>
  )
})
