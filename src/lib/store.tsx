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
  setPlanStatus: (status: PlanStatus, trialEndsAt?: Date) => void;

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
  refreshEvents: () => Promise<void>;
  addEventOptimistic: (event: IQXOEvent) => void;
  removeEventOptimistic: (id: string) => void;

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
    urgentTitle: "This Week",
    upcomingTitle: "Coming Up",
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
    urgentBadge: "This week",
    upcomingBadge: "Next month",
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
    navToday: "Today",
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
    remindInTwoDays: "Remind me in 2 days",
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
    urgentTitle: "Cette semaine",
    upcomingTitle: "Bientôt",
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
    urgentBadge: "Cette semaine",
    upcomingBadge: "Ce mois",
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
    remindInTwoDays: "Me rappeler dans 2 jours",
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
    // "app.title": "IQXO",
    // "events.title": "الأحداث",
    // "events.add": "إضافة",
    // "events.empty": "لا توجد أحداث",
    // cancel: "إلغاء",
    // delete: "حذف",
    // save: "حفظ",
    // edit: "تعديل",
    // share: "مشاركة",
    // today: "اليوم",
    // tomorrow: "غداً",
    // urgent: "عاجل",
    // upcoming: "قادم",
    // later: "لاحقاً",
    // past: "ماضي",
    // noEvents: "لا توجد أحداث",
    // noEventsDesc: "اضغط لإضافة حدثك الأول",
    // addEvent: "إضافة حدث",
    // noResults: "لا توجد نتائج",
    // live: "مباشر",
    // IQXO: "IQXO",
    // logout_error: "فشل تسجيل الخروج",
  },
};

// ─── Priority helper ──────────────────────────────────────────────────────────
export function computePriority(dateStr: string): Priority {
  const eventDate = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = eventDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (eventDate < today) return "past";
  if (diffDays === 0) return "urgent";
  if (diffDays === 1) return "upcoming";
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
    source: row.source ?? "manual",
    image_url: row.image_url ?? undefined,
    pdf_url: row.pdf_url ?? undefined,
    is_done: row.is_done ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [events, setEvents] = useState<IQXOEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [theme, setThemeState] = useState<Theme>("dark");
  const [language, setLanguageState] = useState<Language>("en");

  // Subscription state (stored in localStorage for simplicity; move to DB as needed)
  const [planStatus, setPlanStatusState] = useState<PlanStatus>("none");
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);

  // ── Bootstrap auth session ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
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

  // ── Load events from Supabase when user changes ──────────────────────────────
  const fetchEvents = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", uid)
        .order("date", { ascending: true });

      if (error) throw error;
      setEvents((data ?? []).map(rowToEvent));
    } catch (err) {
      console.error("fetchEvents error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchEvents(user.id);

      // Load plan from server — wrap in async IIFE so we can use await
      const backendUrl =
        (import.meta as any).env?.VITE_BACKEND_API || "http://localhost:4000";
      (async () => {
        try {
          const r = await fetch(`${backendUrl}/plan-status?userId=${user.id}`);
          if (r.ok) {
            const { planStatus, trialEndsAt: trialEnd } = await r.json();
            setPlanStatusState((planStatus as PlanStatus) || "none");
            if (trialEnd) setTrialEndsAt(new Date(trialEnd));
          } else {
            setPlanStatusState("none");
          }
        } catch {
          // Server unreachable — fall back to localStorage
          const savedPlan = localStorage.getItem(
            `iqxo_plan_${user.id}`,
          ) as PlanStatus | null;
          setPlanStatusState(savedPlan || "none");
        }
      })();
    } else {
      setEvents([]);
      setPlanStatusState("none");
      setTrialEndsAt(null);
    }
  }, [user, fetchEvents]);

  // ── Auth actions ──────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName ?? "" },
          // Email confirmation is disabled — user is logged in immediately after sign-up
        },
      });

      if (error) return { error: error.message };
      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setEvents([]);
  }, []);

  // ── Plan helpers ──────────────────────────────────────────────────────────────
  const setPlanStatus = useCallback(
    (status: PlanStatus, trialEnd?: Date) => {
      if (!user) return;
      // Update local state immediately for instant UI response
      setPlanStatusState(status);
      if (trialEnd) setTrialEndsAt(trialEnd);
      // Also cache in localStorage as offline fallback
      localStorage.setItem(`iqxo_plan_${user.id}`, status);
      if (trialEnd)
        localStorage.setItem(
          `iqxo_trial_end_${user.id}`,
          trialEnd.toISOString(),
        );
    },
    [user],
  );

  // ── Event CRUD ────────────────────────────────────────────────────────────────
  const addEvent = useCallback(
    async (
      data: Omit<IQXOEvent, "id" | "user_id" | "createdAt" | "updatedAt">,
    ) => {
      if (!user) return;
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
          source: data.source,
          image_url: data.image_url ?? null,
          pdf_url: data.pdf_url ?? null,
          is_done: data.is_done,
        })
        .select()
        .single();

      if (error) {
        console.error("addEvent:", error);
        return;
      }
      setEvents((prev) => [rowToEvent(row), ...prev]);
    },
    [user],
  );

  const updateEvent = useCallback(
    async (id: string, data: Partial<IQXOEvent>) => {
      if (!user) return;
      const { data: row, error } = await supabase
        .from("events")
        .update({
          ...(data.title !== undefined && { title: data.title }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.date !== undefined && { date: data.date }),
          ...(data.time !== undefined && { time: data.time }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.location !== undefined && { location: data.location }),
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
        return;
      }
      setEvents((prev) => prev.map((e) => (e.id === id ? rowToEvent(row) : e)));
    },
    [user],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("deleteEvent:", error);
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [user],
  );

  const getEventsByPriority = useCallback(
    (priority: Priority) =>
      events.filter((e) => computePriority(e.date) === priority),
    [events],
  );

  const refreshEvents = useCallback(async () => {
    if (user) await fetchEvents(user.id);
  }, [user, fetchEvents]);

  const addEventOptimistic = useCallback((event: IQXOEvent) => {
    setEvents((prev) => [event, ...prev]);
  }, []);

  const removeEventOptimistic = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
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
        setPlanStatus,
        events,
        loading,
        hydrated,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventsByPriority,
        refreshEvents,
        addEventOptimistic,
        removeEventOptimistic,
        theme,
        language,
        setTheme,
        toggleTheme,
        setLanguage,
        toggleLanguage,
        t,
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
