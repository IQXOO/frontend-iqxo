export type Language = "en" | "fr" | "ar";
export type Theme = "dark" | "light";
export type Priority = "urgent" | "upcoming" | "later" | "past";

export interface IQXOEvent {
  id: string;
  title: string;
  notes: string;
  date: string;
  time: string;
  phone?: string;
  location?: string;
  image_url?: string;
  pdf_url?: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  is_done: boolean;
}

export interface AppState {
  events: IQXOEvent[];
  theme: Theme;
  language: Language;
}
