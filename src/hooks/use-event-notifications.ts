"use client"

import { useEffect, useCallback } from "react"
import type { IQXOEvent } from "../lib/types"
import { getNextOccurrence } from "../lib/recurrence"

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
  const requestPermission = useCallback(async () => {
    const win = typeof window !== "undefined" ? (window as unknown as MobileWindow) : null
    const isNativeApp = win && !!win.isNativeApp
    if (isNativeApp) return true

    if (!("Notification" in window)) return false
    if (Notification.permission === "granted") return true
    if (Notification.permission === "denied") return false

    const result = await Notification.requestPermission()
    return result === "granted"
  }, [])

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  // ── Native app: sync reminders and calendar ─────────────
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
      const nextOcc = getNextOccurrence(event);
      if (!nextOcc) return; // Event is entirely in the past or invalid

      // Synced events default to 1-hour (60m) reminder if none specified
      const isSynced = event.source === "calendar_sync" || event.source === "google" || event.source === "azure";
      const reminderMinutes = (event.reminders && event.reminders.length > 0)
        ? Array.from(new Set(event.reminders.map(r => r.minutes_before)))
        : (isSynced ? [60] : [60]);

      reminderMinutes.forEach(minutesBefore => {
        const reminderTime = new Date(nextOcc.getTime() - minutesBefore * 60 * 1000)
        if (reminderTime.getTime() > now) {
          const notificationTitle = minutesBefore === 60
            ? (language === "ar" ? `تذكير (بعد ساعة): ${event.title}` : language === "fr" ? `Rappel (dans 1h) : ${event.title}` : `In 1 hour: ${event.title}`)
            : minutesBefore === 0
            ? (language === "ar" ? `حان الآن: ${event.title}` : language === "fr" ? `Maintenant : ${event.title}` : `Starting now: ${event.title}`)
            : minutesBefore < 60
            ? (language === "ar" ? `تذكير (بعد ${minutesBefore} دقيقة): ${event.title}` : language === "fr" ? `Rappel (dans ${minutesBefore}m) : ${event.title}` : `In ${minutesBefore}m: ${event.title}`)
            : (language === "ar" ? `تذكير: ${event.title}` : `Reminder: ${event.title}`);

          notificationsToSchedule.push({
            id: `${event.id}-${minutesBefore}m`,
            title: notificationTitle,
            body: event.location ? `${event.title} · ${event.location}` : (strings.oneHourBody(event.title) || event.title),
            triggerAt: reminderTime.getTime(),
          })
        }
      });
    })

    // Sync Notifications
    win.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "syncScheduledNotifications",
        notifications: notificationsToSchedule,
      })
    )

    // Sync to Device Calendar via expo-calendar
    win.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "syncCalendar",
        events: events.map(e => ({
          id: e.id,
          title: e.title,
          startDate: `${e.date}T${e.start_time || e.time || "09:00"}:00`,
          endDate: e.end_time ? `${e.date}T${e.end_time}:00` : new Date(new Date(`${e.date}T${e.start_time || e.time || "09:00"}:00`).getTime() + 60*60*1000).toISOString(),
          location: e.location,
          link: e.link,
          notes: e.notes,
          recurrenceRule: e.recurrence_rule
        })),
      })
    )
  }, [events, strings])

  return { requestPermission }
}
