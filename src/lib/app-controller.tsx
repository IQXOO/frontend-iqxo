import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { shouldAutoOpenBillingRoute } from "../lib/billing-utils";

export default function AppController() {
  const { user, authLoading, planStatus, planResolved, trialEndsAt, onboardingDone, setOnboardingDone: _setOnboardingDone, refreshEvents, calendarOnboardingDone } = useApp();
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

  // Prevent logged-in users from seeing /login
  useEffect(() => {
    if (authLoading) return;
    if (user && location.pathname === "/login") {
      if (!onboardingDone) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [user, onboardingDone, authLoading, location.pathname, navigate]);

  // Prevent logged-in users from seeing /onboarding if they already completed it
  // Or force them to /onboarding if they haven't completed it!
  useEffect(() => {
    if (authLoading || !user) return;
    if (!onboardingDone && location.pathname !== "/onboarding") {
      navigate("/onboarding", { replace: true });
    } else if (onboardingDone && location.pathname === "/onboarding") {
      navigate("/home", { replace: true });
    }
  }, [user, onboardingDone, authLoading, location.pathname, navigate]);

  // Calendar Onboarding: if user hasn't done calendar onboarding, force them there.
  // Otherwise, if they try to access it after finishing, they can (e.g. from settings) or we can let them.
  useEffect(() => {
    if (authLoading) return;
    if (user && onboardingDone) {
      if (!calendarOnboardingDone && location.pathname !== "/connect-calendars") {
        navigate("/connect-calendars", { replace: true });
      }
    }
  }, [user, onboardingDone, calendarOnboardingDone, authLoading, location.pathname, navigate]);

  // If not authenticated and not on a public path, redirect appropriately
  useEffect(() => {
    if (authLoading) return;
    const publicPaths = new Set(["/terms", "/privacy", "/reset-password", "/index.html", "/login", "/welcome", "/connect-calendars"]);
    if (!user && !publicPaths.has(location.pathname)) {
      const isDismissed = typeof window !== "undefined" && localStorage.getItem("iqxo_intro_dismissed") === "1";
      if (!isDismissed) {
        navigate("/welcome", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
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
            await refreshEvents();
          }
        } catch (err) {
          console.error("[AutoSync] Error:", err);
        } finally {
          syncInProgress = false;
        }
      };

      window.addEventListener('nativeCalendarReady', handleNativeCalendar);
      
      const triggerSync = () => {
        // Only request native calendar if the user explicitly enabled it
        if (user.user_metadata?.sync_local_calendar === true) {
          if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
            (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'requestCalendarEvents' }));
          }
        }
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

  // Global Cloud Calendar Auto-Sync
  useEffect(() => {
    if (authLoading || !user) return;
    
    let isFetching = false;
    const syncCloudCalendars = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const { supabase } = await import("./supabase");
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (token) {
          const backendUrl = import.meta.env?.VITE_BACKEND_API || "http://localhost:4040";
          const res = await fetch(`${backendUrl}/api/calendar/sync-cloud`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data?.added > 0) refreshEvents();
        }
      } catch (err) {} finally {
        isFetching = false;
      }
    };

    // Defer the initial sync so it doesn't compete with the Home page data fetching
    const timeoutId = setTimeout(() => {
      syncCloudCalendars();
    }, 3000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncCloudCalendars();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [authLoading, user, refreshEvents]);

  // Render nothing — this component only controls side-effects and redirects.
  if (authLoading) return null;
  return null;
}
