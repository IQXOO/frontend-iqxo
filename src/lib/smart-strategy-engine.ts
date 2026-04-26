"use client"

import type { IQXOEvent } from "./types"

/* ---- 1. STRATEGIC RADAR: Days Remaining & Color Coding ---- */
export function calculateDaysRemaining(eventDate: string): number {
  const event = new Date(eventDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  event.setHours(0, 0, 0, 0)
  
  const diffMs = event.getTime() - today.getTime()
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, daysRemaining)
}

export function getUrgencyColor(daysRemaining: number): "red" | "orange" | "green" {
  if (daysRemaining < 7) return "red"
  if (daysRemaining < 30) return "orange"
  return "green"
}

export function getUrgencyLabel(daysRemaining: number, language: string = "en"): string {
  if (daysRemaining === 0) {
    return language === "ar" ? "النهارده" : language === "fr" ? "Aujourd'hui" : "Today"
  }
  if (daysRemaining === 1) {
    return language === "ar" ? "بكرة" : language === "fr" ? "Demain" : "Tomorrow"
  }
  if (daysRemaining < 7) {
    return language === "ar" ? `في ${daysRemaining} أيام` : language === "fr" ? `Dans ${daysRemaining}j` : `In ${daysRemaining}d`
  }
  if (daysRemaining < 30) {
    return language === "ar" ? `في أسبوع` : language === "fr" ? `Dans 1-4s` : "In 1-4w"
  }
  return language === "ar" ? `في شهر` : language === "fr" ? `Plus tard` : "Later"
}

/* ---- 2. SMART PHARMACIST: Extract Medicine Names & Dosages ---- */
export interface MedicineExtraction {
  medicineName: string
  dosage?: string
  frequency?: string
}

const MEDICINE_KEYWORDS = [
  "aspirin", "ibuprofen", "paracetamol", "acetaminophen",
  "amoxicillin", "penicillin", "antibiotics",
  "insulin", "metformin", "diabetes",
  "lisinopril", "blood pressure",
  "دواء", "حبة", "عقار", "دواء", "كبسولة"
]

export function extractMedicine(text: string): MedicineExtraction[] {
  const lowerText = text.toLowerCase()
  const results: MedicineExtraction[] = []
  
  MEDICINE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      const regex = new RegExp(`\\b${keyword}\\s*([0-9]+\\s*(mg|ml|g|units)?)?\\b`, "gi")
      const matches = regex.exec(text)
      if (matches) {
        results.push({
          medicineName: matches[0],
          dosage: matches[1] || undefined,
        })
      }
    }
  })
  
  return results
}

export function isMedicalEvent(text: string): boolean {
  return extractMedicine(text).length > 0
}

