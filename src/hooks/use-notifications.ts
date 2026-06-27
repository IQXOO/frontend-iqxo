"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useApp } from "@/lib/store"
import { devError, devLog, devWarn } from "@/lib/logger"
import type { NotificationRecord } from "@/lib/notification-utils"
import {
  mergeNotificationLists,
  sortNotificationsNewestFirst,
} from "@/lib/notification-utils"

type NotificationChangeEvent = "INSERT" | "UPDATE" | "DELETE"

interface NotificationChangePayload {
  eventType: NotificationChangeEvent
  new: Partial<NotificationRecord>
  old: Partial<NotificationRecord>
}

interface LoadResult {
  notifications: NotificationRecord[]
  error: string | null
}

const NOTIFICATION_COLUMNS = "id,user_id,title,body,is_read,created_at"

function normalizeNotification(
  notification: Partial<NotificationRecord> | null | undefined,
): NotificationRecord | null {
  if (!notification?.id || !notification.user_id || !notification.title || !notification.body || !notification.created_at) {
    return null
  }

  return {
    id: Number(notification.id),
    user_id: String(notification.user_id),
    title: String(notification.title),
    body: String(notification.body),
    is_read: Boolean(notification.is_read),
    created_at: String(notification.created_at),
  }
}

export function useNotifications() {
  const { user } = useApp()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentNotificationId, setRecentNotificationId] = useState<number | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const requestVersionRef = useRef(0)
  const notificationIdsRef = useRef<Set<number>>(new Set())
  const notificationsRef = useRef<NotificationRecord[]>([])

  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  )

  const loadNotifications = useCallback(async (userId: string): Promise<LoadResult> => {
    const version = ++requestVersionRef.current

    setLoading(true)
    setError(null)

    try {
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select(NOTIFICATION_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (version !== requestVersionRef.current) {
        return { notifications: [], error: null }
      }

      if (queryError) {
        throw queryError
      }

      const rows = (data ?? [])
        .map((item) => normalizeNotification(item as Partial<NotificationRecord>))
        .filter((item): item is NotificationRecord => Boolean(item))

      setNotifications((current) => {
        const merged = mergeNotificationLists(current, rows)
        notificationIdsRef.current = new Set(merged.map((notification) => notification.id))
        return merged
      })

      devLog("Notifications", "Loaded notifications", {
        userId,
        count: rows.length,
      })

      return { notifications: rows, error: null }
    } catch (loadError) {
      if (version !== requestVersionRef.current) {
        return { notifications: [], error: null }
      }

      devError("Notifications", "Failed to load notifications", loadError, {
        userId,
      })
      const friendlyMessage = "Unable to load notifications right now."
      setError(friendlyMessage)
      return { notifications: [], error: friendlyMessage }
    } finally {
      if (version === requestVersionRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const removeFromList = useCallback((id: number) => {
    notificationIdsRef.current.delete(id)
    setNotifications((current) => current.filter((notification) => notification.id !== id))
  }, [])

  const handleRealtimePayload = useCallback((payload: NotificationChangePayload) => {
    const incoming = normalizeNotification(payload.new)
    const outgoing = normalizeNotification(payload.old)

    if (payload.eventType === "DELETE") {
      if (outgoing) {
        removeFromList(outgoing.id)
      }
      return
    }

    if (!incoming) return

    if (notificationIdsRef.current.has(incoming.id)) {
      setNotifications((current) =>
        sortNotificationsNewestFirst(
          current.map((notification) =>
            notification.id === incoming.id ? { ...notification, ...incoming } : notification,
          ),
        ),
      )
      notificationIdsRef.current.add(incoming.id)
      return
    }

    notificationIdsRef.current.add(incoming.id)
    setNotifications((current) => mergeNotificationLists([incoming], current))
    setRecentNotificationId(incoming.id)

    // Trigger local notification if running inside native WebView app
    const isNativeApp = typeof window !== "undefined" && !!(window as any).isNativeApp;
    if (isNativeApp && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "showNotification",
          title: incoming.title,
          body: incoming.body,
          data: { id: incoming.id },
        })
      );
    }

    window.setTimeout(() => {
      setRecentNotificationId((current) => (current === incoming.id ? null : current))
    }, 2400)
  }, [removeFromList])

  const markAsRead = useCallback(async (notificationId: number) => {
    if (!user) return

    const snapshot = notificationsRef.current
    const target = snapshot.find((notification) => notification.id === notificationId)
    if (!target || target.is_read) return

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true } : notification,
      ),
    )

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id)

      if (updateError) {
        throw updateError
      }

      devLog("Notifications", "Notification marked as read", {
        userId: user.id,
        notificationId,
      })
    } catch (markError) {
      devError("Notifications", "Failed to mark notification as read", markError, {
        userId: user.id,
        notificationId,
      })
      setNotifications(snapshot)
      setError("Unable to update that notification right now.")
    }
  }, [user])

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    const snapshot = notificationsRef.current
    const unreadIds = snapshot.filter((notification) => !notification.is_read).map((notification) => notification.id)
    if (unreadIds.length === 0) return

    setNotifications((current) =>
      current.map((notification) =>
        notification.is_read ? notification : { ...notification, is_read: true },
      ),
    )

    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (updateError) {
        throw updateError
      }

      devLog("Notifications", "All notifications marked as read", {
        userId: user.id,
        count: unreadIds.length,
      })
    } catch (markError) {
      devError("Notifications", "Failed to mark all notifications as read", markError, {
        userId: user.id,
      })
      setNotifications(snapshot)
      setError("Unable to update notifications right now.")
    }
  }, [user])

  const retry = useCallback(async () => {
    if (!user) return
    await loadNotifications(user.id)
  }, [loadNotifications, user])

  useEffect(() => {
    const userId = user?.id

    requestVersionRef.current += 1

    if (!userId) {
      setNotifications([])
      setLoading(false)
      setError(null)
      notificationIdsRef.current = new Set()
      setRecentNotificationId(null)
      return
    }

    const setup = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const channel = supabase
        .channel(`iqxo-notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            handleRealtimePayload(payload as NotificationChangePayload)
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            devLog("Notifications", "Realtime channel subscribed", { userId })
            void loadNotifications(userId)
            return
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            const message = "Notifications are temporarily unavailable."
            setError(message)
            devWarn("Notifications", "Realtime channel issue", { userId, status })
          }
        })

      channelRef.current = channel
    }

    setup()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [handleRealtimePayload, loadNotifications, user?.id])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    recentNotificationId,
    markAsRead,
    markAllAsRead,
    retry,
    refresh: retry,
  }
}


