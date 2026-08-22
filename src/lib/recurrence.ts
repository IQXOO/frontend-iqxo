import type { IQXOEvent } from "./types";

export function isEventOnDate(event: IQXOEvent, targetDateStr: string): boolean {
  if (event.date === targetDateStr) return true;
  if (!event.recurrence_rule) return false;

  const targetDate = new Date(targetDateStr);
  const eventDate = new Date(event.date);

  targetDate.setHours(0,0,0,0);
  eventDate.setHours(0,0,0,0);

  if (targetDate.getTime() < eventDate.getTime()) return false;

  if (event.recurrence_end_date) {
    const endDate = new Date(event.recurrence_end_date);
    endDate.setHours(0,0,0,0);
    if (targetDate.getTime() > endDate.getTime()) return false;
  }

  if (event.recurrence_rule.includes("FREQ=DAILY")) return true;
  if (event.recurrence_rule.includes("FREQ=WEEKLY")) return targetDate.getDay() === eventDate.getDay();
  if (event.recurrence_rule.includes("FREQ=MONTHLY")) return targetDate.getDate() === eventDate.getDate();
  if (event.recurrence_rule.includes("FREQ=YEARLY")) return targetDate.getDate() === eventDate.getDate() && targetDate.getMonth() === eventDate.getMonth();

  return false;
}

export function getNextOccurrence(event: IQXOEvent): Date | null {
  const now = new Date();
  const timeStr = event.start_time || event.time || "23:59";
  const [hours, minutes] = timeStr.split(":").map(Number);
  
  let current = new Date(event.date);
  // Ensure valid date
  if (isNaN(current.getTime())) return null;
  current.setHours(hours || 0, minutes || 0, 0, 0);
  
  if (!event.recurrence_rule) {
    return current > now ? current : null;
  }
  
  const end = event.recurrence_end_date ? new Date(event.recurrence_end_date) : new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  end.setHours(23, 59, 59, 999);
  
  // Advance current to at least 'now' if it's recurring
  // Keep advancing until the occurrence is in the future
  while (current <= now && current <= end) {
    if (event.recurrence_rule.includes("FREQ=DAILY")) {
      current.setDate(current.getDate() + 1);
    } else if (event.recurrence_rule.includes("FREQ=WEEKLY")) {
      current.setDate(current.getDate() + 7);
    } else if (event.recurrence_rule.includes("FREQ=MONTHLY")) {
      current.setMonth(current.getMonth() + 1);
    } else if (event.recurrence_rule.includes("FREQ=YEARLY")) {
      current.setFullYear(current.getFullYear() + 1);
    } else {
      break; // Unknown rule, stop infinite loop
    }
  }
  
  if (current > end) return null;
  return current;
}

export function computeEventPriority(event: IQXOEvent): "urgent" | "upcoming" | "later" | "past" {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  
  if (isEventOnDate(event, todayStr)) return "urgent";

  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (isEventOnDate(event, dateStr)) return "upcoming";
  }

  const nextOcc = getNextOccurrence(event);
  if (nextOcc) return "later";
  
  return "past";
}
