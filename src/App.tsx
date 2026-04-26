import React, { useEffect, useRef, useState } from "react";
import { AppProvider, useApp } from "./lib/store";
import { ThemeProvider } from "./components/theme-provider";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import { StripePricingPage } from "./components/dashboard/stripe-pricing-page";
import "./styles/globals.css";

function AppShell() {
  const { user, authLoading, planStatus, trialEndsAt } = useApp();
  const [showPricing, setShowPricing] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(
    () =>
      typeof window !== "undefined" &&
      !!localStorage.getItem("iqxo_onboarding_done"),
  );

  // Track the previous user id so we only trigger on actual login/signup transitions
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // ── Trigger 1: Show pricing right after login or signup ──────────────────────
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;

    // undefined = first render (app just loaded with an existing session) — don't show
    // null → string = user just logged in / signed up — DO show
    if (prevUserId === null && user) {
      // Small delay so the app fully loads first
      const t = setTimeout(() => setShowPricing(true), 400);
      return () => clearTimeout(t);
    }

    prevUserIdRef.current = user?.id ?? null;
  }, [user]);

  // ── Trigger 2: Show pricing when plan is "none" or "expired" ─────────────────
  // This handles: brand-new user whose plan wasn't set yet, and trial that just expired
  useEffect(() => {
    if (!user) return;
    if (planStatus === "none" || planStatus === "expired") {
      const t = setTimeout(() => setShowPricing(true), 400);
      return () => clearTimeout(t);
    }
  }, [user, planStatus]);

  // ── Trigger 3: Poll every 60s to detect trial expiry while app is open ────────
  useEffect(() => {
    if (!user || planStatus !== "free_trial" || !trialEndsAt) return;

    const check = () => {
      if (trialEndsAt < new Date()) {
        setShowPricing(true);
      }
    };

    check(); // immediate check
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user, planStatus, trialEndsAt]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Show onboarding (language picker) once before the auth form
  if (!onboardingDone) {
    return (
      <OnboardingPage
        onDone={() => {
          localStorage.setItem("iqxo_onboarding_done", "1");
          setOnboardingDone(true);
        }}
      />
    );
  }

  if (!user) return <AuthPage />;

  return (
    <>
      <HomePage />
      <StripePricingPage
        open={showPricing}
        onClose={() => {
          // Only allow closing if they have an active plan
          // If plan is none/expired, force them to pick one
          setShowPricing(false);

          // else: keep modal open — they must choose a plan
        }}
        forceOpen={planStatus === "none" || planStatus === "expired"}
        planStatus={planStatus}
        trialEndsAt={trialEndsAt}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen bg-background text-foreground">
        <AppProvider>
          <AppShell />
        </AppProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
