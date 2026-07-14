"use client"

import { useEffect, useCallback } from "react"
import type { IQXOEvent } from "../lib/types"

interface MobileWindow extends Window {
  isNativeApp?: boolean;
  ReactNativeWebView?: {
    postMessage: (message: string) => void;
  };
}

// ── i18n strings for notifications ───────────────────────────────────────────
const i18n = {
  en: {
    oneHourTitle: "IQXO - In 1 hour",
    oneHourBody: (title: string, location?: string) =>
      `${title}${location ? ` · ${location}` : ""}`,
  },
  fr: {
    oneHourTitle: "IQXO - Dans 1 heure",
    oneHourBody: (title: string, location?: string) =>
      `${title}${location ? ` · ${location}` : ""}`,
  },
  ar: {
    oneHourTitle: "IQXO - بعد ساعة",
    oneHourBody: (title: string, location?: string) =>
      `${title}${location ? ` · ${location}` : ""}`,
  },
} as const

type Lang = keyof typeof i18n

function getLang(language: string): Lang {
  if (language === "ar") return "ar"
  if (language === "fr") return "fr"
  return "en"
}

// ── Notification sender ───────────────────────────────────────────────────────
// On native app: delegates to the React Native shell via postMessage.
// On browser: uses the Web Notification API directly.
function showNotification(title: string, body: string, tag: string) {
  const win = typeof window !== "undefined" ? (window as unknown as MobileWindow) : null
  const isNativeApp = win && !!win.isNativeApp
  if (isNativeApp && win?.ReactNativeWebView) {
    win.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "showNotification", title, body, data: { tag } })
    )
    return
  }

  if (typeof Notification === "undefined" || Notification.permission !== "granted") return

  new Notification(title, {
    body,
    tag,
    icon: "/favicon.ico",
    requireInteraction: false,
  })
}

// suppress unused warning — kept for potential future browser-path use
void showNotification

export function useEventNotifications(events: IQXOEvent[], language: string = "en") {
  const lang = getLang(language)
  const strings = i18n[lang]

  // ── Permission request ────────────────────────────────────────────────────
  // On native: permissions are handled in the App shell on startup.
  // On browser: requests the user's permission via the Web Notification API.
  const requestPermission = useCallback(async () => {
    const win = typeof window !== "undefined" ? (window as unknown as MobileWindow) : null
    const isNativeApp = win && !!win.isNativeApp
    if (isNativeApp) return true // native app handles permissions in App.tsx

    if (!("Notification" in window)) return false
    if (Notification.permission === "granted") return true
    if (Notification.permission === "denied") return false

    const result = await Notification.requestPermission()
    return result === "granted"
  }, [])

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  // ── Native app: sync 1h-before reminders to the OS scheduler ─────────────
  // The server already sends morning notifications each night (next day summary).
  // We only schedule the "1 hour before" reminder via the native OS scheduler —
  // this fires even when the app is fully closed or in the background.
  // No polling interval needed — the OS owns the scheduling.
  useEffect(() => {
    const win = typeof window !== "undefined" ? (window as unknown as MobileWindow) : null
    const isNativeApp = win && !!win.isNativeApp
    if (!isNativeApp || !win?.ReactNativeWebView || !events?.length) return

    const now = Date.now()
    const notificationsToSchedule: {
      id: string
      title: string
      body: string
      triggerAt: number
    }[] = []

    events.forEach((event) => {
      const eventDate = new Date(event.date)
      const eventTime = event.time || "09:00"
      const [hours, minutes] = eventTime.split(":").map(Number)
      eventDate.setHours(hours, minutes, 0, 0)

      // Only the 1h-before reminder — morning is handled by the server nightly.
      const oneHourReminder = new Date(eventDate.getTime() - 60 * 60 * 1000)
      if (oneHourReminder.getTime() > now) {
        notificationsToSchedule.push({
          id: `${event.id}-1h`,
          title: strings.oneHourTitle,
          body: strings.oneHourBody(event.title, event.location || undefined),
          triggerAt: oneHourReminder.getTime(),
        })
      }
    })

    // React Native receives this, cancels old scheduled notifications,
    // then registers the updated list with the OS — no polling required.
    win.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "syncScheduledNotifications",
        notifications: notificationsToSchedule,
      })
    )
  }, [events, strings])

  return { requestPermission }
}
