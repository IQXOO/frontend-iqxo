import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { shouldAutoOpenBillingRoute } from "../lib/billing-utils";

export default function AppController() {
  const { user, authLoading, planStatus, planResolved, trialEndsAt, onboardingDone, setOnboardingDone: _setOnboardingDone } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const _prevUserRef = useRef<string | null | undefined>(undefined);

  const shouldAutoOpenPricing = shouldAutoOpenBillingRoute(planResolved, planStatus, trialEndsAt);

  // Auto pricing redirect disabled in favor of premium inline bottom sheet paywall
  /*
  useEffect(() => {
    const prevUserId = prevUserRef.current;

    if (prevUserId === null && user && shouldAutoOpenPricing && location.pathname !== "/pricing") {
      const t = setTimeout(() => navigate("/pricing"), 400);
      return () => clearTimeout(t);
    }

    prevUserRef.current = user?.id ?? null;
  }, [user, shouldAutoOpenPricing, location.pathname, navigate]);

  useEffect(() => {
    if (!user) return;
    if (!planResolved) return;
    if (!shouldAutoOpenPricing) return;
    if (location.pathname === "/pricing") return;
    const t = setTimeout(() => navigate("/pricing"), 400);
    return () => clearTimeout(t);
  }, [user, planResolved, shouldAutoOpenPricing, location.pathname, navigate]);
  */

  useEffect(() => {
    if (!user || !shouldAutoOpenPricing || planStatus !== "free_trial" || !trialEndsAt || location.pathname === "/pricing") return;

    const check = () => {
      if (trialEndsAt < new Date()) navigate("/pricing");
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user, planStatus, trialEndsAt, shouldAutoOpenPricing, location.pathname, navigate]);

  // Show onboarding immediate if not done
  useEffect(() => {
    if (authLoading) return;
    const publicPaths = new Set(["/pricing", "/terms", "/privacy", "/reset-password", "/index.html", "/onboarding", "/login"]);
    if (publicPaths.has(location.pathname)) return;

    const isDismissed = typeof window !== "undefined" && localStorage.getItem("iqxo_intro_dismissed") === "1";
    if (!onboardingDone && !isDismissed) {
      navigate("/onboarding");
    }
  }, [onboardingDone, authLoading, location.pathname, navigate]);

  // Prevent logged-in users from seeing /login
  useEffect(() => {
    if (authLoading) return;
    if (user && location.pathname === "/login") {
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, location.pathname, navigate]);

  // Prevent logged-in users from seeing /onboarding if they already completed it
  useEffect(() => {
    if (authLoading) return;
    if (user && onboardingDone && location.pathname === "/onboarding") {
      navigate("/home", { replace: true });
    }
  }, [user, onboardingDone, authLoading, location.pathname, navigate]);

  // If not authenticated and not on a public path, redirect to /login
  useEffect(() => {
    if (authLoading) return;
    const publicPaths = new Set(["/pricing", "/terms", "/privacy", "/reset-password", "/index.html", "/onboarding"]);
    if (!user && !publicPaths.has(location.pathname) && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, location.pathname, navigate]);

  // Global Native Calendar Auto-Sync (Runs on startup & foreground)
  useEffect(() => {
    if (authLoading || !user) return;
    
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      let syncInProgress = false;
      const handleNativeCalendar = async (e: Event) => {
        if (syncInProgress) return;
        
        const result = (window as any).__nativeCalendarResult;
        if (!result || result.error || !result.events) return;
        
        syncInProgress = true;
        try {
          const mappedEvents = result.events.map((ev: any) => ({
            native_event_id: ev.native_event_id || ev.id,
            title: ev.title,
            date: ev.date,
            time: ev.time,
            start_time: ev.start_time || ev.time,
            end_time: ev.end_time || ev.time,
            location: ev.location,
            notes: ev.notes,
            calendar_id: ev.calendar_id,
            source: "calendar_sync"
          }));

          const { supabase } = await import("./supabase");
          const { fetchWithDiagnostics, readResponseText } = await import("./logger");
          const { data: { session } } = await supabase.auth.getSession();

          const response = await fetchWithDiagnostics(
            "AutoSync",
            "POST /api/calendar/sync-batch",
            `${import.meta.env.VITE_BACKEND_API || "http://localhost:4040"}/api/calendar/sync-batch`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token || ""}`,
              },
              body: JSON.stringify({ events: mappedEvents }),
            }
          );
          const data = await readResponseText(response);
          
          let syncResult;
          try {
            syncResult = JSON.parse(data);
          } catch (e) {
            console.error("[AutoSync] JSON Parse error. Server returned:", data.slice(0, 200));
            return;
          }
          
          if (syncResult.ok) {
            const { useApp } = await import("./store");
            await useApp.getState().refreshEvents();
          }
        } catch (err) {
          console.error("[AutoSync] Error:", err);
        } finally {
          syncInProgress = false;
        }
      };

      window.addEventListener('nativeCalendarReady', handleNativeCalendar);
      
      const triggerSync = () => {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'requestCalendarEvents' }));
      };

      // 1. Sync on startup
      triggerSync();

      // 2. Sync on foreground (visibilitychange)
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          triggerSync();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      return () => {
        window.removeEventListener('nativeCalendarReady', handleNativeCalendar);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }
  }, [user, authLoading]);

  // Render nothing — this component only controls side-effects and redirects.
  if (authLoading) return null;
  return null;
}
