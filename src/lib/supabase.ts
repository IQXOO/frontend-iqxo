import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars. Falling back to a placeholder Supabase client."
  );
}

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : "https://placeholder.supabase.co",
  hasSupabaseConfig ? supabaseAnonKey : "placeholder-anon-key"
);
