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
 * Normalizes text across Arabic, French, and English:
 * - Strips Latin accents/diacritics (e.g. médecin -> medecin, échéance -> echeance)
 * - Normalizes Arabic diacritics (tashkeel), Tatweel, and letter variants:
 *   (أ, إ, آ, ٱ -> ا), (ة -> ه), (ى -> ي)
 */
export function normalizeCategoryText(text: string): string {
  if (!text) return "";
  let s = text.toLowerCase();
  // Strip Latin accents (French/Spanish/etc.)
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Strip Arabic Tashkeel & Tatweel
  s = s.replace(/[\u064B-\u0652\u0670\u0640]/g, "");
  // Normalize Arabic letters
  s = s.replace(/[إأآٱ]/g, "ا");
  s = s.replace(/ة/g, "ه");
  s = s.replace(/ى/g, "ي");
  return s;
}

/**
 * Checks if a phrase or word matches inside the normalized text with proper boundary protection.
 * - Multi-word phrases are checked directly.
 * - Single words use Unicode-aware word boundaries to prevent false substring matches
 *   (e.g., 'dr' will NOT match inside 'drive' or 'children'; 'tax' will NOT match 'syntax').
 */
function matchesKeyword(normText: string, keyword: string): boolean {
  const normKw = normalizeCategoryText(keyword).trim();
  if (!normKw) return false;

  if (normKw.includes(" ")) {
    return normText.includes(normKw);
  }

  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normKw)}([^\\p{L}\\p{N}]|$)`, "u");
  return regex.test(normText);
}

function matchesAny(normText: string, keywords: string[]): boolean {
  return keywords.some((kw) => matchesKeyword(normText, kw));
}

// 🏥 Health & Medical Keywords (EN / FR / AR)
const HEALTH_KEYWORDS = [
  // French
  "médecin", "medecin", "docteur", "dr", "dr.", "médical", "medical", "médicale", "medicale", "santé", "sante", "clinique",
  "hôpital", "hopital", "dentiste", "dentaire", "médicament", "medicament", "ordonnance", "pharmacie",
  "vaccin", "vaccination", "consultation", "cabinet médical", "cabinet medical", "laboratoire",
  "analyse", "prise de sang", "radiologie", "radiographie", "échographie", "echographie", "irm", "scanner",
  "ophtalmo", "ophtalmologue", "kiné", "kine", "kinésithérapeute", "kinesitherapeute", "cardiologue", "pédiatre", "pediatre",
  "gynécologue", "gynecologue", "dermatologue", "chirurgien", "chirurgie", "soin", "soins", "infirmier",
  "infirmière", "infirmiere", "urgences", "patient", "maladie", "rendez-vous médical", "rdv médical", "rdv medical", "rdv medecin",
  "examen médical", "examen medical", "doctolib", "bilan de santé", "bilan de sante", "traitement", "posologie", "qare", "suivi médical", "suivi medical",
  // English
  "doctor", "dr", "dr.", "medical", "health", "clinic", "hospital", "dentist", "dental",
  "medicine", "medication", "prescription", "rx", "therapy", "pharmacy", "vaccine",
  "vaccination", "checkup", "check-up", "blood test", "lab", "laboratory",
  "radiology", "ultrasound", "mri", "ct scan", "x-ray", "consultation", "patient",
  "physician", "surgeon", "pediatrician", "cardiology", "dermatology", "ophthalmology",
  "nurse", "emergency room", "general practitioner", "gp", "follow-up", "physiotherapy",
  // Arabic
  "طبيب", "دكتور", "د.", "مستشفى", "مستشفي", "عيادة", "عياده", "صحة", "صحه", "طبي", "طبية", "طبيه", "دواء", "علاج",
  "أسنان", "اسنان", "كشف", "فحص", "تحليل", "تحاليل", "روشتة", "روشته", "صيدلية", "صيدليه", "لقاح", "تطعيم", "عملية", "عمليه",
  "أشعة", "اشعة", "اشعه", "استشارة", "متابعة طبية", "متابعه طبيه", "مريض", "جراحة", "جراحه", "طوارئ", "ممرض", "ممرضة", "ممرضه", "نفسي",
  "جلدية", "جلديه", "باطنة", "باطنه", "أطفال", "اطفال", "عيون", "علاج طبيعي", "سونار", "رنين", "فحص دوري"
];

// 💼 Work & Professional Keywords (EN / FR / AR)
const WORK_KEYWORDS = [
  // French
  "travail", "bureau", "réunion", "reunion", "professionnel", "entretien", "conférence", "conference",
  "projet", "client", "stage", "poste", "shift", "horaire", "emploi", "collègue", "collegue",
  "entreprise", "chantier", "mission", "point d'équipe", "point d equipe", "présentation", "presentation", "télétravail", "teletravail",
  "planning", "point hebdo", "call client",
  // English
  "work", "job", "office", "meeting", "conference", "presentation", "project",
  "deadline", "interview", "client", "shift", "schedule", "career", "business",
  "colleague", "team sync", "standup", "briefing", "sync", "coworker",
  // Arabic
  "عمل", "شغل", "وظيفة", "وظيفه", "مكتب", "اجتماع", "إجتماع", "اجتماعات", "دوام", "شيفت", "مشروع",
  "مقابلة عمل", "مقابله عمل", "مؤتمر", "عرض تقديمي", "عميل", "مهني", "فريق العمل", "شركة", "شركه", "مناوبة", "مناوبه"
];

// ✈️ Travel & Transportation Keywords (EN / FR / AR)
const TRAVEL_KEYWORDS = [
  // French
  "voyage", "vol", "avion", "aéroport", "aeroport", "billet d'avion", "billet de train", "billet",
  "gare", "sncf", "train", "hôtel", "hotel", "vacances", "réservation hôtel", "reservation hotel", "séjour", "sejour",
  "déplacement", "deplacement", "croisière", "croisiere", "embarquement", "terminal", "air france",
  // English
  "flight", "airport", "airline", "boarding pass", "hotel", "train station",
  "trip", "travel", "vacation", "flight booking", "hotel booking", "transit", "reservation",
  "cruise", "departure", "arrival", "hostel", "airbnb",
  // Arabic
  "سفر", "رحلة", "رحلة سفر", "طيران", "طيارة", "طياره", "مطار", "تذكرة طيران", "تذكرة قطار", "تذكرة", "تذكره", "حجز فندق", "حجز", "فندق",
  "محطة القطار", "محطه القطار", "إجازة", "اجازة", "اجازه", "عطلة", "عطله", "حقائب سفر", "مغادرة", "مغادره", "وصول", "سياحة", "سياحه"
];

// 📄 Official Documents, Legal, Banking & Financial Keywords (EN / FR / AR)
const DOC_KEYWORDS = [
  // French
  "passeport", "carte d'identité", "carte d identite", "carte nationale d'identité", "cni", "titre de séjour", "titre de sejour",
  "carte de séjour", "carte de sejour", "assurance", "mutuelle", "assurance habitation", "assurance auto",
  "contrat", "contrat de travail", "bail", "acte notarié", "acte notarie", "notaire", "facture",
  "paiement", "payer", "banque", "loyer", "échéance", "echeance", "crédit", "credit", "virement", "prélèvement", "prelevement",
  "frais", "remboursement", "abonnement",
  "quittance", "quittance de loyer", "avis d'imposition", "avis d imposition", "impôt", "impot", "impôts", "impots", "taxe foncière", "taxe fonciere",
  "taxe d'habitation", "taxe d habitation", "permis de conduire", "relevé bancaire", "releve bancaire", "compte bancaire", "rib",
  "bulletin de paie", "fiche de paie", "bulletin de salaire", "attestation",
  "justificatif de domicile", "carte vitale", "préfecture", "prefecture", "france travail", "pole emploi",
  "ameli", "caf",
  // English
  "passport", "visa", "residence permit", "green card", "national id", "id card",
  "driver's license", "insurance", "insurance policy", "health insurance", "car insurance",
  "contract", "lease agreement", "rental agreement", "invoice", "utility bill", "bill",
  "payment", "pay", "bank", "rent", "installment", "tuition", "mortgage", "subscription", "loan", "tax",
  "tax return", "tax bill", "property tax", "bank statement", "financial statement",
  "payslip", "pay stub", "birth certificate", "marriage certificate", "notary",
  "affidavit", "power of attorney", "legal document", "official document",
  // Arabic
  "فاتورة", "فاتوره", "فواتير", "دفع", "سداد", "تسديد", "بنك", "قسط", "أقساط", "اقساط", "إيجار", "ايجار", "مصاريف", "رسوم", "اشتراك", "مديونية", "مديونيه", "مستحقات",
  "جواز سفر", "جواز", "تأشيرة", "تاشيره", "فيزا", "إقامة", "اقامة", "اقامه", "تجديد إقامة", "تجديد اقامه", "بطاقة شخصية", "بطاقه شخصيه",
  "بطاقة هوية", "بطاقه هويه", "رقم قومي", "رخصة قيادة", "رخصه قياده", "رخصة سيارة", "رخصه سياره", "عقد إيجار", "عقد ايجار", "عقد عمل",
  "عقد بيع", "توكيل رسمي", "توكيل", "تأمين صحي", "تامين صحي", "تأمين سيارة", "تامين سياره", "تأمين", "تامين", "بوليصة تأمين", "بوليصه تامين",
  "فاتورة كهرباء", "فاتوره كهرباء", "فاتورة مياه", "فاتوره مياه", "فاتورة غاز", "فاتوره غاز", "إقرار ضريبي", "اقرار ضريبي", "ضرائب", "ضريبة", "ضريبه",
  "كشف حساب بنكي", "كشف حساب", "مفردات مرتب", "شهادة ميلاد", "شهاده ميلاد", "شهادة تخرج", "شهاده تخرج",
  "قيد عائلي", "معاملة حكومية", "معامله حكوميه", "سجل مدني", "شهر عقاري"
];

// 🎓 Education & Learning Keywords (EN / FR / AR)
const EDUCATION_KEYWORDS = [
  // French
  "cours", "classe", "école", "ecole", "université", "universite", "formation",
  "professeur", "prof", "devoir", "devoirs", "leçon", "lecon", "atelier", "étude", "etude", "amphi",
  "lycée", "lycee", "collège", "college", "rattrapage", "soutenance", "examen scolaire", "examen", "partiel", "campus", "révision", "revision",
  // English
  "course", "class", "lecture", "university", "school", "homework", "study",
  "workshop", "lesson", "tutorial", "student", "academy", "college", "syllabus", "exam", "quiz", "test", "training",
  // Arabic
  "دراسة", "دراسه", "مدرسة", "مدرسه", "جامعة", "جامعه", "محاضرة", "محاضره", "درس", "دروس", "كورس", "كورسات", "دورة", "دوره", "واجب", "واجبات",
  "تدريب", "ورشة عمل", "ورشه عمل", "أكاديمية", "اكاديمية", "اكاديميه", "كلية", "كليه", "طالب", "فصل دراسي", "تخرج", "امتحان", "امتحانات", "اختبار", "مذاكرة", "مذاكره"
];

// 🔴 Urgent Keywords (EN / FR / AR)
const URGENT_KEYWORDS = [
  // French
  "urgent", "urgence", "immédiat", "immediat", "prioritaire", "priorité", "priorite", "critique", "important", "importante",
  // English
  "urgent", "urgency", "emergency", "critical", "asap", "immediate", "important", "priority",
  // Arabic
  "عاجل", "طارئ", "ضروري جدا", "ضروري", "فوري", "حرج", "مهم", "مهمة", "مهمه", "هام", "أولوية", "اولوية", "اولويه"
];

// ✨ Personal & Social Keywords (EN / FR / AR)
const PERSONAL_KEYWORDS = [
  // French
  "anniversaire", "fête", "fete", "famille", "ami", "amis", "dîner", "diner", "déjeuner", "dejeuner", "mariage",
  "soirée", "soiree", "sport", "gym", "fitness", "musculation", "courses", "café", "cafe",
  "cinéma", "cinema", "concert", "weekend", "cadeau", "repas", "match", "invitation", "anniv",
  // English
  "birthday", "anniversary", "party", "family", "friend", "friends", "dinner", "lunch",
  "wedding", "sport", "gym", "workout", "coffee", "cinema", "movie",
  "shopping", "weekend", "brunch", "celebration", "fitness",
  // Arabic
  "عيد ميلاد", "حفلة", "حفله", "عائلة", "عائله", "صديق", "أصدقاء", "اصدقاء", "غداء", "عشاء", "زفاف", "فرح",
  "خطوبة", "خطوبه", "رياضة", "رياضه", "جيم", "تمرين", "تمارين", "قهوة", "قهوه", "تسوق", "سينما", "شخصي", "عزومة", "عزومه", "احتفال"
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

  const normText = normalizeCategoryText(`${event.title || ""} ${event.notes || ""} ${event.location || ""}`);

  // 2. Health & Medical has top domain precedence (e.g. "Examen Médical & Suivi - Dr Dubois")
  if (matchesAny(normText, HEALTH_KEYWORDS)) {
    return "health";
  }

  // 3. Travel & Transportation
  if (matchesAny(normText, TRAVEL_KEYWORDS)) {
    return "travel";
  }

  // 4. Documents & Administrative & Finance (Strict keywords only)
  if (matchesAny(normText, DOC_KEYWORDS)) {
    return "documents";
  }

  // 5. Education & Studies
  if (matchesAny(normText, EDUCATION_KEYWORDS)) {
    return "education";
  }

  // 6. Work keywords (meetings, projects, clients)
  if (matchesAny(normText, WORK_KEYWORDS)) {
    return "work";
  }

  // 7. Explicit urgent keywords
  if (matchesAny(normText, URGENT_KEYWORDS)) {
    return "urgent";
  }

  // 8. Personal keywords (parties, dinner, birthdays, gym)
  if (matchesAny(normText, PERSONAL_KEYWORDS)) {
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
