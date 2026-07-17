import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./lib/store";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/toaster";
import {
  shouldAutoOpenBillingRoute,
} from "./lib/billing-utils";
import "./styles/globals.css";
import { launchAppWithFallback } from "./lib/auth-urls";

// ── Native app OAuth redirect ─────────────────────────────────────────────────
// When Google OAuth completes in the external browser, Supabase redirects to
// https://website.com/home?iqxo_app=1#access_token=...&refresh_token=...
// We detect this here and immediately redirect to com.iqxo.app://auth#... so
// the OS opens the IQXO native app and passes the tokens back to the WebView.
function useNativeAppOAuthRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash; // "#access_token=xxx&..."
    const hasIqxoApp = params.get("iqxo_app") === "1" || hash.includes("iqxo_app=1");

    if (hasIqxoApp && hash.includes("access_token")) {
      // Use the helper to determine the correct deep link and handle store fallbacks
      launchAppWithFallback(hash, window.location.href);
    }
  }, []);
}

const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TomorrowPage = lazy(() => import("./pages/TomorrowPage"));
const FuturePage = lazy(() => import("./pages/FuturePage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const AppLayout = lazy(() => import("./components/AppLayout"));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const RouterInit = lazy(() => import("./lib/router-init"));
const AppController = lazy(() => import("./lib/app-controller"));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#E8E8E8] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#5BC0DE] animate-spin" />
    </div>
  );
}

function _AppShell() {
  const {
    user,
    authLoading,
    planStatus,
    planResolved,
    trialEndsAt,
    onboardingDone,
    setOnboardingDone,
  } = useApp();
  const [introDismissed, setIntroDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("iqxo_intro_dismissed") === "1";
  });

  // Track the previous user id so we only trigger on actual login/signup transitions
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const [pathname, setPathname] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/",
  );

  const _canShowBillingPopup = shouldShowBillingPopup(planResolved, planStatus);
  const shouldAutoOpenPricing = shouldAutoOpenBillingRoute(
    planResolved,
    planStatus,
    trialEndsAt,
  );

  useEffect(() => {
    const handlePathChange = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handlePathChange);
    return () => window.removeEventListener("popstate", handlePathChange);
  }, []);

  // ── Sync user ID to Native App for RevenueCat ──────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as { isNativeApp?: boolean; ReactNativeWebView?: { postMessage: (msg: string) => void } };
    const isNative = win.isNativeApp || (typeof navigator !== 'undefined' && navigator.userAgent.includes("IQXONativeApp"));
    if (!isNative || !win.ReactNativeWebView) return;

    if (user?.id) {
      win.ReactNativeWebView.postMessage(JSON.stringify({
        type: "set_user_id",
        userId: user.id,
      }));
    } else if (user === null) {
      win.ReactNativeWebView.postMessage(JSON.stringify({
        type: "logout",
      }));
    }
  }, [user]);

  // ── Trigger 1: Show pricing right after login or signup ──────────────────────
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;

    // undefined = first render (app just loaded with an existing session) — don't show
    // null → string = user just logged in / signed up — DO show
    if (
      prevUserId === null &&
      user &&
      shouldAutoOpenPricing &&
      pathname !== "/pricing"
    ) {
      // Small delay so the app fully loads first
      const t = setTimeout(() => navigateToPath("/pricing"), 400);
      return () => clearTimeout(t);
    }

    prevUserIdRef.current = user?.id ?? null;
  }, [user, shouldAutoOpenPricing, pathname]);

  // ── Trigger 2: Show pricing when plan is "none" or "expired" ─────────────────
  // This handles: brand-new user whose plan wasn't set yet, and trial that just expired
  useEffect(() => {
    if (!user) return;
    if (!planResolved) return;
    if (!shouldAutoOpenPricing) return;
    if (pathname === "/pricing") return;
    const t = setTimeout(() => navigateToPath("/pricing"), 400);
    return () => clearTimeout(t);
  }, [user, planResolved, shouldAutoOpenPricing, pathname]);

  // ── Trigger 3: Poll every 60s to detect trial expiry while app is open ────────
  useEffect(() => {
    if (
      !user ||
      !shouldAutoOpenPricing ||
      planStatus !== "free_trial" ||
      !trialEndsAt ||
      pathname === "/pricing"
    )
      return;

    const check = () => {
      if (trialEndsAt < new Date()) {
        navigateToPath("/pricing");
      }
    };

    check(); // immediate check
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user, planStatus, trialEndsAt, shouldAutoOpenPricing, pathname]);

  // Keep reset-password and pricing public pages but we'll route via React Router

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Show onboarding (language picker) once before the auth form
  if (!onboardingDone && !introDismissed) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <OnboardingPage
          onDone={async () => {
            setIntroDismissed(true);
            if (typeof window !== "undefined") {
              localStorage.setItem("iqxo_intro_dismissed", "1");
            }
            await setOnboardingDone(true);
          }}
        />
      </Suspense>
    );
  }

  // ── Auth routing ──────────────────────────────────────────────────────────────
  // ── Auth routing (central guard) ──────────────────────────────────────────────
  // Public routes that do not require authentication
  const _publicPaths = new Set<string>([
    "/pricing",
    "/terms",
    "/privacy",
    "/reset-password",
    "/index.html",
  ]);

  // We'll render the routing via React Router in App()
  return null;
}

function RootRedirect() {
  const { user, authLoading } = useApp();
  if (authLoading) return null;
  if (user) {
    return <Navigate to="/home" replace />;
  }
  return <Navigate to="/onboarding" replace />;
}

function App() {
  // Redirect back to native app synchronously if this page was opened after OAuth.
  // This must run before any hooks or component rendering to prevent React Router
  // from navigating and stripping the hash/query parameters.
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash; // "#access_token=xxx&..."
    const hasIqxoApp = params.get("iqxo_app") === "1" || hash.includes("iqxo_app=1");

    if (hasIqxoApp && hash.includes("access_token")) {
      launchAppWithFallback(hash, window.location.href);
      return null;
    }
  }

  // Redirect back to native app if this page was opened after OAuth (fallback hook)
  useNativeAppOAuthRedirect();

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-background text-foreground">
        <AppProvider>
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              {/* Router initializer registers navigate function for legacy navigateToPath calls */}
              <RouterInit />
              {/* AppController runs side-effects previously in AppShell (pricing, onboarding, auth redirects) */}
              <AppController />
              <Routes>
                <Route path="/" element={<RootRedirect />} />

                <Route element={<ProtectedRoute />}> 
                  <Route element={<AppLayout />}> 
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/tomorrow" element={<TomorrowPage />} />
                    <Route path="/future" element={<FuturePage />} />
                    <Route path="/schedule" element={<SchedulePage />} />
                    <Route path="/archive" element={<ArchivePage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
        </AppProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
