import type { IQXOEvent } from "./types";

export type EventCategory =
  | "health"
  | "work"
  | "travel"
  | "documents"
  | "education"
  | "urgent"
  | "personal"
  | "other";

export interface CategoryDetails {
  category: EventCategory;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a phrase or word matches inside the text with proper boundary protection.
 * - Multi-word phrases are checked directly.
 * - Single words use Unicode-aware word boundaries to prevent false substring matches
 *   (e.g., 'dr' will NOT match inside 'drive' or 'children'; 'tax' will NOT match 'syntax').
 */
function matchesKeyword(text: string, keyword: string): boolean {
  const lowerKw = keyword.toLowerCase().trim();
  if (!lowerKw) return false;

  if (lowerKw.includes(" ")) {
    return text.includes(lowerKw);
  }

  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(lowerKw)}([^\\p{L}\\p{N}]|$)`, "u");
  return regex.test(text);
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => matchesKeyword(text, kw));
}

// 🏥 Health & Medical Keywords (EN / FR / AR)
const HEALTH_KEYWORDS = [
  // French
  "médecin", "docteur", "dr", "dr.", "médical", "médicale", "santé", "clinique",
  "hôpital", "hopital", "dentiste", "dentaire", "médicament", "ordonnance", "pharmacie",
  "vaccin", "vaccination", "consultation", "cabinet médical", "laboratoire",
  "analyse", "prise de sang", "radiologie", "radiographie", "échographie", "irm", "scanner",
  "ophtalmo", "ophtalmologue", "kiné", "kinésithérapeute", "cardiologue", "pédiatre",
  "gynécologue", "dermatologue", "chirurgien", "chirurgie", "soin", "soins", "infirmier",
  "infirmière", "urgences", "patient", "maladie", "rendez-vous médical", "examen médical",
  "doctolib", "bilan de santé", "traitement", "posologie", "qare", "suivi médical",
  // English
  "doctor", "dr", "dr.", "medical", "health", "clinic", "hospital", "dentist", "dental",
  "medicine", "medication", "prescription", "rx", "therapy", "pharmacy", "vaccine",
  "vaccination", "checkup", "check-up", "blood test", "lab", "laboratory",
  "radiology", "ultrasound", "mri", "ct scan", "x-ray", "consultation", "patient",
  "physician", "surgeon", "pediatrician", "cardiology", "dermatology", "ophthalmology",
  "nurse", "emergency room", "general practitioner", "gp", "follow-up", "physiotherapy",
  // Arabic
  "طبيب", "دكتور", "د.", "مستشفى", "عيادة", "صحة", "طبي", "طبية", "دواء", "علاج",
  "أسنان", "كشف", "فحص", "تحليل", "روشتة", "صيدلية", "لقاح", "تطعيم", "عملية",
  "أشعة", "استشارة", "متابعة طبية", "مريض", "جراحة", "طوارئ", "ممرض", "ممرضة", "نفسي",
  "جلدية", "باطنة", "أطفال", "عيون", "علاج طبيعي", "سونار", "رنين", "فحص دوري"
];

// 💼 Work & Professional Keywords (EN / FR / AR)
const WORK_KEYWORDS = [
  // French
  "travail", "bureau", "réunion", "professionnel", "entretien", "conférence",
  "projet", "client", "stage", "poste", "shift", "horaire", "emploi", "collègue",
  "entreprise", "chantier", "mission", "point d'équipe", "présentation", "télétravail",
  "planning", "point hebdo", "call client",
  // English
  "work", "job", "office", "meeting", "conference", "presentation", "project",
  "deadline", "interview", "client", "shift", "schedule", "career", "business",
  "colleague", "team sync", "standup", "briefing", "sync", "coworker",
  // Arabic
  "عمل", "شغل", "وظيفة", "مكتب", "اجتماع", "دوام", "شيفت", "مشروع",
  "مقابلة عمل", "مؤتمر", "عرض تقديمي", "عميل", "مهني", "فريق العمل", "شركة", "مناوبة"
];

// ✈️ Travel & Transportation Keywords (EN / FR / AR)
const TRAVEL_KEYWORDS = [
  // French
  "voyage", "vol", "avion", "aéroport", "aeroport", "billet d'avion", "billet de train",
  "gare", "sncf", "train", "hôtel", "hotel", "vacances", "réservation hôtel", "séjour",
  "déplacement", "croisière", "embarquement", "terminal", "air france",
  // English
  "flight", "airport", "airline", "boarding pass", "hotel", "train station",
  "trip", "travel", "vacation", "flight booking", "hotel booking", "transit", "reservation",
  "cruise", "departure", "arrival", "hostel", "airbnb",
  // Arabic
  "سفر", "رحلة سفر", "طيران", "مطار", "تذكرة طيران", "تذكرة قطار", "حجز فندق", "فندق",
  "محطة القطار", "إجازة", "عطلة", "حقائب سفر", "مغادرة", "وصول", "سياحة"
];

// 📄 Official Documents, Legal & Administrative Keywords (EN / FR / AR)
// Specifically targeted to avoid classifying casual tasks, notes, or tickets as documents!
const DOC_KEYWORDS = [
  // French
  "passeport", "carte d'identité", "carte nationale d'identité", "cni", "titre de séjour",
  "carte de séjour", "assurance", "mutuelle", "assurance habitation", "assurance auto",
  "contrat", "contrat de travail", "bail", "acte notarié", "notaire", "facture",
  "quittance", "quittance de loyer", "avis d'imposition", "impôt", "impôts", "taxe foncière",
  "taxe d'habitation", "permis de conduire", "relevé bancaire", "compte bancaire", "rib",
  "bulletin de paie", "fiche de paie", "bulletin de salaire", "attestation",
  "justificatif de domicile", "carte vitale", "préfecture", "france travail", "pole emploi",
  "ameli", "caf",
  // English
  "passport", "visa", "residence permit", "green card", "national id", "id card",
  "driver's license", "insurance", "insurance policy", "health insurance", "car insurance",
  "contract", "lease agreement", "rental agreement", "invoice", "utility bill",
  "tax return", "tax bill", "property tax", "bank statement", "financial statement",
  "payslip", "pay stub", "birth certificate", "marriage certificate", "notary",
  "affidavit", "power of attorney", "legal document", "official document",
  // Arabic
  "جواز سفر", "جواز", "تأشيرة", "فيزا", "إقامة", "تجديد إقامة", "بطاقة شخصية",
  "بطاقة هوية", "رقم قومي", "رخصة قيادة", "رخصة سيارة", "عقد إيجار", "عقد عمل",
  "عقد بيع", "توكيل رسمي", "توكيل", "تأمين صحي", "تأمين سيارة", "بوليصة تأمين",
  "فاتورة كهرباء", "فاتورة مياه", "فاتورة غاز", "إقرار ضريبي", "ضرائب", "ضريبة",
  "كشف حساب بنكي", "كشف حساب", "مفردات مرتب", "شهادة ميلاد", "شهادة تخرج",
  "قيد عائلي", "معاملة حكومية", "سجل مدني", "شهر عقاري"
];

// 🎓 Education & Learning Keywords (EN / FR / AR)
const EDUCATION_KEYWORDS = [
  // French
  "cours", "classe", "école", "ecole", "université", "universite", "formation",
  "professeur", "prof", "devoir", "leçon", "atelier", "étude", "amphi",
  "lycée", "collège", "rattrapage", "soutenance", "examen scolaire", "partiel", "campus",
  // English
  "course", "class", "lecture", "university", "school", "homework", "study",
  "workshop", "lesson", "tutorial", "student", "academy", "college", "syllabus",
  // Arabic
  "دراسة", "مدرسة", "جامعة", "محاضرة", "درس", "كورس", "واجب",
  "تدريب", "ورشة عمل", "أكاديمية", "كلية", "طالب", "فصل دراسي", "تخرج"
];

// 🔴 Urgent Keywords (EN / FR / AR)
const URGENT_KEYWORDS = [
  // French
  "urgent", "urgence", "immédiat", "prioritaire", "critique",
  // English
  "urgent", "urgency", "emergency", "critical", "asap", "immediate",
  // Arabic
  "عاجل", "طارئ", "ضروري جدا", "فوري", "حرج"
];

// ✨ Personal & Social Keywords (EN / FR / AR)
const PERSONAL_KEYWORDS = [
  // French
  "anniversaire", "fête", "famille", "ami", "dîner", "déjeuner", "mariage",
  "soirée", "sport", "gym", "fitness", "musculation", "courses", "café",
  "cinéma", "concert", "weekend", "cadeau", "repas", "match", "invitation", "anniv",
  // English
  "birthday", "anniversary", "party", "family", "friend", "dinner", "lunch",
  "wedding", "sport", "gym", "workout", "coffee", "cinema", "movie",
  "shopping", "weekend", "brunch", "celebration", "fitness",
  // Arabic
  "عيد ميلاد", "حفلة", "عائلة", "صديق", "غداء", "عشاء", "زفاف", "فرح",
  "خطوبة", "رياضة", "جيم", "تمرين", "قهوة", "تسوق", "سينما", "شخصي", "عزومة", "احتفال"
];

/**
 * Categorizes an event into a semantic category based on its real content (title, notes, location, source).
 * Important: An attachment (PDF or image) is just a medium, NOT a category.
 * If the PDF contains a medical appointment, it is 'health'.
 * If it contains a concert or dinner invite, it is 'personal'.
 * It only becomes 'documents' if it is an actual administrative, legal, or financial document.
 */
export function categorizeEvent(event: IQXOEvent): EventCategory {
  const src = (event.source || "").toLowerCase();

  // 1. Explicit work shift sources
  if (src.includes("work") || src.includes("schedule")) {
    return "work";
  }

  const text = `${event.title || ""} ${event.notes || ""} ${event.location || ""}`.toLowerCase();

  // 2. Health & Medical has top domain precedence (e.g. "Examen Médical & Suivi - Dr Dubois")
  if (matchesAny(text, HEALTH_KEYWORDS)) {
    return "health";
  }

  // 3. Travel & Transportation
  if (matchesAny(text, TRAVEL_KEYWORDS)) {
    return "travel";
  }

  // 4. Documents & Administrative & Finance (Strict keywords only)
  if (matchesAny(text, DOC_KEYWORDS)) {
    return "documents";
  }

  // 5. Education & Studies
  if (matchesAny(text, EDUCATION_KEYWORDS)) {
    return "education";
  }

  // 6. Work keywords (meetings, projects, clients)
  if (matchesAny(text, WORK_KEYWORDS)) {
    return "work";
  }

  // 7. Explicit urgent keywords
  if (matchesAny(text, URGENT_KEYWORDS)) {
    return "urgent";
  }

  // 8. Personal keywords (parties, dinner, birthdays, gym)
  if (matchesAny(text, PERSONAL_KEYWORDS)) {
    return "personal";
  }

  // 9. Default fallback: Any regular everyday task or unclassified note is 'personal'
  return "personal";
}

/**
 * Returns full presentation metadata (label, emoji, color, bg, border) for an event's category.
 * Fully localized for English, French, and Arabic.
 */
export function getEventCategoryDetails(
  event: IQXOEvent,
  language: string = "en"
): CategoryDetails {
  const cat = categorizeEvent(event);

  switch (cat) {
    case "health":
      return {
        category: "health",
        label: language === "ar" ? "صحة" : language === "fr" ? "Santé" : "Health",
        emoji: "🏥",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
      };
    case "work":
      return {
        category: "work",
        label: language === "ar" ? "عمل" : language === "fr" ? "Travail" : "Work",
        emoji: "💼",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
      };
    case "travel":
      return {
        category: "travel",
        label: language === "ar" ? "سفر" : language === "fr" ? "Voyage" : "Travel",
        emoji: "✈️",
        color: "text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-500/20",
      };
    case "documents":
      return {
        category: "documents",
        label: language === "ar" ? "مستندات" : language === "fr" ? "Documents" : "Documents",
        emoji: "📄",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
      };
    case "education":
      return {
        category: "education",
        label: language === "ar" ? "دراسة" : language === "fr" ? "Études" : "Education",
        emoji: "🎓",
        color: "text-indigo-400",
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/20",
      };
    case "urgent":
      return {
        category: "urgent",
        label: language === "ar" ? "عاجل" : language === "fr" ? "Urgent" : "Urgent",
        emoji: "🔴",
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
      };
    case "personal":
    default:
      return {
        category: "personal",
        label: language === "ar" ? "شخصي" : language === "fr" ? "Personnel" : "Personal",
        emoji: "✨",
        color: "text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
      };
  }
}

/**
 * Checks if an event is considered an official document/administrative event.
 */
export function isDocumentEvent(event: IQXOEvent): boolean {
  return categorizeEvent(event) === "documents";
}
