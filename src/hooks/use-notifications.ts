"use client"

import { useEffect, useCallback, useRef } from "react"
import type { IQXOEvent } from "../lib/types"

const STORAGE_KEY = "iqxo_notified_events"

// Get already notified event IDs with their notification types
function getNotifiedEvents(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Mark an event as notified for a specific type
function markAsNotified(eventId: string, type: string) {
  const notified = getNotifiedEvents()
  if (!notified[eventId]) notified[eventId] = []
  if (!notified[eventId].includes(type)) {
    notified[eventId].push(type)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notified))
}

// Check if event was already notified for a specific type
function wasNotified(eventId: string, type: string): boolean {
  const notified = getNotifiedEvents()
  return notified[eventId]?.includes(type) || false
}

// Show a browser notification
function showNotification(title: string, body: string, tag: string) {
  if (Notification.permission !== "granted") return

  new Notification(title, {
    body,
    tag, // Prevents duplicate notifications
    icon: "/favicon.ico",
    requireInteraction: false,
  })
}

export function useNotifications(events: IQXOEvent[]) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Request permission on mount
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false

    if (Notification.permission === "granted") return true
    if (Notification.permission === "denied") return false

    const result = await Notification.requestPermission()
    return result === "granted"
  }, [])

  // Check and send notifications
  const checkNotifications = useCallback(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return
    }

    const now = new Date()

    events.forEach((event) => {
      const eventDate = new Date(event.date)
      const eventTime = event.time || "09:00"
      const [hours, minutes] = eventTime.split(":").map(Number)
      eventDate.setHours(hours, minutes, 0, 0)

      const msUntilEvent = eventDate.getTime() - now.getTime()
      const minutesUntilEvent = msUntilEvent / (1000 * 60)

      // Skip past events
      if (msUntilEvent < 0) return

      // Morning reminder (9am on the day of the event)
      const morningReminder = new Date(event.date)
      morningReminder.setHours(9, 0, 0, 0)
      const msUntilMorning = morningReminder.getTime() - now.getTime()
      
      if (
        msUntilMorning >= 0 &&
        msUntilMorning < 60000 && // Within 1 minute of 9am
        !wasNotified(event.id, "morning")
      ) {
        showNotification(
          "IQXO - Rappel du jour",
          `${event.title} - ${event.time || "Aujourd'hui"}`,
          `${event.id}-morning`
        )
        markAsNotified(event.id, "morning")
      }

      // 1 hour before
      if (
        minutesUntilEvent > 59 &&
        minutesUntilEvent <= 60 &&
        !wasNotified(event.id, "1h")
      ) {
        showNotification(
          "IQXO - Dans 1 heure",
          `${event.title}${event.location ? ` - ${event.location}` : ""}`,
          `${event.id}-1h`
        )
        markAsNotified(event.id, "1h")
      }

      // 30 minutes before
      if (
        minutesUntilEvent > 29 &&
        minutesUntilEvent <= 30 &&
        !wasNotified(event.id, "30m")
      ) {
        showNotification(
          "IQXO - Dans 30 minutes",
          `${event.title}${event.location ? ` - ${event.location}` : ""}`,
          `${event.id}-30m`
        )
        markAsNotified(event.id, "30m")
      }
    })
  }, [events])

  // Initialize notifications
  useEffect(() => {
    // Request permission on first load
    requestPermission()

    // Check notifications every minute
    checkNotifications()
    intervalRef.current = setInterval(checkNotifications, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [requestPermission, checkNotifications])

  return { requestPermission }
}
