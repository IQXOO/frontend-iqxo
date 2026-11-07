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
    if (typeof window === "undefined") return;
    const isNative = Boolean(
      (window as unknown as { isNativeApp?: boolean; __IQXO_IS_NATIVE?: boolean }).isNativeApp ||
      (window as unknown as { __IQXO_IS_NATIVE?: boolean }).__IQXO_IS_NATIVE ||
      (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.includes("IQXONativeApp"))
    );
    if (isNative) return;

    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash; // "#access_token=xxx&..."
    const hasIqxoApp = params.get("iqxo_app") === "1" || hash.includes("iqxo_app=1");
    const code = params.get("code");
    const hasTokens = hash.includes("access_token") || Boolean(code);

    if (hasIqxoApp && hasTokens) {
      // Use the helper to determine the correct deep link and handle store fallbacks
      const payload = code ? `?code=${code}` : hash;
      launchAppWithFallback(payload, window.location.href);
    }
  }, []);
}

const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const WelcomeSplashPage = lazy(() => import("./pages/WelcomeSplashPage"));
const ConnectCalendarsPage = lazy(() => import("./pages/ConnectCalendarsPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TomorrowPage = lazy(() => import("./pages/TomorrowPage"));
const FuturePage = lazy(() => import("./pages/FuturePage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const PdfPreviewPage = lazy(() => import("./pages/PdfPreviewPage").then(m => ({ default: m.PdfPreviewPage })));
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



function RootRedirect() {
  const { user, authLoading, onboardingDone } = useApp();
  // If still loading auth, render RouteFallback (dark spinner) instead of null to prevent white screen
  if (authLoading) return <RouteFallback />;
  if (user) {
    if (!onboardingDone) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/home" replace />;
  }
  const isDismissed = typeof window !== "undefined" && localStorage.getItem("iqxo_intro_dismissed") === "1";
  if (!isDismissed) {
    return <Navigate to="/welcome" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  // Redirect back to native app synchronously if this page was opened after OAuth in an EXTERNAL browser.
  // CRITICAL: We must NOT redirect or return null if already running inside the native app WebView!
  if (typeof window !== "undefined") {
    const isNative = Boolean(
      (window as unknown as { isNativeApp?: boolean; __IQXO_IS_NATIVE?: boolean }).isNativeApp ||
      (window as unknown as { __IQXO_IS_NATIVE?: boolean }).__IQXO_IS_NATIVE ||
      (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.includes("IQXONativeApp"))
    );
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash; // "#access_token=xxx&..."
    const hasIqxoApp = params.get("iqxo_app") === "1" || hash.includes("iqxo_app=1");
    const code = params.get("code");
    const hasTokens = hash.includes("access_token") || Boolean(code);

    if (!isNative && hasIqxoApp && hasTokens) {
      const payload = code ? `?code=${code}` : hash;
      launchAppWithFallback(payload, window.location.href);
      return (
        <div className="min-h-screen bg-[#0C0C0E] text-[#E8E8E8] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="h-10 w-10 rounded-full border-2 border-white/10 border-t-[#5BC0DE] animate-spin mb-4" />
          <h2 className="text-lg font-medium text-white mb-2">Opening IQXO App...</h2>
          <p className="text-xs text-[#A0A0A8] max-w-xs mb-6">
            If the app does not open automatically, tap the button below.
          </p>
          <button
            onClick={() => launchAppWithFallback(payload, window.location.href)}
            className="px-6 py-2.5 bg-[#5BC0DE]/10 hover:bg-[#5BC0DE]/20 border border-[#5BC0DE]/30 text-[#5BC0DE] font-medium rounded-full text-sm transition-all cursor-pointer"
          >
            Open IQXO App
          </button>
        </div>
      );
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
                    <Route path="/connect-calendars" element={<ConnectCalendarsPage />} />
                  </Route>
                  {/* PDF Preview — outside AppLayout so it's full screen */}
                  <Route path="/pdf-preview" element={<PdfPreviewPage />} />
                </Route>

                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/welcome" element={<WelcomeSplashPage />} />
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
