"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";
import {
  devError,
  devLog,
  devWarn,
  fetchWithDiagnostics,
  getFriendlyErrorMessage,
} from "./logger";
import { toast } from "../hooks/use-toast";
import { normalizeBillingPlanStatus } from "./billing-utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Priority = "urgent" | "upcoming" | "later" | "past";
export type Language = "en" | "fr" | "ar";
export type Theme = "dark" | "light" | "system";

export interface IQXOEvent {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  date: string;
  time: string;
  phone?: string;
  location?: string;
  email?: string;
  source: string;
  image_url?: string;
  pdf_url?: string;
  is_done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  fullName: string | null;
  locale: string | null;
}

// ─── Subscription plan type ───────────────────────────────────────────────────
export type PlanStatus = "free_trial" | "pro" | "expired" | "none";

interface AppContextValue {
  // Auth
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;

  // Subscription
  planStatus: PlanStatus;
  trialEndsAt: Date | null;
  planResolved: boolean;
  setPlanStatus: (status: PlanStatus, trialEndsAt?: Date) => void;

  // Usage tracking (in USD spent)
  totalUsage: number;
  setTotalUsage: (usage: number) => void;
  usageLoading: boolean;
  refreshUsage: () => Promise<void>;

  // Onboarding state persisted in user metadata
  onboardingDone: boolean;
  setOnboardingDone: (done: boolean) => Promise<void>;

