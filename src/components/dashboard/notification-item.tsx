"use client"

import { motion } from "framer-motion"
import {
  Bell,
  BadgeAlert,
  CalendarClock,
  CreditCard,
  FileText,
  Mic,
  Sparkles,
  TimerReset,
  CheckCheck,
} from "lucide-react"
import type { NotificationKind, NotificationRecord } from "@/lib/notification-utils"
import { detectNotificationKind, formatRelativeTime } from "@/lib/notification-utils"

interface NotificationItemProps {
  notification: NotificationRecord
  locale: string
  onMarkAsRead: (id: number) => void | Promise<void>
  highlight?: boolean
}

const kindStyles: Record<
  NotificationKind,
  { icon: typeof Bell; iconClass: string; ringClass: string; glowClass: string; label: string }
> = {
  event: {
    icon: CalendarClock,
    iconClass: "text-blue-400",
    ringClass: "bg-blue-500/10",
    glowClass: "from-blue-500/15 to-cyan-500/5",
    label: "Event",
  },
  ai: {
    icon: Sparkles,
    iconClass: "text-amber-400",
    ringClass: "bg-amber-500/10",
    glowClass: "from-amber-500/15 to-orange-500/5",
    label: "AI",
  },
  voice: {
    icon: Mic,
    iconClass: "text-emerald-400",
    ringClass: "bg-emerald-500/10",
    glowClass: "from-emerald-500/15 to-teal-500/5",
    label: "Voice",
  },
  document: {
    icon: FileText,
    iconClass: "text-violet-400",
    ringClass: "bg-violet-500/10",
    glowClass: "from-violet-500/15 to-fuchsia-500/5",
    label: "Document",
  },
  billing: {
    icon: CreditCard,
    iconClass: "text-cyan-400",
    ringClass: "bg-cyan-500/10",
    glowClass: "from-cyan-500/15 to-blue-500/5",
    label: "Billing",
  },
  deadline: {
    icon: TimerReset,
    iconClass: "text-rose-400",
    ringClass: "bg-rose-500/10",
    glowClass: "from-rose-500/15 to-red-500/5",
    label: "Deadline",
  },
  system: {
    icon: BadgeAlert,
    iconClass: "text-slate-300",
    ringClass: "bg-white/10",
    glowClass: "from-white/10 to-white/5",
    label: "Update",
  },
}

export function NotificationItem({ notification, locale, onMarkAsRead, highlight = false }: NotificationItemProps) {
  const kind = detectNotificationKind(notification.title, notification.body)
  const presentation = kindStyles[kind]
  const isUnread = !notification.is_read

  const handleActivate = () => {
    if (isUnread) {
      void onMarkAsRead(notification.id)
    }
  }

  return (
    <motion.div
      layout
      initial={highlight ? { opacity: 0, y: -10, scale: 0.98 } : { opacity: 1 }}
      animate={highlight ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleActivate()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${notification.title}${isUnread ? ", unread notification" : ""}`}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-primary/40 ${
        isUnread
          ? `border-white/10 bg-gradient-to-br ${presentation.glowClass} shadow-lg shadow-black/10`
          : "border-border/70 bg-white/[0.03] opacity-90"
      } ${highlight ? "ring-1 ring-[rgba(59,130,246,0.30)]" : ""}`}
    >
      <div className="relative flex gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 ${presentation.ringClass}`}>
          <presentation.icon className={`h-5 w-5 ${presentation.iconClass}`} strokeWidth={1.6} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isUnread && <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.35)]" />}
                <p className={`truncate text-sm font-semibold ${isUnread ? "text-foreground" : "text-foreground/90"}`}>
                  {notification.title}
                </p>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {notification.body}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
              <span className="text-[11px] font-medium text-muted-foreground/70">
                {formatRelativeTime(notification.created_at, locale)}
              </span>
              {isUnread ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    void onMarkAsRead(notification.id)
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-white/[0.08] hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark read
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-muted-foreground/70">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Read
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/75">
              {presentation.label}
            </div>
            {isUnread && (
              <span className="text-[11px] font-medium text-primary/90">Tap to mark as read</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
