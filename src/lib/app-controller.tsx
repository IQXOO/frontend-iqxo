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

  // Normalize path without trailing slash for robust routing checks
  const path = location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  // Public standalone pages that must NEVER be redirected away from under any circumstances
  const isPublicStandalonePage = path === "/terms" || path === "/privacy" || path === "/reset-password" || path === "/pricing";

  useEffect(() => {
    if (isPublicStandalonePage) return;
    if (!user || !shouldAutoOpenPricing || planStatus !== "free_trial" || !trialEndsAt || path === "/pricing") return;

    const check = () => {
      if (trialEndsAt < new Date()) navigate("/pricing");
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user, planStatus, trialEndsAt, shouldAutoOpenPricing, path, navigate, isPublicStandalonePage]);

  // Prevent logged-in users from seeing /login
  useEffect(() => {
    if (authLoading || isPublicStandalonePage) return;
    if (user && path === "/login") {
      if (!onboardingDone) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [user, onboardingDone, authLoading, path, navigate, isPublicStandalonePage]);

  // Prevent logged-in users from seeing /onboarding if they already completed it
  // Or force them to /onboarding if they haven't completed it!
  useEffect(() => {
    if (authLoading || !user || isPublicStandalonePage) return;
    if (!onboardingDone && path !== "/onboarding") {
      navigate("/onboarding", { replace: true });
    } else if (onboardingDone && path === "/onboarding") {
      navigate("/home", { replace: true });
    }
  }, [user, onboardingDone, authLoading, path, navigate, isPublicStandalonePage]);

  // Calendar Onboarding: if user hasn't done calendar onboarding, force them there.
  // Otherwise, if they try to access it after finishing, they can (e.g. from settings) or we can let them.
  useEffect(() => {
    if (authLoading || !user || isPublicStandalonePage) return;
    if (onboardingDone) {
      if (!calendarOnboardingDone && path !== "/connect-calendars") {
        navigate("/connect-calendars", { replace: true });
      }
    }
  }, [user, onboardingDone, calendarOnboardingDone, authLoading, path, navigate, isPublicStandalonePage]);

  // If not authenticated and not on a public path, redirect appropriately
  useEffect(() => {
    if (authLoading) return;

    // Safety net: if URL still has incoming auth tokens being exchanged, do not redirect to /login
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes("access_token") || search.includes("code=")) {
        return;
      }
    }

    const publicPaths = new Set(["/terms", "/privacy", "/reset-password", "/index.html", "/login", "/welcome", "/connect-calendars", "/pricing", "/onboarding"]);
    if (!user && !publicPaths.has(path)) {
      const isDismissed = typeof window !== "undefined" && localStorage.getItem("iqxo_intro_dismissed") === "1";
      if (!isDismissed) {
        navigate("/welcome", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }
  }, [user, authLoading, path, navigate]);

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
          const mappedEvents = result.events.map((ev: any) => {
            let eventDate = ev.date;

            // Defensive normalization for all-day events (no time specified):
            // Native calendars on iOS/Android anchor all-day events to UTC midnight (e.g. 23:00 on the night before in UTC+1).
            // Using the midday (12h) timestamp from native_event_id ensures the date cleanly matches the intended calendar day
            // across all timezones, protecting existing production users immediately even before native app updates.
            const isAllDay = (!ev.time || String(ev.time).trim() === "") && (!ev.start_time || String(ev.start_time).trim() === "");
            if (isAllDay && ev.native_event_id) {
              const lastUnderscore = ev.native_event_id.lastIndexOf("_");
              if (lastUnderscore !== -1) {
                const ts = Number(ev.native_event_id.slice(lastUnderscore + 1));
                if (!isNaN(ts) && ts > 1000000000000) {
                  const noon = new Date(ts + 12 * 60 * 60 * 1000);
                  eventDate = `${noon.getFullYear()}-${String(noon.getMonth() + 1).padStart(2, "0")}-${String(noon.getDate()).padStart(2, "0")}`;
                }
              }
            }

            return {
              native_event_id: ev.native_event_id || ev.id,
              title: ev.title,
              date: eventDate,
              time: ev.time,
              start_time: ev.start_time || ev.time,
              end_time: ev.end_time || ev.time,
              location: ev.location,
              link: ev.link || null,
              notes: ev.notes,
              calendar_id: ev.calendar_id,
              source: "calendar_sync"
            };
          });

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
          if (typeof window !== 'undefined') {
            const win = window as any;
            if (win.__IQXO_postMessage) {
              win.__IQXO_postMessage(JSON.stringify({ type: 'requestCalendarEvents' }));
            } else if (win.ReactNativeWebView) {
              win.ReactNativeWebView.postMessage(JSON.stringify({ type: 'requestCalendarEvents' }));
            }
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
