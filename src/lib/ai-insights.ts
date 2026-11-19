import type { IQXOEvent } from "./types"
import { normalizeCategoryText } from "./event-category"

export interface AIInsight {
  text: string
  icon: string
  type: "warning" | "suggestion" | "info"
  priority: number
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesInsightKeyword(normText: string, keyword: string): boolean {
  const normKw = normalizeCategoryText(keyword).trim();
  if (!normKw) return false;

  if (normKw.includes(" ")) {
    return normText.includes(normKw);
  }

  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normKw)}([^\\p{L}\\p{N}]|$)`, "u");
  return regex.test(normText);
}

function matchesAnyInsight(normText: string, keywords: string[]): boolean {
  return keywords.some((kw) => matchesInsightKeyword(normText, kw));
}

// Multilingual keywords for Insights (EN / FR / AR)
const INSIGHT_PAYMENT_KEYWORDS = [
  // English
  "payment", "bill", "invoice", "due", "rent", "installment", "tuition", "bank", "credit card", "utility", "loan", "tax",
  // French
  "paiement", "facture", "payer", "loyer", "echeance", "échéance", "banque", "virement", "prelevement", "prélèvement", "reglement", "règlement", "credit", "crédit", "frais",
  // Arabic
  "دفع", "فاتورة", "فاتوره", "فواتير", "سداد", "تسديد", "قسط", "اقساط", "أقساط", "بنك", "ايجار", "إيجار", "مصاريف", "رسوم", "مستحقات", "مديونية", "مديونيه"
];

const INSIGHT_MEDICAL_KEYWORDS = [
  // English
  "doctor", "dr", "dr.", "dentist", "clinic", "hospital", "checkup", "appointment", "consultation", "medical", "physician",
  // French
  "medecin", "médecin", "docteur", "dr", "dr.", "dentiste", "clinique", "hopital", "hôpital", "rdv", "rendez-vous", "consultation", "medical", "médical",
  // Arabic
  "طبيب", "دكتور", "د.", "عيادة", "عياده", "مستشفى", "مستشفي", "كشف", "فحص", "تحليل", "تحاليل", "اسنان", "أسنان", "موعد طبي", "روشتة", "روشته"
];

const INSIGHT_INSURANCE_KEYWORDS = [
  // English
  "insurance", "renewal", "renew", "policy", "subscription",
  // French
  "assurance", "renouvellement", "renouveler", "mutuelle", "abonnement",
  // Arabic
  "تامين", "تأمين", "تجديد", "بوليصة", "بوليصه", "اشتراك"
];

const INSIGHT_TRAVEL_DOC_KEYWORDS = [
  // English
  "visa", "passport", "boarding pass", "flight",
  // French
  "visa", "passeport", "titre de sejour", "titre de séjour", "carte de sejour", "carte de séjour", "vol", "billet d'avion",
  // Arabic
  "تاشيرة", "تأشيرة", "تاشيره", "فيزا", "جواز", "جواز سفر", "اقامة", "إقامة", "اقامه", "طيران", "تذكرة طيران"
];

const INSIGHT_URGENT_KEYWORDS = [
  // English
  "urgent", "critical", "emergency", "asap", "important", "priority",
  // French
  "urgent", "urgence", "critique", "important", "importante", "prioritaire",
  // Arabic
  "عاجل", "طارئ", "حرج", "مهم", "مهمة", "مهمه", "هام", "ضروري", "ضروري جدا", "أولوية", "اولوية"
];

export function generateAIInsight(event: IQXOEvent, language: string = "en"): AIInsight | null {
  const eventDate = new Date(event.date)
  const now = new Date()
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const normTitle = normalizeCategoryText(event.title || "");
  const normNotes = normalizeCategoryText(event.notes || "");

  // 1. Insurance/Legal documents renewal check (EN / FR / AR)
  if (matchesAnyInsight(normTitle, INSIGHT_INSURANCE_KEYWORDS)) {
    if (daysUntil <= 7 && daysUntil > 0) {
      return {
        text: language === "ar"
          ? `متبقي ${daysUntil} أيام. التحقق من رابط التجديد؟`
          : language === "fr"
          ? `${daysUntil} jours restants. Vérifier le lien ?`
          : `${daysUntil} days left. Check renewal link?`,
        icon: "🔄",
        type: "warning",
        priority: 1,
      }
    }
  }

  // 2. Medical/Health appointments (EN / FR / AR)
  if (matchesAnyInsight(normTitle, INSIGHT_MEDICAL_KEYWORDS)) {
    if (
      normNotes.includes("fasting") ||
      normNotes.includes("jeune") ||
      normNotes.includes("صيام") ||
      normNotes.includes("صائم")
    ) {
      return {
        text: language === "ar"
          ? "تذكر الصيام قبل الموعد"
          : language === "fr"
          ? "N'oubliez pas de jeûner avant le rendez-vous"
          : "Remember to fast before appointment",
        icon: "🏥",
        type: "warning",
        priority: 1,
      }
    }
    if (
      normNotes.includes("dosage") ||
      normNotes.includes("dose") ||
      normNotes.includes("mg") ||
      normNotes.includes("posologie") ||
      normNotes.includes("جرعة") ||
      normNotes.includes("جرعه") ||
      normNotes.includes("علاج") ||
      normNotes.includes("دواء")
    ) {
      return {
        text: language === "ar"
          ? "ضبط تذكير للجرعة القادمة؟"
          : language === "fr"
          ? "Rappel pour la prochaine dose ?"
          : "Set a reminder for next dose?",
        icon: "💊",
        type: "suggestion",
        priority: 2,
      }
    }
  }

  // 3. Travel documents (Visa/Passport/Flight) (EN / FR / AR)
  if (matchesAnyInsight(normTitle, INSIGHT_TRAVEL_DOC_KEYWORDS)) {
    if (daysUntil <= 7 && daysUntil > 0) {
      return {
        text: language === "ar"
          ? `متبقي ${daysUntil} أيام. التحقق من التجديد؟`
          : language === "fr"
          ? `${daysUntil} jours restants. Vérifier le renouvellement ?`
          : `${daysUntil} days left. Check renewal process?`,
        icon: "✈️",
        type: "warning",
        priority: 1,
      }
    }
  }

  // 4. Payment & Bill deadlines (EN / FR / AR)
  if (matchesAnyInsight(normTitle, INSIGHT_PAYMENT_KEYWORDS)) {
    if (daysUntil <= 3 && daysUntil > 0) {
      return {
        text: language === "ar"
          ? "موعد الدفع قريب. ضبط تذكير؟"
          : language === "fr"
          ? "Paiement bientôt dû. Ajouter un rappel ?"
          : "Payment due soon. Set reminder?",
        icon: "💳",
        type: "warning",
        priority: 1,
      }
    }
  }

  // 5. General upcoming events
  if (daysUntil <= 1 && daysUntil > 0) {
    return {
      text: language === "ar"
        ? "الحدث غداً. هل كل شيء جاهز؟"
        : language === "fr"
        ? "Prévu demain. Tout est prêt ?"
        : "Happening tomorrow. All set?",
      icon: "📍",
      type: "info",
      priority: 3,
    }
  }

  return null
}

const FLIGHT_KEYWORDS = [
  "flight", "vol", "avion", "طيران", "رحلة طيران", "طياره", "طيارة"
];

export function getSmartGreeting(userName: string | undefined, events: IQXOEvent[], language: string = "en"): string {
  const urgentCount = events.filter(e => {
    const eventDate = new Date(e.date)
    const now = new Date()
    const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntil <= 7 && daysUntil >= 0
  }).length

  const flightCount = events.filter(e => {
    const norm = normalizeCategoryText(e.title || "");
    return matchesAnyInsight(norm, FLIGHT_KEYWORDS);
  }).length

  const name = userName?.trim() || (language === "ar" ? "صديقي" : language === "fr" ? "l'ami" : "there")

  if (urgentCount === 0) {
    if (language === "ar") {
      return `مرحباً ${name}، كل شيء جاهز ومنظم لليوم!`
    }
    if (language === "fr") {
      return `Bonjour ${name}, tout est prêt pour aujourd'hui !`
    }
    return `Hey ${name}, you're all set for today!`
  }

  if (language === "ar") {
    let greeting = `مرحباً ${name}، لديك ${urgentCount} مهام عاجلة`
    if (flightCount > 0) {
      greeting += ` و ${flightCount} رحلة طيران قادمة`
    }
    greeting += ". لقد قمت بترتيب الأولوية لك."
    return greeting
  }

  if (language === "fr") {
    let greeting = `Bonjour ${name}, vous avez ${urgentCount} tâche${urgentCount > 1 ? "s" : ""} urgente${urgentCount > 1 ? "s" : ""}`
    if (flightCount > 0) {
      greeting += ` et ${flightCount} vol${flightCount > 1 ? "s" : ""} à venir`
    }
    greeting += ". Je les ai priorisées pour vous."
    return greeting
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

  // Category criticality (Multilingual EN / FR / AR)
  const normTitle = normalizeCategoryText(event.title || "")

  if (matchesAnyInsight(normTitle, INSIGHT_TRAVEL_DOC_KEYWORDS)) score += 30
  if (matchesAnyInsight(normTitle, INSIGHT_MEDICAL_KEYWORDS)) score += 25
  if (matchesAnyInsight(normTitle, INSIGHT_PAYMENT_KEYWORDS)) score += 20
  if (matchesAnyInsight(normTitle, INSIGHT_URGENT_KEYWORDS)) score += 15

  // Notes/details indicator
  if (event.notes && event.notes.length > 20) score += 5

  return Math.min(score, 100)
}
