import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { shouldAutoOpenBillingRoute, shouldShowBillingPopup } from "../lib/billing-utils";

export default function AppController() {
  const { user, authLoading, planStatus, planResolved, trialEndsAt, onboardingDone, setOnboardingDone } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const prevUserRef = useRef<string | null | undefined>(undefined);
  const [introDismissed, setIntroDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("iqxo_intro_dismissed") === "1";
  });

  const shouldAutoOpenPricing = shouldAutoOpenBillingRoute(planResolved, planStatus, trialEndsAt);

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
    if (!onboardingDone && !introDismissed) {
      navigate("/onboarding");
    }
  }, [onboardingDone, introDismissed, navigate]);

  // Prevent logged-in users from seeing /login
  useEffect(() => {
    if (user && location.pathname === "/login") {
      navigate("/home", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // If not authenticated and not on a public path, redirect to /login
  useEffect(() => {
    const publicPaths = new Set(["/pricing", "/reset-password", "/index.html", "/onboarding"]);
    if (!user && !publicPaths.has(location.pathname) && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Render nothing — this component only controls side-effects and redirects.
  if (authLoading) return null;
  return null;
}
