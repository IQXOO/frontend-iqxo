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

// 🏥 Health & Medical Keywords (EN / FR / AR)
const HEALTH_KEYWORDS = [
  // French
  "médecin", "docteur", "dr", "dr.", "médical", "médicale", "santé", "clinique",
  "hôpital", "hopital", "dentiste", "dentaire", "médicament", "ordonnance", "pharmacie",
  "vaccin", "vaccination", "suivi", "consultation", "cabinet médical", "laboratoire",
  "analyse", "prise de sang", "radiologie", "radio", "échographie", "irm", "scanner",
  "ophtalmo", "ophtalmologue", "kiné", "kinésithérapeute", "cardiologue", "pédiatre",
  "gynécologue", "dermatologue", "chirurgien", "chirurgie", "soin", "soins", "infirmier",
  "infirmière", "urgences", "patient", "maladie", "rendez-vous médical", "examen médical",
  "doctolib", "bilan de santé", "traitement", "posologie", "qare",
  // English
  "doctor", "medical", "health", "clinic", "hospital", "dentist", "dental",
  "medicine", "medication", "prescription", "rx", "therapy", "pharmacy", "vaccine",
  "vaccination", "checkup", "check-up", "blood test", "lab", "laboratory",
  "radiology", "ultrasound", "mri", "ct scan", "x-ray", "consultation", "patient",
  "physician", "surgeon", "pediatrician", "cardiology", "dermatology", "ophthalmology",
  "nurse", "emergency room", "general practitioner", "gp", "follow-up", "physiotherapy",
  // Arabic
  "طبيب", "دكتور", "د.", "مستشفى", "عيادة", "صحة", "طبي", "طبية", "دواء", "علاج",
  "أسنان", "كشف", "فحص", "تحليل", "روشتة", "صيدلية", "لقاح", "تطعيم", "عملية",
  "أشعة", "استشارة", "متابعة", "مريض", "جراحة", "طوارئ", "ممرض", "ممرضة", "نفسي",
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
  "voyage", "vol", "avion", "aéroport", "aeroport", "billet", "gare", "sncf",
  "train", "hôtel", "hotel", "vacances", "réservation", "sejour", "séjour",
  "déplacement", "croisière", "bagage", "embarquement", "terminal", "air france",
  // English
  "flight", "airport", "airline", "boarding", "hotel", "train", "station",
  "trip", "travel", "vacation", "booking", "luggage", "transit", "reservation",
  "cruise", "departure", "arrival", "hostel", "airbnb",
  // Arabic
  "سفر", "رحلة", "طيران", "مطار", "تذكرة", "فندق", "حجز فندق", "قطار",
  "محطة", "إجازة", "عطلة", "حجز", "حقائب", "مغادرة", "وصول", "سياحة"
];

// 📄 Documents & Finance Keywords (EN / FR / AR)
const DOC_KEYWORDS = [
  // French
  "passeport", "assurance", "contrat", "permis", "facture", "quittance", "impôt",
  "impots", "carte d'identité", "titre de séjour", "banque", "reçu", "formulaire",
  "attestation", "justificatif", "préfecture", "loyer", "mutuelle", "rib",
  "relevé", "paiement", "notaire", "taxe", "carte vitale",
  // English
  "insurance", "passport", "visa", "document", "contract", "license", "bill",
  "receipt", "invoice", "tax", "identity", "id card", "ticket", "certificate",
  "policy", "statement", "form", "permit", "bank", "payment", "renewal", "lease",
  // Arabic
  "وثيقة", "مستند", "جواز", "فيزا", "تأشيرة", "تأمين", "عقد", "رخصة", "فاتورة",
  "ايصال", "إيصال", "ضريبة", "بطاقة", "شهادة", "ورقة", "هوية", "ملف", "استمارة",
  "إقامة", "بطاقة شخصية", "بنك", "تجديد", "إيجار", "معاملة", "كشف حساب"
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
  "عاجل", "طارئ", "ضروري", "فوري", "حرج"
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
 * Categorizes an event into a semantic category based on its title, notes, location, and source.
 */
export function categorizeEvent(event: IQXOEvent): EventCategory {
  const src = (event.source || "").toLowerCase();

  // 1. Explicit work shift sources
  if (src.includes("work") || src.includes("schedule")) {
    return "work";
  }

  const text = `${event.title || ""} ${event.notes || ""} ${event.location || ""} ${event.link || ""}`.toLowerCase();

  // 2. Health & Medical has top domain precedence (e.g. "Examen Médical & Suivi - Dr Dubois")
  if (HEALTH_KEYWORDS.some((kw) => text.includes(kw))) {
    return "health";
  }

  // 3. Travel & Transportation
  if (TRAVEL_KEYWORDS.some((kw) => text.includes(kw))) {
    return "travel";
  }

  // 4. Documents & Administrative & Finance
  if (DOC_KEYWORDS.some((kw) => text.includes(kw)) || src === "document") {
    return "documents";
  }

  // 5. Education & Studies
  if (EDUCATION_KEYWORDS.some((kw) => text.includes(kw))) {
    return "education";
  }

  // 6. Work keywords (meetings, projects, clients)
  if (WORK_KEYWORDS.some((kw) => text.includes(kw))) {
    return "work";
  }

  // 7. Explicit urgent keywords
  if (URGENT_KEYWORDS.some((kw) => text.includes(kw))) {
    return "urgent";
  }

  // 8. Personal keywords
  if (PERSONAL_KEYWORDS.some((kw) => text.includes(kw))) {
    return "personal";
  }

  // 9. Document attachment fallback (if not already matched)
  if (
    Boolean(event.image_url) ||
    Boolean(event.pdf_url) ||
    src === "upload" ||
    src === "photo"
  ) {
    return "documents";
  }

  // 10. Default fallback
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
 * Checks if an event is considered a processed document (accounting for attachments without misclassifying health or travel).
 */
export function isDocumentEvent(event: IQXOEvent): boolean {
  const cat = categorizeEvent(event);
  if (cat === "documents") {
    return true;
  }
  if (cat === "health" || cat === "work" || cat === "travel" || cat === "education") {
    return false;
  }

  return (
    Boolean(event.image_url) ||
    Boolean(event.pdf_url) ||
    event.source === "upload" ||
    event.source === "photo" ||
    event.source === "document"
  );
}
