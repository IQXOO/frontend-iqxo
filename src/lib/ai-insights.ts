import type { IQXOEvent } from "./types"

export interface AIInsight {
  text: string
  icon: string
  type: "warning" | "suggestion" | "info"
  priority: number
}

export function generateAIInsight(event: IQXOEvent): AIInsight | null {
  const eventDate = new Date(event.date)
  const now = new Date()
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Insurance/Legal documents renewal check
  if (event.title.toLowerCase().includes("insurance") || event.title.toLowerCase().includes("renewal")) {
    if (daysUntil <= 7 && daysUntil > 0) {
      return {
        text: `${daysUntil} days left. Check renewal link?`,
        icon: "🔄",
        type: "warning",
        priority: 1,
      }
    }
  }

  // Medical/Health appointments
  if (event.title.toLowerCase().includes("doctor") || event.title.toLowerCase().includes("checkup") || event.title.toLowerCase().includes("appointment")) {
    if (event.notes?.toLowerCase().includes("fasting")) {
      return {
        text: "Remember to fast before appointment",
        icon: "🏥",
        type: "warning",
        priority: 1,
      }
    }
    if (event.notes?.toLowerCase().includes("dosage") || event.notes?.toLowerCase().includes("mg")) {
      return {
        text: "Set a reminder for next dose?",
        icon: "💊",
        type: "suggestion",
        priority: 2,
      }
    }
  }

  // Travel documents (Visa/Passport)
  if (event.title.toLowerCase().includes("visa") || event.title.toLowerCase().includes("passport")) {
    if (daysUntil <= 7 && daysUntil > 0) {
      return {
        text: `${daysUntil} days left. Check renewal process?`,
        icon: "✈️",
        type: "warning",
        priority: 1,
      }
    }
  }

  // Payment deadlines
  if (event.title.toLowerCase().includes("payment") || event.title.toLowerCase().includes("bill")) {
    if (daysUntil <= 3 && daysUntil > 0) {
      return {
        text: "Payment due soon. Set reminder?",
        icon: "💳",
        type: "warning",
        priority: 1,
      }
    }
  }

  // General upcoming events
  if (daysUntil <= 1 && daysUntil > 0) {
    return {
      text: "Happening tomorrow. All set?",
      icon: "📍",
      type: "info",
      priority: 3,
    }
  }

  return null
}

export function getSmartGreeting(userName: string | undefined, events: IQXOEvent[]): string {
  const urgentCount = events.filter(e => {
    const eventDate = new Date(e.date)
    const now = new Date()
    const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntil <= 7 && daysUntil >= 0
  }).length

  const flightCount = events.filter(e => e.title.toLowerCase().includes("flight")).length
  const name = userName?.trim() || "there"

  if (urgentCount === 0) {
    return `Hey ${name}, you're all set for today!`
  }

  let greeting = `Hey ${name}, you have ${urgentCount} urgent task${urgentCount > 1 ? "s" : ""}`
  if (flightCount > 0) {
    greeting += ` and ${flightCount} upcoming flight${flightCount > 1 ? "s" : ""}`
  }
  greeting += ". I've prioritized them for you."

  return greeting
}

export function computeCriticalityScore(event: IQXOEvent): number {
  let score = 0

  // Distance score (closer = higher priority)
  const eventDate = new Date(event.date)
  const now = new Date()
  const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  if (daysUntil <= 1) score += 40
  else if (daysUntil <= 7) score += 25
  else if (daysUntil <= 30) score += 10
  else score += 5

  // Category criticality
  const title = event.title.toLowerCase()
  if (title.includes("legal") || title.includes("visa") || title.includes("passport")) score += 30
  if (title.includes("doctor") || title.includes("medical") || title.includes("health")) score += 25
  if (title.includes("payment") || title.includes("bill") || title.includes("deadline")) score += 20
  if (title.includes("important") || title.includes("critical")) score += 15

  // Notes/details indicator
  if (event.notes && event.notes.length > 20) score += 5

  return Math.min(score, 100)
}