/* ---- 3. VOICE PULSE UI: Speech Recognition Helper ---- */
export function getSpeechRecognitionLanguage(language: string): string {
  switch (language) {
    case "ar":
      return "ar-SA"
    case "fr":
      return "fr-FR"
    default:
      return "en-US"
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false
  const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition
  return !!SpeechRecognition
}

/* ---- 4. SMART COMPRESSION: Image Compression Before Upload ---- */
export async function compressImage(
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          quality
        )
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

/* ---- 5. DEEP TABLE EXTRACTION: Structured Data to Markdown ---- */
export interface TableData {
  headers: string[]
  rows: string[][]
}

export function extractTableFromText(text: string): TableData | null {
  // Simple pattern: look for lines with pipes (|)
  const lines = text.split("\n").filter(line => line.includes("|"))
  if (lines.length < 2) return null

  const headers = lines[0]
    .split("|")
    .map(h => h.trim())
    .filter(h => h)
  
  const rows = lines.slice(1)
    .map(line =>
      line
        .split("|")
        .map(cell => cell.trim())
        .filter(c => c)
    )
    .filter(row => row.length === headers.length)

  return rows.length > 0 ? { headers, rows } : null
}

export function tableToMarkdown(data: TableData): string {
  const headerRow = "| " + data.headers.join(" | ") + " |"
  const separatorRow = "|" + data.headers.map(() => " --- ").join("|") + "|"
  const bodyRows = data.rows
    .map(row => "| " + row.join(" | ") + " |")
    .join("\n")

  return [headerRow, separatorRow, bodyRows].join("\n")
}

/* ---- 6. TEMPORAL FILTERING: Tab-based Filtering ---- */
export type FilterTab = "today" | "tomorrow" | "future" | "archive"

export function filterEventsByTab(
  events: IQXOEvent[],
  tab: FilterTab
): IQXOEvent[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const endOfTomorrow = new Date(tomorrow)
  endOfTomorrow.setHours(23, 59, 59, 999)

  return events.filter(event => {
    const eventDate = new Date(event.date)
    eventDate.setHours(0, 0, 0, 0)

    switch (tab) {
      case "today":
        return eventDate.getTime() === today.getTime()
      case "tomorrow":
        return eventDate.getTime() === tomorrow.getTime()
      case "future":
        return eventDate.getTime() > endOfTomorrow.getTime()
      case "archive":
        return eventDate.getTime() < today.getTime()
      default:
        return false
    }
  })
}

/* ---- 7. REAL-TIME SEARCH: Filter Across All Events ---- */
export function searchEvents(events: IQXOEvent[], query: string): IQXOEvent[] {
  const lowerQuery = query.toLowerCase()
  return events.filter(event =>
    event.title.toLowerCase().includes(lowerQuery) ||
    event.notes.toLowerCase().includes(lowerQuery) ||
    event.location?.toLowerCase().includes(lowerQuery) ||
    event.phone?.includes(query)
  )
}

/* ---- 8. SMART ACTIONS: Generate Links for Maps & Phone ---- */
export function getGoogleMapsURL(location: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(location)}`
}

export function getTelLink(phone: string): string {
  return `tel:${phone}`
}

export function getWhatsAppLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`
}

/* ---- 9. CONTENT CATEGORIZATION: Smart Category Detection ---- */
export type ContentCategory =
  | "medical"
  | "work"
  | "personal"
  | "travel"
  | "finance"
  | "other"

const CATEGORY_KEYWORDS: Record<ContentCategory, string[]> = {
  medical: [
    "doctor", "appointment", "hospital", "clinic", "checkup", "medicine",
    "prescription", "دكتور", "عيادة", "فحص"
  ],
  work: [
    "meeting", "conference", "presentation", "project", "deadline", "work",
    "اجتماع", "عمل", "مشروع"
  ],
  travel: [
    "trip", "flight", "hotel", "travel", "vacation", "drive",
    "رحلة", "سفر", "عطلة"
  ],
  finance: [
    "payment", "invoice", "tax", "insurance", "renewal", "bill",
    "دفع", "فاتورة", "ضريبة"
  ],
  personal: [
    "birthday", "anniversary", "friend", "family", "shopping", "hobby",
    "عيد ميلاد", "عائلة", "صديق"
  ],
  other: [],
}

export function categorizeEvent(event: IQXOEvent): ContentCategory {
  const textToSearch = (event.title + " " + event.notes).toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => textToSearch.includes(keyword))) {
      return category as ContentCategory
    }
  }

  return "other"
}

/* ---- EXPORT ALL FOR EXTERNAL USE ---- */
export const SmartStrategyEngine = {
  // Strategic Radar
  calculateDaysRemaining,
  getUrgencyColor,
  getUrgencyLabel,

  // Smart Pharmacist
  extractMedicine,
  isMedicalEvent,

  // Voice Pulse
  getSpeechRecognitionLanguage,
  isSpeechRecognitionSupported,

  // Smart Compression
  compressImage,

  // Deep Table
  extractTableFromText,
  tableToMarkdown,

  // Temporal Filtering
  filterEventsByTab,

  // Search
  searchEvents,

  // Smart Actions
  getGoogleMapsURL,
  getTelLink,
  getWhatsAppLink,

  // Categorization
  categorizeEvent,
}
