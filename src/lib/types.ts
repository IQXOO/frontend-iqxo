export type Language = "en" | "fr" | "ar";
export type Theme = "dark" | "light";
export type Priority = "urgent" | "upcoming" | "later" | "past";

export interface IQXOEvent {
  id: string;
  title: string;
  notes: string;
  date: string;
  time: string;
  start_time?: string;
  end_time?: string;
  color?: string;
  recurrence_rule?: string;
  recurrence_end_date?: string;
  reminders?: { minutes_before: number }[];
  phone?: string;
  location?: string;
  email?: string;
  image_url?: string;
  pdf_url?: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  is_done: boolean;
  native_event_id?: string;
}

export interface AppState {
  events: IQXOEvent[];
  theme: Theme;
  language: Language;
}
