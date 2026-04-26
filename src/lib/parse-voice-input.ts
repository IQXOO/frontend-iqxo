/**
 * Parse natural language voice input to extract event details
 * Supports French and English patterns
 */

export interface ParsedEvent {
  title: string
  date?: string
  time?: string
  location?: string
  phone?: string
}

export function parseVoiceInput(text: string): ParsedEvent {
  const now = new Date()
  let date: string | undefined
  let time: string | undefined
  let location: string | undefined
  let phone: string | undefined
  let cleanedText = text

  // ---- Date extraction ----
  
  // Today (aujourd'hui, today)
  if (/\b(aujourd'hui|today)\b/i.test(text)) {
    date = formatDate(now)
    cleanedText = cleanedText.replace(/\b(aujourd'hui|today)\b/gi, "")
  }
  
  // Tomorrow (demain, tomorrow)
  if (/\b(demain|tomorrow)\b/i.test(text)) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    date = formatDate(tomorrow)
    cleanedText = cleanedText.replace(/\b(demain|tomorrow)\b/gi, "")
  }
  
  // Day after tomorrow (après-demain, day after tomorrow)
  if (/\b(après-demain|après demain|day after tomorrow)\b/i.test(text)) {
    const dayAfter = new Date(now)
    dayAfter.setDate(dayAfter.getDate() + 2)
    date = formatDate(dayAfter)
    cleanedText = cleanedText.replace(/\b(après-demain|après demain|day after tomorrow)\b/gi, "")
  }
  
  // Next week (la semaine prochaine, next week)
  if (/\b(semaine prochaine|la semaine prochaine|next week)\b/i.test(text)) {
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    date = formatDate(nextWeek)
    cleanedText = cleanedText.replace(/\b(la\s+)?semaine prochaine|next week\b/gi, "")
  }
  
  // Days of week (lundi, mardi, etc. / monday, tuesday, etc.)
  const frDays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
  const enDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  
  for (let i = 0; i < 7; i++) {
    const frPattern = new RegExp(`\\b${frDays[i]}\\b`, "i")
    const enPattern = new RegExp(`\\b${enDays[i]}\\b`, "i")
    
    if (frPattern.test(text) || enPattern.test(text)) {
      const targetDay = i
      const currentDay = now.getDay()
      let daysUntil = targetDay - currentDay
      if (daysUntil <= 0) daysUntil += 7
      
      const targetDate = new Date(now)
      targetDate.setDate(targetDate.getDate() + daysUntil)
      date = formatDate(targetDate)
      cleanedText = cleanedText.replace(frPattern, "").replace(enPattern, "")
      break
    }
  }
  
  // Specific date format: "le 15 mars", "on march 15", "15/03", "15-03"
  const frDateMatch = text.match(/\ble\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b/i)
  if (frDateMatch) {
    const day = parseInt(frDateMatch[1])
    const monthName = frDateMatch[2].toLowerCase()
    const frMonths: Record<string, number> = {
      janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10,
      décembre: 11, decembre: 11
    }
    const month = frMonths[monthName]
    if (month !== undefined) {
      const targetDate = new Date(now.getFullYear(), month, day)
      if (targetDate < now) targetDate.setFullYear(targetDate.getFullYear() + 1)
      date = formatDate(targetDate)
      cleanedText = cleanedText.replace(frDateMatch[0], "")
    }
  }
  
  // ---- Time extraction ----
  
  // "à 14h30", "at 2pm", "at 14:30", "à 9 heures"
  const timePatterns = [
    /\b(?:à|a|at)\s*(\d{1,2})\s*[h:]\s*(\d{2})?\b/i,
    /\b(?:à|a|at)\s*(\d{1,2})\s*(?:heures?|h)?\s*(du matin|du soir)?\b/i,
    /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i,
    /\b(\d{1,2})\s*(am|pm)\b/i,
  ]
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      let hours = parseInt(match[1])
      const minutes = match[2] ? parseInt(match[2]) : 0
      
      // Handle AM/PM
      const ampm = match[3]?.toLowerCase() || match[2]?.toLowerCase()
      if (ampm === "pm" && hours < 12) hours += 12
      if (ampm === "am" && hours === 12) hours = 0
      if (ampm === "du soir" && hours < 12) hours += 12
      
      if (hours >= 0 && hours < 24) {
        time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
        cleanedText = cleanedText.replace(match[0], "")
      }
      break
    }
  }
  
  // ---- Location extraction ----
  
  // "au 12 rue ...", "at the ...", "chez ...", "à ..."
  const locationPatterns = [
    /\b(?:au|à|chez|at|at the|in)\s+(.+?)(?:\s+(?:à|at|demain|tomorrow|aujourd'hui|today|\d{1,2}[h:])|$)/i,
  ]
  
  // More specific location patterns
  const locMatch = text.match(/\b(?:au|à|chez)\s+(\d+\s+(?:rue|avenue|boulevard|place|chemin).+?)(?:\s+(?:à|demain|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)|\.|,|$)/i)
  if (locMatch) {
    location = locMatch[1].trim()
    cleanedText = cleanedText.replace(locMatch[0], "")
  } else {
    // Try English pattern
    const enLocMatch = text.match(/\b(?:at|at the|in)\s+(\d+.+?)(?:\s+(?:at|tomorrow|today|on)|\.|,|$)/i)
    if (enLocMatch) {
      location = enLocMatch[1].trim()
      cleanedText = cleanedText.replace(enLocMatch[0], "")
    }
  }
  
  // ---- Phone extraction ----
  
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}/)
  if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 8) {
    phone = phoneMatch[0].trim()
    cleanedText = cleanedText.replace(phoneMatch[0], "")
  }
  
  // ---- Clean title ----
  
  // Remove common filler words
  cleanedText = cleanedText
    .replace(/\b(rendez-vous|rdv|meeting|appointment)\s*/gi, "")
    .replace(/\b(pour|for|avec|with)\s+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
  
  // Capitalize first letter
  const title = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1)
  
  return {
    title: title || text,
    date,
    time,
    location,
    phone,
  }
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}
