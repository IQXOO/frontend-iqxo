import { useEffect, useRef, useState } from "react";
import { AppProvider, useApp } from "./lib/store";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/toaster";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import OnboardingPage from "./pages/OnboardingPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PricingPage from "./pages/PricingPage";
import { shouldAutoOpenBillingRoute, shouldShowBillingPopup } from "./lib/billing-utils";
import { navigateToPath } from "./lib/navigation";
import "./styles/globals.css";

function AppShell() {
  const { user, authLoading, planStatus, planResolved, trialEndsAt, onboardingDone, setOnboardingDone } = useApp();
  const [introDismissed, setIntroDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("iqxo_intro_dismissed") === "1";
  });

  // Track the previous user id so we only trigger on actual login/signup transitions
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const [pathname, setPathname] = useState(() => (typeof window !== "undefined" ? window.location.pathname : "/"));

  const canShowBillingPopup = shouldShowBillingPopup(planResolved, planStatus);
  const shouldAutoOpenPricing = shouldAutoOpenBillingRoute(planResolved, planStatus, trialEndsAt);

  useEffect(() => {
    const handlePathChange = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handlePathChange);
    return () => window.removeEventListener("popstate", handlePathChange);
  }, []);

  // ── Trigger 1: Show pricing right after login or signup ──────────────────────
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;

    // undefined = first render (app just loaded with an existing session) — don't show
    // null → string = user just logged in / signed up — DO show
    if (prevUserId === null && user && shouldAutoOpenPricing && pathname !== "/pricing") {
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
    if (!shouldAutoOpenPricing) return;
    if (pathname === "/pricing") return;
    const t = setTimeout(() => navigateToPath("/pricing"), 400);
    return () => clearTimeout(t);
  }, [user, shouldAutoOpenPricing, pathname]);

  // ── Trigger 3: Poll every 60s to detect trial expiry while app is open ────────
  useEffect(() => {
    if (!user || !shouldAutoOpenPricing || planStatus !== "free_trial" || !trialEndsAt || pathname === "/pricing") return;

    const check = () => {
      if (trialEndsAt < new Date()) {
        navigateToPath("/pricing");
      }
    };

    check(); // immediate check
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user, planStatus, trialEndsAt, shouldAutoOpenPricing, pathname]);

  if (pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  if (pathname === "/pricing") {
    return <PricingPage />;
  }

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
      <OnboardingPage
        onDone={async () => {
          setIntroDismissed(true);
          if (typeof window !== "undefined") {
            localStorage.setItem("iqxo_intro_dismissed", "1");
          }
          await setOnboardingDone(true);
        }}
      />
    );
  }

  // ── Auth routing ──────────────────────────────────────────────────────────────
  // ── Auth routing (central guard) ──────────────────────────────────────────────
  // Public routes that do not require authentication
  const publicPaths = new Set<string>(["/pricing", "/reset-password", "/index.html"]);

  // If user is authenticated, prevent showing the login page
  if (user && pathname === "/login") {
    navigateToPath("/", { replace: true });
    return null;
  }

  // If user is NOT authenticated:
  // - only allow explicit public pages (pricing, reset-password)
  // - if the user requested the login route, render the LoginPage
  // - otherwise redirect to /login (replace history to prevent back navigation)
  if (!user) {
    if (pathname === "/login") {
      return <LoginPage />;
    }

    if (publicPaths.has(pathname)) {
      // allow rendering of public pages without auth
      if (pathname === "/pricing") return <PricingPage />;
      if (pathname === "/reset-password") return <ResetPasswordPage />;
      // fall through for other public pages if added in future
    }

    // Protect all other routes: redirect to /login
    navigateToPath("/login", { replace: true });
    return null;
  }

  // Authenticated user: handle protected routes
  if (user) {
    if (pathname === "/profile") return <ProfilePage />;
  }

  // ── Default: authenticated user on home route ──────────────────────────────────
  return (
    <>
      <HomePage />
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-background text-foreground">
        <AppProvider>
          <AppShell />
          <Toaster />
        </AppProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
