import type { IQXOEvent } from "./types";

/**
 * Safely parse a date string into a local midnight Date object
 * to prevent timezone shifting (e.g. UTC vs GMT+3).
 */
export function parseSafeDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Canonical holiday key generator to unify multilingual calendar holidays.
 */
export function getCanonicalHolidayKey(title?: string | null): string | null {
  if (!title || typeof title !== "string") return null;
  const clean = title.trim().toLowerCase();

  // Christmas Eve
  if (/christmas\s*eve|vigilia\s*di\s*natale|réveillon\s*de\s*noël|ليلة\s*عيد\s*الميلاد/.test(clean)) {
    return "holiday_christmas_eve";
  }
  // Christmas Day
  if (/\bchristmas\b|\bnatale\b|\bnoël\b|\bnoel\b|عيد\s*الميلاد/.test(clean)) {
    return "holiday_christmas_day";
  }
  // St. Stephen's Day / Boxing Day / Santo Stefano
  if (/stephen|stefano|boxing\s*day|étienne|etienne|إستفانوس|استفانوس/.test(clean)) {
    return "holiday_st_stephen";
  }
  // New Year's Eve
  if (/new\s*year['’]?s\s*eve|notte\s*di\s*san\s*silvestro|vigilia\s*di\s*capodanno|réveillon|ليلة\s*رأس\s*السنة/.test(clean)) {
    return "holiday_new_years_eve";
  }
  // New Year's Day
  if (/new\s*year['’]?s\s*day|\bnew\s*year\b|capodanno|jour\s*de\s*l['’]an|رأس\s*السنة/.test(clean)) {
    return "holiday_new_years_day";
  }
  // Epiphany
  if (/epiphany|epifania|épiphanie|epiphanie|الغطاس/.test(clean)) {
    return "holiday_epiphany";
  }
  // Easter Monday
  if (/easter\s*monday|lunedì\s*dell['’]angelo|lunedi\s*dell['’]angelo|pasquetta|lundi\s*de\s*pâques|شم\s*النسيم/.test(clean)) {
    return "holiday_easter_monday";
  }
  // Easter Sunday
  if (/easter|pasqua|pâques|paques|القيامة/.test(clean)) {
    return "holiday_easter_sunday";
  }
  // Labor Day
  if (/labor\s*day|lavoratori|travail|عيد\s*العمال/.test(clean)) {
    return "holiday_labor_day";
  }
  // Assumption of Mary / Ferragosto
  if (/assumption|assunzione|ferragosto|assomption|انتقال\s*العذراء/.test(clean)) {
    return "holiday_assumption";
  }
  // All Saints
  if (/all\s*saints|tutti\s*i\s*santi|toussaint|جميع\s*القديسين/.test(clean)) {
    return "holiday_all_saints";
  }
  // Immaculate Conception
  if (/immaculate|immacolata|immaculée|immaculee|الحبل\s*بلا\s*دنس/.test(clean)) {
    return "holiday_immaculate_conception";
  }
  return null;
}

/**
 * Defensive guard against floating timezone or UTC date drift on fixed international holidays.
 */
export function getNormalizedHolidayDate(title?: string | null, dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return dateStr || "";
  const canonical = getCanonicalHolidayKey(title);
  if (!canonical) return dateStr.split("T")[0];
  const year = dateStr.slice(0, 4);

  switch (canonical) {
    case "holiday_st_stephen":
      return `${year}-12-26`;
    case "holiday_christmas_day":
      return `${year}-12-25`;
    case "holiday_christmas_eve":
      return `${year}-12-24`;
    case "holiday_new_years_day":
      return `${year}-01-01`;
    case "holiday_new_years_eve":
      return `${year}-12-31`;
    case "holiday_epiphany":
      return `${year}-01-06`;
    case "holiday_all_saints":
      return `${year}-11-01`;
    case "holiday_immaculate_conception":
      return `${year}-12-08`;
    default:
      return dateStr.split("T")[0];
  }
}

export function isEventOnDate(event: IQXOEvent, targetDateStr: string): boolean {
  if (!event || !targetDateStr) return false;
  const cleanTarget = targetDateStr.split("T")[0];
  const cleanEvent = getNormalizedHolidayDate(event.title, event.date);

  if (cleanEvent === cleanTarget) return true;
  if (!event.recurrence_rule) return false;

  const targetDate = parseSafeDate(cleanTarget);
  const eventDate = parseSafeDate(cleanEvent);

  if (targetDate.getTime() < eventDate.getTime()) return false;

  if (event.recurrence_end_date) {
    const endDate = parseSafeDate(event.recurrence_end_date);
    if (targetDate.getTime() > endDate.getTime()) return false;
  }

  const rule = event.recurrence_rule.toUpperCase();
  if (rule.includes("FREQ=DAILY")) return true;
  if (rule.includes("FREQ=WEEKLY")) return targetDate.getDay() === eventDate.getDay();
  if (rule.includes("FREQ=MONTHLY")) return targetDate.getDate() === eventDate.getDate();
  if (rule.includes("FREQ=YEARLY")) return targetDate.getDate() === eventDate.getDate() && targetDate.getMonth() === eventDate.getMonth();

  return false;
}

export function getNextOccurrence(event: IQXOEvent): Date | null {
  const now = new Date();
  const timeStr = event.start_time || event.time || "23:59";
  const [hours, minutes] = timeStr.split(":").map(Number);
  
  let current = parseSafeDate(event.date);
  if (isNaN(current.getTime())) return null;
  current.setHours(hours || 0, minutes || 0, 0, 0);
  
  if (!event.recurrence_rule) {
    return current > now ? current : null;
  }
  
  const rule = event.recurrence_rule.toUpperCase();
  const end = event.recurrence_end_date ? parseSafeDate(event.recurrence_end_date) : new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  end.setHours(23, 59, 59, 999);
  
  while (current <= now && current <= end) {
    if (rule.includes("FREQ=DAILY")) {
      current.setDate(current.getDate() + 1);
    } else if (rule.includes("FREQ=WEEKLY")) {
      current.setDate(current.getDate() + 7);
    } else if (rule.includes("FREQ=MONTHLY")) {
      current.setMonth(current.getMonth() + 1);
    } else if (rule.includes("FREQ=YEARLY")) {
      current.setFullYear(current.getFullYear() + 1);
    } else {
      break;
    }
  }
  
  if (current > end) return null;
  return current;
}

/**
 * Returns today's occurrence if the event occurs today,
 * otherwise returns the next future occurrence,
 * or falls back to the event's initial date.
 */
export function getEventDisplayDate(event: IQXOEvent, referenceDate: Date = new Date()): Date {
  const yyyy = referenceDate.getFullYear();
  const mm = String(referenceDate.getMonth() + 1).padStart(2, "0");
  const dd = String(referenceDate.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (isEventOnDate(event, todayStr)) {
    const timeStr = event.start_time || event.time || "00:00";
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(referenceDate);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }

  const nextOcc = getNextOccurrence(event);
  if (nextOcc) return nextOcc;

  return parseSafeDate(event.date);
}

export function computeEventPriority(event: IQXOEvent): "urgent" | "upcoming" | "later" | "past" {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  
  if (isEventOnDate(event, todayStr)) return "urgent";

  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (isEventOnDate(event, dateStr)) return "upcoming";
  }

  const nextOcc = getNextOccurrence(event);
  if (nextOcc) return "later";
  
  return "past";
}

