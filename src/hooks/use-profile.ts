import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/store";

export function useProfile() {
  const { user } = useApp();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      setFullName(null);
      return;
    }

    // Set initial fallback to metadata
    setAvatarUrl(user.user_metadata?.avatar_url || null);
    setFullName(user.user_metadata?.full_name || null);

    let mounted = true;
    
    // Fetch from profiles table which has priority
    supabase
      .from("profiles")
      .select("avatar_url, full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted || error || !data) return;
        
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        if (data.full_name) setFullName(data.full_name);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  return { avatarUrl, fullName };
}
