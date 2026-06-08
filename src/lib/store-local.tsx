"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

// Types (same as your original)
export type Priority = "urgent" | "upcoming" | "later" | "past";
export type Language = "en" | "fr" | "ar";
export type Theme = "dark" | "light" | "system";

export interface IQXOEvent {
  id: string;
  title: string;
  notes: string;
  date: string;
  time: string;
  phone?: string;
  location?: string;
  email?: string;
  source: string;
  image_url?: string;
  is_done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  fullName: string | null;
  locale: string | null;
}

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    locale?: string;
  };
}

interface AppContextValue {
  // State
  events: IQXOEvent[];
  theme: Theme;
  language: Language;
  loading: boolean;
  hydrated: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  addEvent: (event: Omit<IQXOEvent, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateEvent: (id: string, data: Partial<IQXOEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByPriority: (priority: Priority) => IQXOEvent[];
  t: (key: string) => string;
  refreshEvents: () => Promise<void>;
  addEventOptimistic: (event: IQXOEvent) => void;
  removeEventOptimistic: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// Local storage keys
const STORAGE_EVENTS = "iqxo_events";
const STORAGE_THEME = "iqxo_theme";
const STORAGE_LANGUAGE = "iqxo_language";
const _STORAGE_USER = "iqxo_user";

// Mock translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    "app.title": "IQXO",
    "events.title": "Events",
    "events.add": "Add Event",
    "events.empty": "No events yet",
    "cancel": "Cancel",
    "delete": "Delete",
    "save": "Save",
    "edit": "Edit",
    "share": "Share",
    "today": "Today",
    "tomorrow": "Tomorrow",
    "urgent": "Urgent",
    "upcoming": "Upcoming",
    "later": "Later",
    "past": "Past",
  },
  fr: {
    "app.title": "IQXO", 
    "events.title": "Événements",
    "events.add": "Ajouter",
    "events.empty": "Aucun événement",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "save": "Enregistrer",
    "edit": "Modifier",
    "share": "Partager",
    "today": "Aujourd'hui",
    "tomorrow": "Demain",
    "urgent": "Urgent",
    "upcoming": "À venir",
    "later": "Plus tard",
    "past": "Passé",
  },
  ar: {
    "app.title": "IQXO",
    "events.title": "الأحداث", 
    "events.add": "إضافة",
    "events.empty": "لا توجد أحداث",
    "cancel": "إلغاء",
    "delete": "حذف",
    "save": "حفظ",
    "edit": "تعديل",
    "share": "مشاركة",
    "today": "اليوم",
    "tomorrow": "غداً",
    "urgent": "عاجل",
    "upcoming": "قادم",
    "later": "لاحقاً",
    "past": "ماضي",
  },
};

// Priority computation
export function computePriority(dateStr: string): Priority {
  const eventDate = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const diffTime = eventDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (eventDate < today) return "past";
  if (diffDays === 0) return "urgent";
  if (diffDays === 1) return "upcoming";
  return "later";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<IQXOEvent[]>([]);
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<Language>("en");
  const [loading, _setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      // Load theme
      const savedTheme = localStorage.getItem(STORAGE_THEME) as Theme;
      if (savedTheme && ["dark", "light", "system"].includes(savedTheme)) {
        setTheme(savedTheme);
      }

      // Load language
      const savedLang = localStorage.getItem(STORAGE_LANGUAGE) as Language;
      if (savedLang) {
        setLanguage(savedLang);
      }

      // Load events
      const savedEvents = localStorage.getItem(STORAGE_EVENTS);
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents);
        setEvents(parsedEvents);
      } else {
        // Add demo events for first-time users
        const demoEvents: IQXOEvent[] = [
          {
            id: "demo-1",
            title: "Team Meeting",
            notes: "Quarterly review and planning session",
            date: new Date().toISOString().split("T")[0], // Today
            time: "10:00",
            phone: "+1234567890",
            location: "Conference Room A",
            source: "manual",
            is_done: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "demo-2", 
            title: "Doctor Appointment",
            notes: "Annual health checkup",
            date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
            time: "14:30",
            phone: "+9876543210",
            location: "Medical Center, Floor 3",
            source: "manual",
            is_done: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: "demo-3",
            title: "Project Deadline",
            notes: "Submit final project deliverables",
            date: new Date(Date.now() + 172800000).toISOString().split("T")[0], // Day after tomorrow
            time: "17:00",
            phone: undefined,
            location: "Office - Remote",
            source: "manual",
            is_done: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        setEvents(demoEvents);
        localStorage.setItem(STORAGE_EVENTS, JSON.stringify(demoEvents));
      }

      setHydrated(true);
    } catch (err) {
      console.error("Failed to load from localStorage:", err);
      setHydrated(true);
    }
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
    }
  }, [events, hydrated]);

  // Save theme to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_THEME, theme);
      document.documentElement.className = theme === "dark" ? "dark" : "light";
    }
  }, [theme, hydrated]);

  // Save language to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_LANGUAGE, language);
    }
  }, [language, hydrated]);

  // Translation function
  const t = useCallback((key: string) => {
    return translations[language]?.[key] || key;
  }, [language]);

  // Toggle functions
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => {
      const langs: Language[] = ["en", "fr", "ar"];
      const currentIndex = langs.indexOf(prev);
      return langs[(currentIndex + 1) % langs.length];
    });
  }, []);

  // Event operations (local storage only)
  const addEvent = useCallback(async (data: Omit<IQXOEvent, "id" | "createdAt" | "updatedAt">) => {
    const newEvent: IQXOEvent = {
      id: `event-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setEvents(prev => [newEvent, ...prev]);
  }, []);

  const updateEvent = useCallback(async (id: string, data: Partial<IQXOEvent>) => {
    setEvents(prev => prev.map(event => 
      event.id === id 
        ? { ...event, ...data, updatedAt: new Date().toISOString() }
        : event
    ));
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  }, []);

  const getEventsByPriority = useCallback((priority: Priority) => {
    return events.filter(e => computePriority(e.date) === priority);
  }, [events]);

  const refreshEvents = useCallback(async () => {
    // In local storage version, events are already in state
    // This function is kept for compatibility
    return;
  }, []);

  const addEventOptimistic = useCallback((event: IQXOEvent) => {
    setEvents(prev => [event, ...prev]);
  }, []);

  const removeEventOptimistic = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  const _signOut = useCallback(async () => {
    setEvents([]);
    localStorage.removeItem(STORAGE_EVENTS);
  }, []);

  return (
    <AppContext.Provider
      value={{
        events,
        theme,
        language,
        loading,
        hydrated,
        setTheme,
        toggleTheme,
        setLanguage,
        toggleLanguage,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventsByPriority,
        t,
        refreshEvents,
        addEventOptimistic,
        removeEventOptimistic,
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
