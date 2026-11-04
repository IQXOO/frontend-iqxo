import type { IQXOEvent } from "./types";

export type EventCategory = "documents" | "health" | "personal" | "other";

const DOC_KEYWORDS = [
  // English
  "insurance", "passport", "visa", "document", "contract", "license", "bill",
  "receipt", "invoice", "paper", "tax", "identity", "id card", "ticket", "boarding",
  "certificate", "policy", "statement", "form",
  // Arabic
  "وثيقة", "مستند", "جواز", "فيزا", "تأشيرة", "تأمين", "عقد", "رخصة", "فاتورة",
  "ايصال", "إيصال", "ضريبة", "بطاقة", "شهادة", "ورقة", "تذكرة", "هوية", "ملف", "استمارة",
  // French
  "passeport", "assurance", "contrat", "permis", "facture", "quittance", "impôt", "carte",
  "attestation", "reçu"
];

const HEALTH_KEYWORDS = [
  // English
  "doctor", "medical", "health", "clinic", "hospital", "dentist", "medicine",
  "prescription", "therapy", "appointment", "pharmacy", "vaccine", "checkup", "blood", "test",
  // Arabic
  "طبيب", "دكتور", "مستشفى", "عيادة", "صحة", "طبي", "دواء", "علاج", "أسنان",
  "كشف", "فحص", "تحليل", "روشتة", "صيدلية", "لقاح", "تطعيم", "عملية", "أشعة",
  // French
  "docteur", "médecin", "médical", "santé", "clinique", "hôpital", "dentiste",
  "médicament", "ordonnance", "pharmacie", "vaccin"
];

const PERSONAL_KEYWORDS = [
  // English
  "meeting", "event", "party", "family", "call", "lunch", "dinner", "birthday",
  "flight", "travel", "trip", "interview", "personal", "wedding", "coffee", "gym", "workout", "sport",
  // Arabic
  "اجتماع", "موعد", "شخصي", "عائلي", "حفلة", "عيد ميلاد", "سفر", "رحلة", "طيران",
  "غداء", "عشاء", "مقابلة", "مكالمة", "فرح", "خطوبة", "قهوة", "جيم", "تمرين", "رياضة",
  // French
  "réunion", "rendez-vous", "famille", "fête", "anniversaire", "vol", "voyage",
  "déjeuner", "dîner", "entretien", "personnel", "mariage", "sport"
];

/**
 * Checks if an event is considered a processed document (has an attachment, upload source, or doc keywords).
 */
export function isDocumentEvent(event: IQXOEvent): boolean {
  if (
    Boolean(event.image_url) ||
    Boolean(event.pdf_url) ||
    event.source === "upload" ||
    event.source === "photo" ||
    event.source === "document"
  ) {
    return true;
  }

  const text = `${event.title || ""} ${event.notes || ""} ${event.location || ""} ${event.link || ""}`.toLowerCase();
  return DOC_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * Categorizes an event into exactly one primary category (documents, health, personal, other).
 */
export function categorizeEvent(event: IQXOEvent): EventCategory {
  if (isDocumentEvent(event)) {
    return "documents";
  }

  const text = `${event.title || ""} ${event.notes || ""} ${event.location || ""} ${event.link || ""}`.toLowerCase();

  if (HEALTH_KEYWORDS.some((kw) => text.includes(kw))) {
    return "health";
  }

  if (PERSONAL_KEYWORDS.some((kw) => text.includes(kw))) {
    return "personal";
  }

  return "other";
}
