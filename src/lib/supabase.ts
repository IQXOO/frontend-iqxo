import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// SECURITY NOTE:
// - `VITE_SUPABASE_ANON_KEY` is public by design for client-side usage.
// - NEVER expose the Supabase `service_role` or any admin key in client builds.
// - Ensure Row Level Security (RLS) policies are configured in Supabase
//   so that authenticated users can only access their own rows.

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
