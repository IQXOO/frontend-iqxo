export type Language = "en" | "fr" | "ar";
export type Theme = "dark" | "light";
export type Priority = "urgent" | "upcoming" | "later" | "past";

export interface IQXOEvent {
  id: string;
  user_id?: string;
  title: string;
  notes: string;
  date: string;
  time: string;
  start_time?: string | null;
  end_time?: string | null;
  color?: string | null;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  reminders?: { minutes_before: number }[] | null;
  phone?: string | null;
  location?: string | null;
  link?: string | null;
  email?: string | null;
  image_url?: string | null;
  pdf_url?: string | null;
  createdAt: string;
  updatedAt: string;
  source: string;
  is_done: boolean;
  native_event_id?: string | null;
  calendar_id?: string | null;
  has_conflict?: boolean | null;
}

export interface AppState {
  events: IQXOEvent[];
  theme: Theme;
  language: Language;
}
