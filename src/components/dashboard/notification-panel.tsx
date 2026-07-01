"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Bell, RefreshCw, X } from "lucide-react"
import { useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import type { NotificationRecord } from "@/lib/notification-utils"
import { NotificationEmptyState } from "./notification-empty-state"
import { NotificationItem } from "./notification-item"

interface NotificationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notifications: NotificationRecord[]
  unreadCount: number
  loading: boolean
  error: string | null
  recentNotificationId: number | null
  onMarkAsRead: (id: number) => void | Promise<void>
  onMarkAllAsRead: () => void | Promise<void>
  onRetry: () => void | Promise<void>
  language: "en" | "fr" | "ar"
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="flex gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/10" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/5 rounded-full bg-white/10" />
              <div className="h-3 w-full rounded-full bg-white/10" />
              <div className="h-3 w-4/5 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationPanel({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  loading,
  error,
  recentNotificationId,
  onMarkAsRead,
  onMarkAllAsRead,
  onRetry,
  language,
}: NotificationPanelProps) {
  const isMobile = useIsMobile()

  const localized = useMemo(
    () => ({
      title: language === "ar" ? "الإشعارات" : language === "fr" ? "Notifications" : "Notifications",
      subtitle:
        language === "ar"
          ? "أهم التحديثات في مكان واحد"
          : language === "fr"
            ? "Les mises à jour importantes, regroupées ici"
            : "Important updates, organized in one place",
      markAll: language === "ar" ? "تمييز الكل كمقروء" : language === "fr" ? "Tout marquer comme lu" : "Mark all as read",
      unread: language === "ar" ? "غير المقروءة" : language === "fr" ? "Non lues" : "Unread",
      earlier: language === "ar" ? "الأقدم" : language === "fr" ? "Plus anciennes" : "Earlier",
      emptyTitle: language === "ar" ? "لا توجد إشعارات بعد" : language === "fr" ? "Aucune notification" : "You're all caught up",
      emptyBody:
        language === "ar"
          ? "سنخبرك فور وصول أي تحديث مهم أو تذكير ذكي."
          : language === "fr"
            ? "Nous vous préviendrons dès qu’une mise à jour importante arrive."
            : "We’ll surface reminders, updates, and smart suggestions here.",
      errorTitle: language === "ar" ? "تعذر تحميل الإشعارات" : language === "fr" ? "Impossible de charger les notifications" : "Unable to load notifications",
      retry: language === "ar" ? "إعادة المحاولة" : language === "fr" ? "Réessayer" : "Retry",
      loading: language === "ar" ? "جارٍ التحميل..." : language === "fr" ? "Chargement..." : "Loading...",
    }),
    [language],
  )

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onOpenChange, open])

  const unreadNotifications = notifications.filter((notification) => !notification.is_read)
  const readNotifications = notifications.filter((notification) => notification.is_read)
  const showUnreadSection = unreadNotifications.length > 0

  const panelBody = (
    <>
      <div className="sticky top-0 z-10 border-b border-border/70 bg-background/85 px-5 py-4 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{localized.title}</h3>
                <p className="text-[11px] text-muted-foreground">{localized.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onRetry()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={localized.retry}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{unreadCount}</span>
            <span>{language === "ar" ? "غير مقروء" : language === "fr" ? "non lues" : "unread"}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void onMarkAllAsRead()}
            disabled={unreadCount === 0 || loading}
            className="h-9 rounded-xl border-white/10 bg-white/[0.03] text-xs shadow-none hover:bg-white/[0.06]"
          >
            {localized.markAll}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {error && notifications.length > 0 && (
          <div className="mb-4 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-200">{localized.errorTitle}</p>
                <p className="mt-1 text-sm text-amber-100/80">{error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void onRetry()}
                className="h-9 rounded-xl border-amber-500/20 bg-amber-500/10 text-xs text-amber-100 hover:bg-amber-500/15"
              >
                {localized.retry}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <NotificationSkeleton />
        ) : error && notifications.length === 0 ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
            <p className="text-sm font-semibold text-rose-300">{localized.errorTitle}</p>
            <p className="mt-1 text-sm text-rose-100/80">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onRetry()}
              className="mt-4 h-10 rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
            >
              {localized.retry}
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <NotificationEmptyState title={localized.emptyTitle} description={localized.emptyBody} />
        ) : (
          <div className="space-y-5">
            {showUnreadSection && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {localized.unread}
                  </h4>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                    {unreadNotifications.length}
                  </span>
                </div>

                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        locale={language}
                        onMarkAsRead={onMarkAsRead}
                        highlight={recentNotificationId === notification.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            <section className="space-y-3">
              {readNotifications.length > 0 && (
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {localized.earlier}
                  </h4>
                </div>
              )}

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {readNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      locale={language}
                      onMarkAsRead={onMarkAsRead}
                      highlight={recentNotificationId === notification.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  )

  return typeof document !== "undefined" ? createPortal(
    <AnimatePresence>
      {open && (
        <>
          {!isMobile ? (
            <>
              <motion.div
                key="notifications-backdrop"
                className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onOpenChange(false)}
              />
              <motion.div
                key="notifications-panel"
                role="dialog"
                aria-modal="true"
                aria-label={localized.title}
                className="fixed right-4 top-16 z-[101] flex w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/90 shadow-2xl shadow-black/40 backdrop-blur-2xl"
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                onClick={(event) => event.stopPropagation()}
              >
                {panelBody}
              </motion.div>
            </>
          ) : (
            <motion.div
              key="notifications-sheet"
              className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={localized.title}
                className="relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-background/95 shadow-2xl shadow-black/50 backdrop-blur-2xl"
                initial={{ y: "100%", opacity: 0.9 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="absolute left-1/2 top-3 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/15" />
                {panelBody}
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>, document.body
  ) : null
}
