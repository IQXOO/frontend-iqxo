import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DashboardHeader } from "../components/dashboard/header";
import { BottomNav } from "../components/dashboard/bottom-nav";
import { useApp } from "../lib/store";
import { navigateToPath } from "../lib/navigation";
import { EventEditorProvider, useEventEditor } from "../lib/event-editor-context";
import { shouldAutoOpenBillingRoute } from "../lib/billing-utils";

const CommandPalette = React.lazy(() =>
  import("../components/dashboard/command-palette").then((module) => ({
    default: module.CommandPalette,
  }))
);

function AppLayoutContent() {
  const { events, signOut, toggleTheme, user, session, planStatus, planResolved, trialEndsAt, language } = useApp();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [paywallCycle, setPaywallCycle] = useState<"monthly" | "yearly">("monthly");
  const { openEventDetail, openAddEvent } = useEventEditor();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const isRTL = language === "ar";
  const shouldShowPaywall = user && planStatus !== "pro";
  const shouldBlockAI = user && shouldAutoOpenBillingRoute(planResolved, planStatus, trialEndsAt);

  const isMobileDevice = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const showNativeAppBanner = typeof window !== "undefined" && !(window as any).isNativeApp && isMobileDevice && !!session && !bannerDismissed;

  const [paywallOpen, setPaywallOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const justSignedIn = sessionStorage.getItem("iqxo_just_signed_in") === "1";
      const sessionActive = sessionStorage.getItem("iqxo_session_active") === "1";
      if (justSignedIn || !sessionActive) {
        sessionStorage.setItem("iqxo_session_active", "1");
        return true;
      }
    }
    return false;
  });

  React.useEffect(() => {
    if (shouldBlockAI) {
      const path = location.pathname;
      if (path === "/schedule" || path === "/tomorrow" || path === "/future") {
        setPaywallOpen(true);
      }
    }
  }, [location.pathname, shouldBlockAI]);

  React.useEffect(() => {
    const handleTrigger = () => {
      if (shouldShowPaywall) {
        setPaywallOpen(true);
      }
    };
    window.addEventListener("trigger-paywall", handleTrigger);
    return () => window.removeEventListener("trigger-paywall", handleTrigger);
  }, [shouldShowPaywall]);

  const handleClosePaywall = () => {
    setPaywallOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("iqxo_just_signed_in");
    }
    const path = location.pathname;
    if (shouldBlockAI && (path === "/schedule" || path === "/tomorrow" || path === "/future")) {
      navigateToPath("/home");
    }
  };

  // Map pathname to BottomNav active tab
  const path = location.pathname;
  const active = path.startsWith("/archive")
    ? "history"
    : path.startsWith("/profile")
    ? "settings"
    : "home";

  const openCommandPalette = () => setCommandOpen(true);

  const drawerI18n = {
    en: {
      upgradePro: "Upgrade to Pro",
      monthly: "Monthly",
      yearly: "Yearly",
      monthlyPrice: "€9.99",
      monthlyPeriod: "per month",
      yearlyPrice: "€79",
      yearlyPeriod: "per year",
      yearlySavings: "-34%",
      savingsText: "Save €40.88 vs monthly",
      feature1: "Unlimited captures",
      feature2: "All features unlocked",
      feature3: "Cancel anytime",
      feature4: "30-day money-back guarantee",
      ctaMonthly: "Upgrade to Calm",
      ctaYearly: "Commit to Calm",
      guarantee: "No questions asked. Full refund within 30 days.",
      logout: "Sign Out",
      openInApp: "Open in IQXO App",
      launch: "Launch App",
    },
    fr: {
      upgradePro: "Améliorez vers Pro",
      monthly: "Mensuel",
      yearly: "Annuel",
      monthlyPrice: "9.99 €",
      monthlyPeriod: "par mois",
      yearlyPrice: "79 €",
      yearlyPeriod: "par an",
      yearlySavings: "-34%",
      savingsText: "Économisez 40,88 € vs mensuel",
      feature1: "Captures illimitées",
      feature2: "Fonctionnalités débloquées",
      feature3: "Annuler à tout moment",
      feature4: "Garantie de remboursement 30j",
      ctaMonthly: "Passer au Calme",
      ctaYearly: "S'engager dans le Calme",
      guarantee: "Sans questions. Remboursement sous 30 jours.",
      logout: "Se déconnecter",
      openInApp: "Ouvrir dans l'application IQXO",
      launch: "Lancer",
    },
    ar: {
      upgradePro: "الترقية إلى Pro",
      monthly: "شهرياً",
      yearly: "سنوياً",
      monthlyPrice: "€9.99",
      monthlyPeriod: "شهرياً",
      yearlyPrice: "€79",
      yearlyPeriod: "سنوياً",
      yearlySavings: "وفر 34%",
      savingsText: "وفر 40.88€ مقارنة بالاشتراك الشهري",
      feature1: "التقاط عدد غير محدود من الأحداث",
      feature2: "فتح جميع الميزات بلا قيود",
      feature3: "إلغاء الاشتراك في أي وقت",
      feature4: "ضمان استرداد الأموال خلال 30 يوماً",
      ctaMonthly: "الترقية للاسترخاء",
      ctaYearly: "الالتزام بالهدوء والاسترخاء",
      guarantee: "بدون أي أسئلة. استرداد كامل خلال 30 يوماً.",
      logout: "تسجيل الخروج",
      openInApp: "افتح في تطبيق IQXO",
      launch: "تشغيل التطبيق",
    }
  };

  const dt = drawerI18n[language === "ar" ? "ar" : language === "fr" ? "fr" : "en"];

  const handlePaywallSubscribe = (cycle: "monthly" | "yearly") => {
    const monthlyLink = import.meta.env?.VITE_STRIPE_MONTHLY_LINK;
    const yearlyLink = import.meta.env?.VITE_STRIPE_YEARLY_LINK || "";
    const base = cycle === "yearly" ? yearlyLink : monthlyLink;

    if (!base) {
      alert("Stripe billing link is not configured yet.");
      return;
    }

    const url = `${base}?client_reference_id=${encodeURIComponent(user?.id || "")}&prefilled_email=${encodeURIComponent(user?.email || "")}`;
    window.location.href = url;
  };

  return (
    <div className={`min-h-screen max-w-md mx-auto bg-background text-foreground relative ${isRTL ? "dir-rtl" : ""}`}>
      {/* Mobile App Fallback Banner */}
      {showNativeAppBanner && (
        <div className="bg-[#161618] border-b border-[#5BC0DE]/20 p-3 flex items-center justify-between text-xs text-[#A0A0A8] animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <span className="text-[#5BC0DE] text-sm">📱</span>
            <span>{dt.openInApp}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (session) {
                  window.location.href = `com.iqxo.app://auth#access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
                }
              }}
              className="px-3 py-1 bg-[#5BC0DE]/10 hover:bg-[#5BC0DE]/20 border border-[#5BC0DE]/20 text-[#5BC0DE] rounded-full font-medium transition-all cursor-pointer"
            >
              {dt.launch}
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-[#6E6E78] hover:text-[#E8E8E8] transition-all cursor-pointer bg-transparent border-none text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {location.pathname !== "/profile" && (
        <DashboardHeader
          onProfileClick={() => navigateToPath("/profile")}
          onSettingsClick={() => navigateToPath("/profile")}
          onSearchClick={openCommandPalette}
          activeTab={active as string}
        />
      )}

      <main className="pb-28">
        <Outlet />
      </main>

      <BottomNav active={active as string} />

      {/* Premium Paywall Bottom Sheet Overlay */}
      {shouldShowPaywall && paywallOpen && (
        <div className="fixed inset-0 z-[190] bg-[#0C0C0E]/85 backdrop-blur-md flex flex-col justify-end p-4 md:p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md mx-auto bg-[#161618] border border-white/10 rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-500 relative overflow-hidden">
            {/* Glowing Accent Line */}
            <div className="absolute top-0 left-10 right-10 height-[2px] bg-gradient-to-r from-transparent via-[#5BC0DE] to-transparent opacity-40" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#E8E8E8] tracking-tight">{dt.upgradePro}</h2>
              <button
                onClick={handleClosePaywall}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6E6E78] hover:text-[#E8E8E8] transition-all cursor-pointer border-none"
              >
                ✕
              </button>
            </div>

            {/* Toggle Switch */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 bg-[#1A1A1C] border border-white/5 rounded-full">
                <button
                  onClick={() => setPaywallCycle("monthly")}
                  className={`px-6 py-2 rounded-full text-xs font-medium transition-all ${
                    paywallCycle === "monthly"
                      ? "bg-[#161618] text-[#5BC0DE] border border-white/5 shadow-md"
                      : "text-[#6E6E78] hover:text-[#A0A0A8]"
                  }`}
                >
                  {dt.monthly}
                </button>
                <button
                  onClick={() => setPaywallCycle("yearly")}
                  className={`px-6 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    paywallCycle === "yearly"
                      ? "bg-[#161618] text-[#5BC0DE] border border-white/5 shadow-md"
                      : "text-[#6E6E78] hover:text-[#A0A0A8]"
                  }`}
                >
                  {dt.yearly}
                  <span className="text-[10px] bg-rgba(91,192,222,0.08) px-1.5 py-0.5 rounded-full text-[#D4A853]">
                    {dt.yearlySavings}
                  </span>
                </button>
              </div>
            </div>

            {/* Price Presentation */}
            <div className="text-center mb-6">
              <div className="text-3xl font-light text-[#E8E8E8]">
                {paywallCycle === "monthly" ? dt.monthlyPrice : dt.yearlyPrice}
                <span className="text-sm text-[#6E6E78] font-normal ml-1">
                  / {paywallCycle === "monthly" ? dt.monthlyPeriod : dt.yearlyPeriod}
                </span>
              </div>
              {paywallCycle === "yearly" && (
                <div className="text-xs text-[#D4A853] italic mt-1.5">
                  {dt.savingsText}
                </div>
              )}
            </div>

            {/* Feature List */}
            <div className="space-y-1 mb-6 border-t border-white/5 pt-4">
              <div className="flex items-center gap-3 py-2 text-xs text-[#A0A0A8]">
                <span className="text-[#5BC0DE] text-sm">✓</span>
                {dt.feature1}
              </div>
              <div className="flex items-center gap-3 py-2 text-xs text-[#A0A0A8]">
                <span className="text-[#5BC0DE] text-sm">✓</span>
                {dt.feature2}
              </div>
              <div className="flex items-center gap-3 py-2 text-xs text-[#A0A0A8]">
                <span className="text-[#5BC0DE] text-sm">✓</span>
                {dt.feature3}
              </div>
              <div className="flex items-center gap-3 py-2 text-xs text-[#A0A0A8]">
                <span className="text-[#5BC0DE] text-sm">✓</span>
                {dt.feature4}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => handlePaywallSubscribe(paywallCycle)}
              className="w-full py-4 bg-rgba(91,192,222,0.08) hover:bg-rgba(91,192,222,0.12) border border-cyan/20 text-[#5BC0DE] hover:text-[#7DD3F0] rounded-full font-medium transition-all text-sm tracking-wide shadow-lg cursor-pointer"
            >
              {paywallCycle === "monthly" ? dt.ctaMonthly : dt.ctaYearly}
            </button>

            <div className="text-center mt-3 text-[10px] text-[#6E6E78]">
              {dt.guarantee}
            </div>

            {/* Logout button */}
            <button
              onClick={async () => {
                await signOut();
              }}
              className="w-full text-center text-xs text-[#6E6E78] hover:text-white transition-all mt-4 block bg-none border-none cursor-pointer"
            >
              {dt.logout}
            </button>
          </div>
        </div>
      )}

      {commandOpen && (
        <React.Suspense fallback={null}>
          <CommandPalette
            isOpen={commandOpen}
            onOpenChange={setCommandOpen}
            onAddEvent={() => {
              setCommandOpen(false);
              navigateToPath("/home");
              window.setTimeout(() => openAddEvent(), 0);
            }}
            onToggleDarkMode={() => {
              toggleTheme();
            }}
            onExportPDF={async () => {
              const { exportEventsToPDF } = await import("../lib/export-pdf");
              exportEventsToPDF(events, user?.email || "user@example.com");
            }}
            onLogout={async () => {
              await signOut();
            }}
            onEventSelect={(event) => {
              setCommandOpen(false);
              navigateToPath("/home");
              window.setTimeout(() => openEventDetail(event), 0);
            }}
          />
        </React.Suspense>
      )}
    </div>
  );
}

export default function AppLayout() {
  return (
    <EventEditorProvider>
      <AppLayoutContent />
    </EventEditorProvider>
  );
}