  // Events
  events: IQXOEvent[];
  loading: boolean;
  hydrated: boolean;
  addEvent: (
    event: Omit<IQXOEvent, "id" | "user_id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateEvent: (id: string, data: Partial<IQXOEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByPriority: (priority: Priority) => IQXOEvent[];
  addEventOptimistic: (event: IQXOEvent) => void;
  removeEventOptimistic: (id: string) => void;
  refreshEvents: () => Promise<void>;

  // UI helpers
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Translations ─────────────────────────────────────────────────────────────
const translations: Record<Language, Record<string, string>> = {
  // en: {
  //   "app.title": "IQXO",
  //   "events.title": "Events",
  //   "events.add": "Add Event",
  //   "events.empty": "No events yet",
  //   cancel: "Cancel",
  //   delete: "Delete",
  //   save: "Save",
  //   edit: "Edit",
  //   share: "Share",
  //   today: "Today",
  //   tomorrow: "Tomorrow",
  //   urgent: "Urgent",
  //   upcoming: "Upcoming",
  //   later: "Later",
  //   past: "Past",
  //   noEvents: "No events yet",
  //   noEventsDesc: "Tap the button below to add your first event",
  //   addEvent: "Add Event",
  //   noResults: "No results found",
  //   live: "LIVE",
  //   IQXO: "IQXO",
  //   logout_error: "Failed to sign out",
  //   workSchedule: "work",
  // },
  en: {
    // Header
    appName: "IQXO",
    "app.title": "IQXO",
    live: "Live",
    IQXO: "IQXO",

    // Sections
    urgentTitle: "Today",
    upcomingTitle: "This Week",
    laterTitle: "Down the Road",
    statsTitle: "Your Life",
    auto: "SMART",

    // Events
    "events.title": "Events",
    "events.add": "Add Event",
    "events.empty": "No events yet",
    addEvent: "Let's add this",
    editEvent: "Change something",

    // Stats
    totalEvents: "Everything",
    urgentCount: "Soon",
    upcomingCount: "Coming",
    laterCount: "Later",
    smartInsight: "Sorted by what matters most",

    // Search
    searchPlaceholder: "Find something...",

    // Event form
    eventTitle: "What",
    eventTitlePlaceholder: "e.g. Doctor visit",
    eventDate: "When",
    eventTime: "Time",
    eventPhone: "Phone",
    eventPhonePlaceholder: "e.g. +1 555 0123",
    eventLocation: "Where",
    eventLocationPlaceholder: "e.g. 123 Main St",
    eventEmail: "Email",
    eventEmailPlaceholder: "e.g. hello@example.com",
    eventNotes: "Notes",
    eventNotesPlaceholder: "Anything else to remember...",
    save: "Done",
    cancel: "Never mind",
    delete: "Remove",
    deleteConfirm: "Remove this from your calendar?",
    deleteConfirmYes: "Yes, remove it",
    deleteConfirmNo: "Keep it",

    // Event detail
    eventDetail: "Details",
    call: "Call",
    openMap: "Maps",
    share: "Share",
    edit: "Change",

    // Empty state
    noEvents: "Nothing here yet",
    noEventsDesc: "Share something and we'll get started",
    noUrgent: "You're all clear this week",
    noUpcoming: "Nothing coming up",
    noLater: "The future is wide open",
    noResults: "Hmm, nothing matches that",
    noEventsToday: "No events today",
    takeItEasy: "Take it easy and enjoy your day",

    // Priority badges
    urgentBadge: "Today",
    upcomingBadge: "Next week",
    laterBadge: "Later",
    pastTitle: "Memory Lane",
    pastBadge: "Done",
    noPast: "No memories yet",
    past: "Past",
    urgent: "Urgent",
    upcoming: "Upcoming",
    later: "Later",

    // Voice
    voiceListening: "I'm listening...",
    voiceHint: "Hold and tell me",
    voiceUnsupported: "Voice isn't available here",

    // Nav
    navHome: "Home",
    navHistory: "History",
    navSettings: "Settings",
    navToday: "Home",
    navTomorrow: "Tomorrow",
    navFuture: "Future",
    navArchive: "Archive",

    // Time
    today: "Today",
    tomorrow: "Tomorrow",

    // FAB
    fabUpload: "Photo",
    fabVoice: "Voice",
    fabManual: "Type",

    // Upload
    uploadLabel: "Share a photo",
    uploadPreview: "Let me see...",
    uploadAnalyze: "Got it",
    uploadAnalyzing: "Just a moment...",
    uploadAnalyzingDesc: "Looking through your photo",
    uploadSuccess: "Found it!",
    uploadFailed: "Hmm, I couldn't read that",
    uploadError: "Something went wrong. Let's try again.",
    uploadUnsupported: "I need a JPG, PNG, or PDF for this.",
    uploadTooLarge: "This file is a bit too big. Under 10MB please.",
    uploadNoEvents: "I didn't spot any dates here.",
    uploadEventSingular: "added to your calendar",
    uploadEventPlural: "added to your calendar",

    // Logout & Auth
    logout_success: "See you soon!",
    logout_desc: "You're all set.",
    logout_error: "Something's not right...",
    logging_out: "Signing out...",

    // Tomorrow's Chain
    tomorrowChain: "Tomorrow's Chain",
    chainSubtitle: "Your smart daily plan based on your schedule",
    chainTotalTime: "Total estimated time outside:",
    chainRecommendation: "Recommendation: Take half-day off if possible",
    startMyDay: "Start My Day",
    doctorAppointment: "Doctor Appointment",
    insuranceRenewal: "Insurance Renewal",
    carService: "Car Service",
    bringOldPrescription: "Bring old prescription and health insurance card",
    travelTime: "Estimated travel time: 20 minutes",
    takeCarLicense: "Take car license + ID",
    proximityNote: "Only 7 minutes walk from clinic",
    bringWaterBottle: "Bring water bottle – waiting might be long",
    chainHours: "hours",

    // Prescription Alert
    prescriptionExpired: "This prescription expired",
    daysAgo: "days ago!",
    medicineName: "Medicine",
    dosage: "Dosage",
    purpose: "For",
    expirationDate: "Expires",
    orderRefillNow: "Order Refill Now",
    refillSubtext: "We can pre-fill your request at nearest pharmacy",
    remindInTwoDays: "Remind me in 7 days",
    addToCalendar: "Add to Calendar",
    viewRelatedNotes: "View Related Notes",
    pharmacyNote: "Bring old bottle to pharmacist for exact match",

    // Energy Score
    energyScore: "Energy Level",
    energyHigh: "Peak Energy",
    energyMed: "Steady",
    energyLow: "Slow Down",
    suggestion: "Suggestion",

    // Smart Reminder
    snooze: "Snooze",
    confirm: "Confirm",
    snoozedUntil: "Snoozed until",

    // Contextual Alert
    locationAlert: "Near",
    timeAlert: "In",
    conflict: "Conflict",
    prepare: "Prepare",

    // Quick Attach
    attachPhoto: "Attach Photo",
    attachDoc: "Attach Doc",
    attached: "attached",

    // Misc
    noEventsDescOld: "Tap the button below to add your first event",
    workSchedule: "Schedule",
  },

  // fr: {
  //   "app.title": "IQXO",
  //   "events.title": "Événements",
  //   "events.add": "Ajouter",
  //   "events.empty": "Aucun événement",
  //   cancel: "Annuler",
  //   delete: "Supprimer",
  //   save: "Enregistrer",
  //   edit: "Modifier",
  //   share: "Partager",
  //   today: "Aujourd'hui",
  //   tomorrow: "Demain",
  //   urgent: "Urgent",
  //   upcoming: "À venir",
  //   later: "Plus tard",
  //   past: "Passé",
  //   noEvents: "Aucun événement",
  //   noEventsDesc: "Appuyez pour ajouter votre premier événement",
  //   addEvent: "Ajouter",
  //   noResults: "Aucun résultat",
  //   live: "EN DIRECT",
  //   IQXO: "IQXO",
  //   logout_error: "Échec de la déconnexion",
  // },
  fr: {
    // Header
    appName: "IQXO",
    "app.title": "IQXO",
    live: "En direct",
    IQXO: "IQXO",

    // Sections
    urgentTitle: "Aujourd'hui",
    upcomingTitle: "Cette semaine",
    laterTitle: "Plus tard",
    statsTitle: "Ta vie",
    auto: "SMART",

    // Events
    "events.title": "Événements",
    "events.add": "Ajouter",
    "events.empty": "Aucun événement",
    addEvent: "Ajouter",
    editEvent: "Modifier",

    // Stats
    totalEvents: "Total",
    urgentCount: "Urgent",
    upcomingCount: "Bientôt",
    laterCount: "Plus tard",
    smartInsight: "Organisé par priorité",

    // Search
    searchPlaceholder: "Chercher...",

    // Event form
    eventTitle: "Quoi",
    eventTitlePlaceholder: "ex. Rendez-vous médecin",
    eventDate: "Quand",
    eventTime: "Heure",
    eventPhone: "Téléphone",
    eventPhonePlaceholder: "ex. +33 6 12 34 56 78",
    eventLocation: "Où",
    eventLocationPlaceholder: "ex. 123 Rue Principale",
    eventEmail: "E-mail",
    eventEmailPlaceholder: "ex. bonjour@exemple.com",
    eventNotes: "Notes",
    eventNotesPlaceholder: "Autre chose à retenir...",
    save: "C'est bon",
    cancel: "Annuler",
    delete: "Retirer",
    deleteConfirm: "Retirer ça de ton calendrier ?",
    deleteConfirmYes: "Oui, retire",
    deleteConfirmNo: "Garder",

    // Event detail
    eventDetail: "Détails",
    call: "Appeler",
    openMap: "Carte",
    share: "Partager",
    edit: "Modifier",

    // Empty state
    noEvents: "Rien pour l'instant",
    noEventsDesc: "Partage quelque chose et on commence",
    noEventsDescOld: "Appuie pour ajouter ton premier événement",
    noUrgent: "Rien d'urgent cette semaine",
    noUpcoming: "Rien de prévu bientôt",
    noLater: "L'avenir est grand ouvert",
    noResults: "Hmm, rien ne correspond",
    noEventsToday: "Rien de prévu aujourd'hui",
    takeItEasy: "Détends-toi et profite de ta journée",

    // Priority badges
    urgentBadge: "Aujourd'hui",
    upcomingBadge: "Ce Cette semaine",
    laterBadge: "Plus tard",
    pastTitle: "Souvenirs",
    pastBadge: "Fait",
    noPast: "Pas encore de souvenirs",
    past: "Passé",
    urgent: "Urgent",
    upcoming: "À venir",
    later: "Plus tard",

    // Voice
    voiceListening: "Je t'écoute...",
    voiceHint: "Maintiens et parle",
    voiceUnsupported: "La voix n'est pas disponible ici",

    // Nav
    navHome: "Accueil",
    navHistory: "Historique",
    navSettings: "Réglages",
    navToday: "Aujourd'hui",
    navTomorrow: "Demain",
    navFuture: "du futur",
    navArchive: "Archive",

    // Time
    today: "Aujourd'hui",
    tomorrow: "Demain",

    // FAB
    fabUpload: "Photo",
    fabVoice: "Voix",
    fabManual: "Écrire",

    // Upload
    uploadLabel: "Partage une photo",
    uploadPreview: "Voyons voir...",
    uploadAnalyze: "C'est parti",
    uploadAnalyzing: "Un instant...",
    uploadAnalyzingDesc: "Je regarde ta photo",
    uploadSuccess: "Trouvé !",
    uploadFailed: "Hmm, je n'ai pas pu lire ça",
    uploadError: "Un problème. On réessaie ?",
    uploadUnsupported: "J'ai besoin d'un JPG, PNG ou PDF.",
    uploadTooLarge: "Fichier trop volumineux. Moins de 10 Mo.",
    uploadNoEvents: "Je n'ai trouvé aucune date ici.",
    uploadEventSingular: "ajouté à ton calendrier",
    uploadEventPlural: "ajoutés à ton calendrier",

    // Logout & Auth
    logout_success: "À bientôt !",
    logout_desc: "Tu es déconnecté.",
    logout_error: "Quelque chose cloche...",
    logging_out: "Déconnexion...",

    // Tomorrow's Chain
    tomorrowChain: "Chaîne de demain",
    chainSubtitle: "Ton plan intelligent basé sur ton agenda",
    chainTotalTime: "Temps total estimé dehors :",
    chainRecommendation: "Conseil : prends une demi-journée si possible",
    startMyDay: "Commencer ma journée",
    doctorAppointment: "Rendez-vous médecin",
    insuranceRenewal: "Renouvellement assurance",
    carService: "Service auto",
    bringOldPrescription: "Apporte l'ancienne ordonnance et carte d'assurance",
    travelTime: "Temps de trajet estimé : 20 minutes",
    takeCarLicense: "Prends permis + ID",
    proximityNote: "À seulement 7 minutes à pied de la clinique",
    bringWaterBottle: "Apporte de l'eau – attente possible",
    chainHours: "heures",

    // Prescription Alert
    prescriptionExpired: "Cette ordonnance a expiré",
    daysAgo: "jours",
    medicineName: "Médicament",
    dosage: "Dosage",
    purpose: "Pour",
    expirationDate: "Expire",
    orderRefillNow: "Commander un renouvellement",
    refillSubtext:
      "On peut pré-remplir ta demande à la pharmacie la plus proche",
    remindInTwoDays: "Me rappeler dans 7 jours",
    addToCalendar: "Ajouter au calendrier",
    viewRelatedNotes: "Voir les notes liées",
    pharmacyNote: "Apporte l'ancienne boîte pour correspondance exacte",

    // Energy Score
    energyScore: "Niveau d'énergie",
    energyHigh: "Pic",
    energyMed: "Stable",
    energyLow: "Ralentir",
    suggestion: "Conseil",

    // Smart Reminder
    snooze: "Reporter",
    confirm: "Confirmer",
    snoozedUntil: "Reporté jusqu'à",

    // Contextual Alert
    locationAlert: "Près de",
    timeAlert: "Dans",
    conflict: "Conflit",
    prepare: "Préparer",

    // Quick Attach
    attachPhoto: "Ajouter photo",
    attachDoc: "Ajouter document",
    attached: "ajouté",

    // Misc
    workSchedule: "Calendrier",
  },

  ar: {
    // Header
    appName: "IQXO",
    "app.title": "IQXO",
    live: "مباشر",
    IQXO: "IQXO",

    // Sections
    urgentTitle: "اليوم",
    upcomingTitle: "هذا الأسبوع",
    laterTitle: "لاحقاً",
    statsTitle: "حياتك",
    auto: "ذكي",

    // Events
    "events.title": "الأحداث",
    "events.add": "إضافة حدث",
    "events.empty": "لا توجد أحداث بعد",
    addEvent: "دعونا نضيف هذا",
    editEvent: "تعديل شيء ما",

    // Stats
    totalEvents: "الكل",
    urgentCount: "عاجل",
    upcomingCount: "قريب",
    laterCount: "لاحق",
    smartInsight: "منظم حسب الأولوية",

    // Search
    searchPlaceholder: "ابحث عن شيء...",

    // Event form
    eventTitle: "ماذا",
    eventTitlePlaceholder: "مثال: موعد الطبيب",
    eventDate: "متى",
    eventTime: "الوقت",
    eventPhone: "الهاتف",
    eventPhonePlaceholder: "مثال: +966 5 0000 0000",
    eventLocation: "أين",
    eventLocationPlaceholder: "مثال: 123 الشارع الرئيسي",
    eventEmail: "البريد الإلكتروني",
    eventEmailPlaceholder: "مثال: hello@example.com",
    eventNotes: "ملاحظات",
    eventNotesPlaceholder: "أي شيء آخر تريد تذكره...",
    save: "تم",
    cancel: "لا يهم",
    delete: "حذف",
    deleteConfirm: "هل تريد حذف هذا من تقويمك؟",
    deleteConfirmYes: "نعم، احذفه",
    deleteConfirmNo: "احتفظ به",

    // Event detail
    eventDetail: "التفاصيل",
    call: "اتصال",
    openMap: "الخريطة",
    share: "مشاركة",
    edit: "تعديل",

    // Empty state
    noEvents: "لا يوجد شيء حتى الآن",
    noEventsDesc: "شارك شيئاً لنبدأ",
    noUrgent: "أنت متفرغ تماماً هذا الأسبوع",
    noUpcoming: "لا يوجد شيء قريباً",
    noLater: "المستقبل مفتوح تماماً",
    noResults: "لم نجد أي نتائج مطابقة",
    noEventsToday: "لا مواعيد اليوم",
    takeItEasy: "استرخِ واستمتع بيومك",

    // Priority badges
    urgentBadge: "هذا الأسبوع",
    upcomingBadge: "الشهر القادم",
    laterBadge: "لاحقاً",
    pastTitle: "الذكريات",
    pastBadge: "تم",
    noPast: "لا توجد ذكريات بعد",
    past: "ماضي",
    urgent: "عاجل",
    upcoming: "قادم",
    later: "لاحقاً",

    // Voice
    voiceListening: "أنا أستمع...",
    voiceHint: "اضغط وتحدث",
    voiceUnsupported: "الصوت غير مدعوم هنا",

    // Nav
    navHome: "الرئيسية",
    navHistory: "السجل",
    navSettings: "الإعدادات",
    navToday: "الرئيسية",
    navTomorrow: "غداً",
    navFuture: "المستقبل",
    navArchive: "الأرشيف",

    // Time
    today: "اليوم",
    tomorrow: "غداً",

    // FAB
    fabUpload: "صورة",
    fabVoice: "صوت",
    fabManual: "كتابة",

    // Upload
    uploadLabel: "شارك صورة",
    uploadPreview: "دعني أرى...",
    uploadAnalyze: "فهمت",
    uploadAnalyzing: "لحظة واحدة...",
    uploadAnalyzingDesc: "أقوم بقراءة صورتك",
    uploadSuccess: "تم العثور على المواعيد!",
    uploadFailed: "لم أتمكن من قراءة الصورة",
    uploadError: "حدث خطأ ما، فلنحاول مجدداً.",
    uploadUnsupported: "أحتاج صورة JPG أو PNG أو ملف PDF.",
    uploadTooLarge: "الملف كبير جداً. يرجى اختيار ملف أقل من 10 ميجابايت.",
    uploadNoEvents: "لم أجد أي تواريخ هنا.",
    uploadEventSingular: "أضيفت إلى تقويمك",
    uploadEventPlural: "أضيفت إلى تقويمك",

    // Logout & Auth
    logout_success: "إلى اللقاء!",
    logout_desc: "أنت جاهز.",
    logout_error: "حدث خطأ ما...",
    logging_out: "جاري تسجيل الخروج...",

    // Tomorrow's Chain
    tomorrowChain: "خطة الغد",
    chainSubtitle: "مخططك اليومي الذكي بناءً على مواعيدك",
    chainTotalTime: "إجمالي الوقت المتوقع بالخارج:",
    chainRecommendation: "النصيحة: خذ نصف يوم إجازة إن أمكن",
    startMyDay: "ابدأ يومي",
    doctorAppointment: "موعد الطبيب",
    insuranceRenewal: "تجديد التأمين",
    carService: "صيانة السيارة",
    bringOldPrescription: "احضر الوصفة الطبية القديمة وبطاقة التأمين",
    travelTime: "الوقت المتوقع للتنقل: 20 دقيقة",
    takeCarLicense: "احضر رخصة السيارة والهوية",
    proximityNote: "على بعد 7 دقائق فقط سيراً من العيادة",
    bringWaterBottle: "احضر زجاجة ماء - قد يكون الانتظار طويلاً",
    chainHours: "ساعات",

    // Prescription Alert
    prescriptionExpired: "انتهت صلاحية هذه الوصفة",
    daysAgo: "يوم مضى!",
    medicineName: "الدواء",
    dosage: "الجرعة",
    purpose: "الهدف",
    expirationDate: "ينتهي في",
    orderRefillNow: "اطلب التجديد الآن",
    refillSubtext: "يمكننا تجهيز طلبك مسبقاً في أقرب صيدلية",
    remindInTwoDays: "ذكرني خلال 7 أيام",
    addToCalendar: "أضف إلى التقويم",
    viewRelatedNotes: "عرض الملاحظات ذات الصلة",
    pharmacyNote: "احضر العلبة القديمة للصيدلي للمطابقة الدقيقة",

    // Energy Score
    energyScore: "مستوى الطاقة",
    energyHigh: "طاقة كاملة",
    energyMed: "طاقة متوسطة",
    energyLow: "طاقة منخفضة",
    suggestion: "اقتراح",

    // Smart Reminder
    snooze: "تأجيل",
    confirm: "تأكيد",
    snoozedUntil: "مؤجل حتى",

    // Contextual Alert
    locationAlert: "بالقرب من",
    timeAlert: "خلال",
    conflict: "تضارب",
    prepare: "تجهيز",

    // Quick Attach
    attachPhoto: "إرفاق صورة",
    attachDoc: "إرفاق مستند",
    attached: "مرفق",

    // Misc
    workSchedule: "جدول العمل",
  },
};

// ─── Local-date helpers ───────────────────────────────────────────────────────
// Return a YYYY-MM-DD string in the user's LOCAL timezone (avoids UTC midnight
// shift when just calling toISOString() on a local Date).
export function toLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string as LOCAL midnight (not UTC) so comparisons are
// always relative to the user's clock.
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ─── Priority helper ──────────────────────────────────────────────────────────
export function computePriority(dateStr: string): Priority {
  // Parse as local midnight to avoid UTC-shift bugs (e.g. GMT+3)
  const eventDate = parseLocalDate(dateStr);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowMidnight = new Date(todayMidnight);
  tomorrowMidnight.setDate(todayMidnight.getDate() + 1);
  const sevenDaysMidnight = new Date(todayMidnight);
  sevenDaysMidnight.setDate(todayMidnight.getDate() + 7);

  if (eventDate < todayMidnight) return "past";
  if (eventDate < tomorrowMidnight) return "urgent";     // today
  if (eventDate < sevenDaysMidnight) return "upcoming";  // this week
  return "later";
}

// ─── Map Supabase row → IQXOEvent ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEvent(row: any): IQXOEvent {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    notes: row.notes ?? "",
    date: row.date,
    time: row.time ?? "",
    phone: row.phone ?? undefined,
    location: row.location ?? undefined,
    email: row.email ?? undefined,
    source: row.source ?? "manual",
    image_url: row.image_url ?? undefined,
    pdf_url: row.pdf_url ?? undefined,
    is_done: row.is_done ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Work schedule row type ───────────────────────────────────────────────────
interface WorkScheduleRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  location?: string | null;
  schedule_label: string;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── sessionRef: always holds the latest session token synchronously.
  // Used inside async callbacks (like fetchPlanStatus) to avoid calling
  // supabase.auth.getSession() which can throw or trigger token-refresh
  // side-effects that land in the catch block and break plan resolution.
  const sessionRef = React.useRef<Session | null>(null);

  const [dbEvents, setDbEvents] = useState<IQXOEvent[]>([]);
  const [workScheduleRows, setWorkScheduleRows] = useState<WorkScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [theme, setThemeState] = useState<Theme>("dark");
  const [language, setLanguageState] = useState<Language>("en");

  // Subscription state (stored in localStorage for simplicity; move to DB as needed)
  const [planStatus, setPlanStatusState] = useState<PlanStatus>("none");
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [planResolved, setPlanResolved] = useState<boolean>(false);
  const [totalUsage, setTotalUsage] = useState<number>(0);
  const [usageLoading, setUsageLoading] = useState<boolean>(false);
  const [onboardingDone, setOnboardingDoneState] = useState<boolean>(false);

  // ── Bootstrap auth session ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        sessionRef.current = data.session; // seed the ref before any effect runs
        setSession(data.session);
        setUser(data.session?.user ?? null);
        // bootstrap onboarding flag from session user metadata
        const onboard = !!data.session?.user?.user_metadata?.onboarding_done;
        setOnboardingDoneState(onboard);
      })
      .catch((error) => {
        devError("Auth", "Failed to restore session", error);
        toast({
          title: "Session issue",
          description: "We couldn't restore your session. Please log in again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setAuthLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        sessionRef.current = sess; // keep ref in sync immediately
        setSession(sess);
        setUser(sess?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // ── Load preferences from localStorage ──────────────────────────────────────
  useEffect(() => {
    const savedTheme = localStorage.getItem("iqxo_theme") as Theme;
    if (savedTheme) setThemeState(savedTheme);
    const savedLang = localStorage.getItem("iqxo_language") as Language;
    if (savedLang) setLanguageState(savedLang);

    // Plan status is loaded per-user in the user effect below
    setHydrated(true);
  }, []);

  // ── Persist preferences ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("iqxo_theme", theme);
    document.documentElement.className = theme === "dark" ? "dark" : "light";
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("iqxo_language", language);
  }, [language, hydrated]);

  // ── Load events + work schedules from Supabase ───────────────────────────────
  const fetchEvents = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      // SECURITY: rely on Supabase Row Level Security (RLS) to enforce
      // per-user access. Client-side filtering (eq("user_id", uid)) is
      // NOT a security boundary. Ensure RLS policies exist in the DB.

      if (!uid) {
        devWarn("Events", "fetchEvents called without uid — aborting");
        setDbEvents([]);
        setWorkScheduleRows([]);
        return;
      }

      // Fetch calendar events and work schedules in parallel
      const [eventsRes, scheduleRes] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id,user_id,title,notes,date,time,phone,location,email,source,image_url,pdf_url,is_done,created_at,updated_at",
          )
          .eq("user_id", uid)
          .order("date", { ascending: true }),
        supabase
          .from("work_schedules")
          .select("day_of_week,start_time,end_time,is_active,location,schedule_label")
          .eq("user_id", uid),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      devLog("Events", "Events loaded", { count: (eventsRes.data ?? []).length });
      setDbEvents((eventsRes.data ?? []).map(rowToEvent));

      if (!scheduleRes.error && scheduleRes.data) {
        setWorkScheduleRows(
          scheduleRes.data
            .filter((r) => r.is_active)
            .map((r) => ({
              day_of_week: r.day_of_week,
              start_time: r.start_time,
              end_time: r.end_time,
              is_active: r.is_active,
              location: r.location ?? null,
              schedule_label: r.schedule_label ?? "Main",
            }))
        );
      }
    } catch (err) {
      devError("Events", "Failed to load events", err, { userId: uid });
      toast({
        title: "Couldn't load your events",
        description: getFriendlyErrorMessage(
          err,
          "Please refresh the page and try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const userId = user?.id;

  // ── refreshEvents: public method called after schedule edits ─────────────────
  const refreshEvents = useCallback(async () => {
    if (userId) await fetchEvents(userId);
  }, [userId, fetchEvents]);

  useEffect(() => {
    if (userId) {
      setPlanResolved(false);
      fetchEvents(userId);

      const fetchTotalUsage = async () => {
        try {
          const { data, error } = await supabase
            .from("user_plans")
            .select("total_usage")
            .eq("user_id", userId)
            .maybeSingle();

          if (error) {
            devWarn("Usage", "Failed to load user_plans usage", {
              userId,
              error,
            });
            return null;
          }

          const usage =
            typeof data?.total_usage === "number"
              ? data.total_usage
              : typeof data?.total_usage === "string"
                ? Number(data.total_usage)
                : null;

          return Number.isFinite(usage as number) ? (usage as number) : null;
        } catch (error) {
          devWarn("Usage", "Failed to query user_plans usage", {
            userId,
            error,
          });
          return null;
        }
      };

      // Load plan directly from Supabase (trigger handles trial expiry automatically)
      const fetchPlanStatus = async () => {
        try {
          const { data, error } = await supabase
            .from("user_plans")
            .select(
              "plan_status, trial_ends_at, stripe_subscription_id, total_usage",
            )
            .eq("user_id", userId)
            .maybeSingle();

          if (error) {
            devWarn("Billing", "Failed to load plan from Supabase", {
              userId,
              error,
            });
            const savedPlan = localStorage.getItem(
              `iqxo_plan_${userId}`,
            ) as PlanStatus | null;
            const normalizedSavedPlan = normalizeBillingPlanStatus(savedPlan);
            setPlanStatusState(normalizedSavedPlan);
            const savedTrialEnd = localStorage.getItem(
              `iqxo_trial_end_${userId}`,
            );
            setTrialEndsAt(savedTrialEnd ? new Date(savedTrialEnd) : null);
            setPlanResolved(true);
            return normalizedSavedPlan;
          }

          if (!data) {
            setPlanStatusState("none");
            setTrialEndsAt(null);
            localStorage.setItem(`iqxo_plan_${userId}`, "none");
            localStorage.removeItem(`iqxo_trial_end_${userId}`);
            setPlanResolved(true);
            return "none";
          }

          const normalizedPlanStatus = normalizeBillingPlanStatus(
            data.plan_status,
          );
          setPlanStatusState(normalizedPlanStatus);
          localStorage.setItem(`iqxo_plan_${userId}`, normalizedPlanStatus);

          if (data.trial_ends_at) {
            setTrialEndsAt(new Date(data.trial_ends_at));
            localStorage.setItem(
              `iqxo_trial_end_${userId}`,
              data.trial_ends_at,
            );
          } else {
            setTrialEndsAt(null);
            localStorage.removeItem(`iqxo_trial_end_${userId}`);
          }

          const usage =
            typeof data.total_usage === "number"
              ? data.total_usage
              : typeof data.total_usage === "string"
                ? Number(data.total_usage)
                : null;
          if (usage !== null && Number.isFinite(usage)) {
            setTotalUsage(usage);
          } else {
            const tableUsage = await fetchTotalUsage();
            if (tableUsage !== null) setTotalUsage(tableUsage);
          }

          setPlanResolved(true);
          devLog("Billing", "Plan status loaded from Supabase", {
            planStatus: normalizedPlanStatus,
            hasTrialEnd: Boolean(data.trial_ends_at),
          });
          return normalizedPlanStatus;
        } catch (e) {
          devWarn("Billing", "Plan status query failed, using local fallback");
          console.log(e instanceof Error ? e.message : e);
          const savedPlan = localStorage.getItem(
            `iqxo_plan_${userId}`,
          ) as PlanStatus | null;
          const normalizedSavedPlan = normalizeBillingPlanStatus(savedPlan);
          setPlanStatusState(normalizedSavedPlan);
          const savedTrialEnd = localStorage.getItem(
            `iqxo_trial_end_${userId}`,
          );
          setTrialEndsAt(savedTrialEnd ? new Date(savedTrialEnd) : null);
          setPlanResolved(true);
          return normalizedSavedPlan;
        }
      };

      let pollInterval: NodeJS.Timeout | null = null;

      // If the user was previously confirmed as PRO (cached in localStorage),
      // there is no need to hit Supabase on every load.
      const cachedPlan = localStorage.getItem(
        `iqxo_plan_${userId}`,
      ) as PlanStatus | null;
      const cachedNormalized = normalizeBillingPlanStatus(cachedPlan);

      if (cachedNormalized === "pro") {
        devLog("Billing", "PRO plan found in cache — skipping plan query", {
          userId,
        });
        setPlanStatusState("pro");
        setTrialEndsAt(null);
        setPlanResolved(true);
        // Fetch usage directly from user_plans table so SmartActionsCard shows correct numbers
        (async () => {
          const tableUsage = await fetchTotalUsage();
          if (tableUsage !== null) {
            setTotalUsage(tableUsage);
            devLog("Usage", "PRO usage loaded from user_plans", { tableUsage });
          }
        })();
      } else {
        (async () => {
          await fetchPlanStatus();

          // Poll every 5 minutes for non-PRO users to pick up trigger-driven plan changes
          devLog("Billing", "Plan-status polling enabled", {
            interval: "5min",
          });
          pollInterval = setInterval(() => {
            fetchPlanStatus();
          }, 300000);
        })();
      }

      return () => {
        if (pollInterval) clearInterval(pollInterval);
        if (typeof window !== "undefined") {
          window.removeEventListener("nativeCustomerInfoUpdate", handleNativeUpdate);
        }
      };
    } else {
      setDbEvents([]);
      setWorkScheduleRows([]);
      setPlanStatusState("none");
      setTrialEndsAt(null);
      setPlanResolved(false);
      setTotalUsage(0);
    }
  }, [userId, fetchEvents]);

  // keep onboarding flag in sync with current user metadata
  useEffect(() => {
    setOnboardingDoneState(!!user?.user_metadata?.onboarding_done);
  }, [user]);

  // ── Auth actions ──────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    devLog("Auth", "Login started", { emailDomain: email.split("@")[1] || "" });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        devError("Auth", "Login failed", error, {
          emailDomain: email.split("@")[1] || "",
        });
      } else {
        devLog("Auth", "Login succeeded", {
          emailDomain: email.split("@")[1] || "",
        });
      }
      return { error: error?.message ?? null };
    } catch (error) {
      devError("Auth", "Login threw unexpectedly", error, {
        emailDomain: email.split("@")[1] || "",
      });
      return { error: error instanceof Error ? error.message : "Login failed" };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      devLog("Auth", "Signup started", {
        emailDomain: email.split("@")[1] || "",
      });
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName ?? "",
              onboarding_done: true,
            },
            // Email confirmation is disabled — user is logged in immediately after sign-up
          },
        });

        if (error) {
          devError("Auth", "Signup failed", error, {
            emailDomain: email.split("@")[1] || "",
          });
          return { error: error.message };
        }

        devLog("Auth", "Signup succeeded", {
          emailDomain: email.split("@")[1] || "",
        });
        return { error: null };
      } catch (error) {
        devError("Auth", "Signup threw unexpectedly", error, {
          emailDomain: email.split("@")[1] || "",
        });
        return {
          error: error instanceof Error ? error.message : "Signup failed",
        };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    devLog("Auth", "Logout started");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        devError("Auth", "Logout failed", error);
        toast({
          title: "Couldn't sign out",
          description: getFriendlyErrorMessage(error, "Please try again."),
          variant: "destructive",
        });
        throw error;
      }
      devLog("Auth", "Logout succeeded");
      // ── Clear all local state immediately ─────────────────────────────────
      sessionRef.current = null;
      setDbEvents([]);
      setUser(null);
      setSession(null);
      setPlanStatusState("none");
      setTrialEndsAt(null);
      setPlanResolved(false);
      setTotalUsage(0);
      // Redirect to login and replace history so back won't return to protected pages
      try {
        // import navigateToPath lazily to avoid circular imports
        const { navigateToPath } = await import("./navigation");
        navigateToPath("/login", { replace: true });
      } catch {
        // ignore navigation errors
      }
    } catch (error) {
      devError("Auth", "Logout threw unexpectedly", error);
      toast({
        title: "Couldn't sign out",
        description: getFriendlyErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
      throw error;
    }
  }, []);

  // ── Plan helpers ──────────────────────────────────────────────────────────────
  const setPlanStatus = useCallback(
    (status: PlanStatus, trialEnd?: Date) => {
      if (!user) return;
      // Update local state immediately for instant UI response
      setPlanStatusState(status);

      if (status === "free_trial") {
        if (trialEnd) {
          setTrialEndsAt(trialEnd);
          localStorage.setItem(
            `iqxo_trial_end_${user.id}`,
            trialEnd.toISOString(),
          );
        }
      } else {
        // Clear trial data for non-trial plans
        setTrialEndsAt(null);
        localStorage.removeItem(`iqxo_trial_end_${user.id}`);
      }

      // Cache plan status in localStorage as offline fallback
      localStorage.setItem(`iqxo_plan_${user.id}`, status);
    },
    [user],
  );

  // Refresh usage from server
  const refreshUsage = useCallback(async () => {
    if (!user) return;

    setUsageLoading(true);
    try {
      const backendUrl =
        import.meta.env?.VITE_BACKEND_API || "http://localhost:4040";
      const headers: Record<string, string> = {};
      const token = sessionRef.current?.access_token;
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const r = await fetchWithDiagnostics(
        "Usage",
        "GET /usage",
        `${backendUrl}/usage?userId=${user.id}`,
        { headers },
        { timeoutMs: 10000, context: { userId: user.id } },
      );

      if (r.ok) {
        const data = await r.json();
        const usage =
          typeof data?.totalUsage === "number" ? data.totalUsage : 0;
        setTotalUsage(usage);
        devLog("Usage", "Usage data refreshed", { totalUsage: usage });
      } else {
        devWarn("Usage", "Failed to refresh usage", { status: r.status });
      }
    } catch (error) {
      devError("Usage", "Failed to refresh usage", error);
    } finally {
      setUsageLoading(false);
    }
  }, [user]);

  const setOnboardingDone = useCallback(
    async (done: boolean) => {
      if (!user) {
        setOnboardingDoneState(done);
        return;
      }
      const previous = !!user.user_metadata?.onboarding_done;
      if (previous === done) {
        setOnboardingDoneState(done);
        return;
      }
      setOnboardingDoneState(done);

      try {
        const { error } = await supabase.auth.updateUser({
          data: { onboarding_done: done ? true : null },
        });
        if (error) {
          throw error;
        }
      } catch (err) {
        setOnboardingDoneState(previous);
        devError("Onboarding", "Error updating onboarding flag", err);
      }
    },
    [user],
  );

  // ── Event CRUD ────────────────────────────────────────────────────────────────
  const addEvent = useCallback(
    async (
      data: Omit<IQXOEvent, "id" | "user_id" | "createdAt" | "updatedAt">,
    ) => {
      if (!user) {
        console.warn("addEvent prevented: no authenticated user");
        throw new Error("No authenticated user");
      }
      const { data: row, error } = await supabase
        .from("events")
        .insert({
          user_id: user.id,
          title: data.title,
          notes: data.notes,
          date: data.date,
          time: data.time,
          phone: data.phone ?? null,
          location: data.location ?? null,
          email: data.email ?? null,
          source: data.source,
          image_url: data.image_url ?? null,
          pdf_url: data.pdf_url ?? null,
          is_done: data.is_done,
        })
        .select()
        .single();

      if (error) {
        console.error("addEvent:", error);
        throw error;
      }
      setDbEvents((prev) => [rowToEvent(row), ...prev]);
    },
    [user],
  );

  const updateEvent = useCallback(
    async (id: string, data: Partial<IQXOEvent>) => {
      if (!user) {
        console.warn("updateEvent prevented: no authenticated user");
        throw new Error("No authenticated user");
      }
      const { data: row, error } = await supabase
        .from("events")
        .update({
          ...(data.title !== undefined && { title: data.title }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.time !== undefined && { time: data.time }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.location !== undefined && { location: data.location }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.image_url !== undefined && { image_url: data.image_url }),
          ...(data.pdf_url !== undefined && { pdf_url: data.pdf_url }),
          ...(data.is_done !== undefined && { is_done: data.is_done }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("updateEvent:", error);
        throw error;
      }
      setDbEvents((prev) => prev.map((e) => (e.id === id ? rowToEvent(row) : e)));
    },
    [user],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!user) {
        console.warn("deleteEvent prevented: no authenticated user");
        throw new Error("No authenticated user");
      }
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("deleteEvent:", error);
        throw error;
      }
      setDbEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [user],
  );

  // ── Generate virtual shift events from work schedule (next 30 days) ──────────
  const virtualShiftEvents = React.useMemo<IQXOEvent[]>(() => {
    if (!userId || workScheduleRows.length === 0) return [];
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const virtualEvents: IQXOEvent[] = [];

    // Build a set of dates that already have a work_schedule calendar event
    // so we don't duplicate if the user clicked "Add to calendar" on that day.
    const alreadyAdded = new Set(
      dbEvents
        .filter((e) => e.source === "work_schedule")
        .map((e) => e.date)
    );

    for (let daysAhead = 0; daysAhead <= 30; daysAhead++) {
      const d = new Date(todayMidnight);
      d.setDate(todayMidnight.getDate() + daysAhead);
      const dow = d.getDay();
      const dateStr = toLocalDateStr(d);

      // Skip if user already manually added this day to their calendar
      if (alreadyAdded.has(dateStr)) continue;

      const shiftsForDay = workScheduleRows.filter((r) => r.day_of_week === dow);
      for (const shift of shiftsForDay) {
        virtualEvents.push({
          id: `virtual-ws-${dateStr}-${shift.schedule_label}-${shift.start_time}`,
          user_id: userId,
          title: shift.schedule_label && shift.schedule_label !== "Main"
            ? shift.schedule_label
            : "Work Day",
          notes: `${shift.start_time} – ${shift.end_time}`,
          date: dateStr,
          time: shift.start_time,
          location: shift.location ?? undefined,
          source: "work_schedule_virtual",
          is_done: false,
          createdAt: "",
          updatedAt: "",
        });
      }
    }
    return virtualEvents;
  }, [userId, workScheduleRows, dbEvents]);

  // ── Merged events (DB events + virtual shift events) ─────────────────────────
  const events = React.useMemo<IQXOEvent[]>(() => {
    const combined = [...dbEvents, ...virtualShiftEvents];
    return combined.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "00:00").localeCompare(b.time || "00:00");
    });
  }, [dbEvents, virtualShiftEvents]);

  const getEventsByPriority = useCallback(
    (priority: Priority) =>
      events.filter(
        (e) =>
          computePriority(e.date) === priority &&
          e.source !== "work_schedule" &&
          e.source !== "work_schedule_virtual"
      ),
    [events],
  );

  const addEventOptimistic = useCallback((event: IQXOEvent) => {
    setDbEvents((prev) => [event, ...prev]);
  }, []);

  const removeEventOptimistic = useCallback((id: string) => {
    setDbEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Theme / language ──────────────────────────────────────────────────────────
  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((p) => (p === "dark" ? "light" : "dark")),
    [],
  );
  const setLanguage = useCallback((l: Language) => setLanguageState(l), []);
  const toggleLanguage = useCallback(() => {
    setLanguageState((p) => {
      const langs: Language[] = ["en", "fr"];
      return langs[(langs.indexOf(p) + 1) % langs.length];
    });
  }, []);

  const t = useCallback(
    (key: string) => translations[language]?.[key] || key,
    [language],
  );

  return (
    <AppContext.Provider
      value={{
        user,
        session,
        authLoading,
        signIn,
        signUp,
        signOut,
        planStatus,
        trialEndsAt,
        planResolved,
        setPlanStatus,
        totalUsage,
        setTotalUsage,
        usageLoading,
        refreshUsage,
        events,
        loading,
        refreshEvents,
        hydrated,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventsByPriority,
        addEventOptimistic,
        removeEventOptimistic,
        theme,
        language,
        setTheme,
        toggleTheme,
        setLanguage,
        toggleLanguage,
        t,
        onboardingDone,
        setOnboardingDone,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
