import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DashboardHeader } from "../components/dashboard/header";
import { BottomNav } from "../components/dashboard/bottom-nav";
import { useApp } from "../lib/store";
import { navigateToPath } from "../lib/navigation";
import { EventEditorProvider, useEventEditor } from "../lib/event-editor-context";
import { shouldAutoOpenBillingRoute, normalizeBillingPlanStatus } from "../lib/billing-utils";
import { launchAppWithFallback } from "../lib/auth-urls";

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
  const normalizedPlan = normalizeBillingPlanStatus(planStatus);
  const shouldShowPaywall = Boolean(user && planResolved && normalizedPlan !== "pro");
  const shouldBlockAI = Boolean(user && shouldAutoOpenBillingRoute(planResolved, planStatus, trialEndsAt));

  const isMobileDevice = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const showNativeAppBanner = typeof window !== "undefined" && !(window as unknown as { isNativeApp?: boolean }).isNativeApp && isMobileDevice && !!session && !bannerDismissed;

  const [paywallOpen, setPaywallOpen] = useState(false);

  // Sync paywall trigger only AFTER user plan data is fully verified from backend
  React.useEffect(() => {
    if (!user || !planResolved) return;

    if (normalizedPlan === "pro") {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("iqxo_just_signed_in");
      }
      setPaywallOpen(false);
      return;
    }

    // For non-Pro users, check if they just signed in
    if (typeof window !== "undefined") {
      const justSignedIn = sessionStorage.getItem("iqxo_just_signed_in") === "1";
      if (justSignedIn) {
        sessionStorage.removeItem("iqxo_just_signed_in");
        setPaywallOpen(true);
      }
    }
  }, [user, planResolved, normalizedPlan]);

  React.useEffect(() => {
    if (shouldBlockAI) {
      const path = location.pathname;
      if (path === "/schedule") {
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
    const handleNativeIap = (e: any) => {
      const detail = e?.detail;
      if (detail?.success) {
        if (detail.isRestore) {
          alert(language === "ar" ? "تم استعادة المشتريات بنجاح!" : "Purchases restored successfully!");
        }
        setPaywallOpen(false);
      } else if (detail?.error && detail.isRestore) {
        alert((language === "ar" ? "فشل استعادة المشتريات: " : "Restore failed: ") + detail.error);
      }
    };
    window.addEventListener("trigger-paywall", handleTrigger);
    window.addEventListener("nativeIapResult", handleNativeIap);
    return () => {
      window.removeEventListener("trigger-paywall", handleTrigger);
      window.removeEventListener("nativeIapResult", handleNativeIap);
    };
  }, [shouldShowPaywall, language]);

  const handleClosePaywall = () => {
    setPaywallOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("iqxo_just_signed_in");
    }
    const path = location.pathname;
    if (shouldBlockAI && path === "/schedule") {
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
      subTitleMonthly: "IQXO Premium Monthly",
      subTitleYearly: "IQXO Premium Yearly",
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
      ctaMonthly: "Upgrade to Pro",
      ctaYearly: "Commit to Pro",
      guarantee: "No questions asked. Full refund within 30 days.",
      autoRenew: "Recurring billing. Cancel anytime at least 24 hours before the end of the current period in App Store Account Settings.",
      privacyPolicy: "Privacy Policy",
      termsOfUse: "Terms of Use (EULA)",
      restore: "Restore Purchases",
      logout: "Sign Out",
      openInApp: "Open in IQXO App",
      launch: "Launch App",
    },
    fr: {
      upgradePro: "Améliorez vers Pro",
      subTitleMonthly: "IQXO Premium Mensuel",
      subTitleYearly: "IQXO Premium Annuel",
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
      ctaMonthly: "Passer au Pro",
      ctaYearly: "S'engager au Pro",
      guarantee: "Sans questions. Remboursement sous 30 jours.",
      autoRenew: "Facturation récurrente. Annulez à tout moment au moins 24h avant la fin de la période dans les paramètres App Store.",
      privacyPolicy: "Politique de confidentialité",
      termsOfUse: "Conditions d'utilisation (EULA)",
      restore: "Restaurer les achats",
      logout: "Se déconnecter",
      openInApp: "Ouvrir dans l'application IQXO",
      launch: "Lancer",
    },
    ar: {
      upgradePro: "الترقية إلى Pro",
      subTitleMonthly: "IQXO Premium الشهري",
      subTitleYearly: "IQXO Premium السنوي",
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
      ctaMonthly: "الترقية إلى Pro",
      ctaYearly: "الاشتراك السنوي في Pro",
      guarantee: "بدون أي أسئلة. استرداد كامل خلال 30 يوماً.",
      autoRenew: "يتم تجديد الاشتراك تلقائياً. يمكنك إلغاء الاشتراك في أي وقت من إعدادات حسابك في App Store قبل 24 ساعة على الأقل من نهاية الفترة الحالية.",
      privacyPolicy: "سياسة الخصوصية",
      termsOfUse: "شروط الاستخدام (EULA)",
      restore: "استعادة المشتريات",
      logout: "تسجيل الخروج",
      openInApp: "افتح في تطبيق IQXO",
      launch: "تشغيل التطبيق",
    }
  };

  const dt = drawerI18n[language === "ar" ? "ar" : language === "fr" ? "fr" : "en"];

  const handlePaywallSubscribe = (cycle: "monthly" | "yearly") => {
    const productId = cycle === "monthly" ? "com.iqxo.premium.monthly" : "com.iqxo.premium.yearly";
    const monthlyLink = import.meta.env?.VITE_STRIPE_MONTHLY_LINK;
    const yearlyLink = import.meta.env?.VITE_STRIPE_YEARLY_LINK || "";
    const base = cycle === "yearly" ? yearlyLink : monthlyLink;

    const url = base
      ? `${base}?client_reference_id=${encodeURIComponent(user?.id || "")}&prefilled_email=${encodeURIComponent(user?.email || "")}&iqxo_product_id=${encodeURIComponent(productId)}`
      : null;

    // @ts-expect-error - injected by native
    const isNative = typeof window !== "undefined" && (window.__IQXO_IS_NATIVE === true || !!window.ReactNativeWebView);
    // @ts-expect-error - injected by native
    const postMsg = typeof window !== "undefined" && (window.__IQXO_postMessage || (window.ReactNativeWebView?.postMessage?.bind(window.ReactNativeWebView)));
    // @ts-expect-error - injected by native
    const platform = typeof window !== "undefined" ? (window.nativePlatform || "") : "";
    const isIos = platform === "ios";

    if (isNative && isIos && postMsg) {
      postMsg(JSON.stringify({
        type: "purchase_iap",
        cycle,
        productId,
        userId: user?.id,
        stripeUrl: url,
      }));
      return;
    }

    if (!url) {
      alert("Stripe billing link is not configured yet.");
      return;
    }

    window.location.href = url;
  };

  const [isRestoring, setIsRestoring] = React.useState(false);

  const handleRestorePurchases = () => {
    if (isRestoring) return;
    setIsRestoring(true);

    // @ts-expect-error - injected by native
    const isNative = typeof window !== "undefined" && (window.__IQXO_IS_NATIVE === true || !!window.ReactNativeWebView);
    if (isNative) {
      // @ts-expect-error - injected by native
      const postMsg = window.__IQXO_postMessage || window.ReactNativeWebView?.postMessage?.bind(window.ReactNativeWebView);
      if (postMsg) {
        postMsg(JSON.stringify({ type: "restore_iap" }));
      }
    } else {
      alert(language === "ar" ? "يرجى استعادة المشتريات مباشرة من تطبيق الهاتف (App Store)." : "Please restore purchases directly from the iOS App.");
    }
    setTimeout(() => setIsRestoring(false), 4000);
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
                  launchAppWithFallback(`access_token=${session.access_token}&refresh_token=${session.refresh_token}`);
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

      <main className="pb-24">
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

            {/* Price Presentation & Subscription Name (Required by Apple Guideline 3.1.2) */}
            <div className="text-center mb-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#5BC0DE] mb-1">
                {paywallCycle === "monthly" ? dt.subTitleMonthly : dt.subTitleYearly}
              </div>
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

            {/* Restore Purchases Button (Required by Apple Guideline 3.1.1) */}
            <button
              onClick={handleRestorePurchases}
              disabled={isRestoring}
              className="w-full text-center text-xs text-[#A0A0A8] hover:text-[#5BC0DE] transition-all mt-4 block bg-none border-none cursor-pointer underline underline-offset-4"
            >
              {isRestoring
                ? language === "ar"
                  ? "جاري استعادة المشتريات..."
                  : "Restoring purchases..."
                : dt.restore}
            </button>

            {/* Apple Guideline 3.1.2 Legal Disclosure & Mandatory Links */}
            <div className="mt-4 pt-3 border-t border-white/5 text-center">
              <p className="text-[10px] text-[#6E6E78] leading-relaxed px-2 mb-2.5">
                {dt.autoRenew}
              </p>
              <div className="flex justify-center items-center gap-4 text-xs text-[#A0A0A8]">
                <a
                  href="https://www.iqxo.ai/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#5BC0DE] transition-colors"
                >
                  {dt.termsOfUse}
                </a>
                <span className="text-white/20">•</span>
                <a
                  href="https://www.iqxo.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#5BC0DE] transition-colors"
                >
                  {dt.privacyPolicy}
                </a>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={async () => {
                await signOut();
              }}
              className="w-full text-center text-xs text-[#6E6E78] hover:text-white transition-all mt-3 block bg-none border-none cursor-pointer"
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

