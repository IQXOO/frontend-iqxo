"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  X,
  Shield,
  Mic,
  ImageIcon,
  Brain,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useApp } from "../../lib/store";
import { supabase } from "../../lib/supabase";
import {
  devError,
  devLog,
  getFriendlyErrorMessage,
} from "../../lib/logger";
import { useToast } from "../../hooks/use-toast";
import { BrandLogo } from "../brand-logo"

type BillingCycle = "monthly" | "yearly";

interface StripePricingPageProps {
  open?: boolean;
  onClose?: () => void;
  forceOpen?: boolean;
  planStatus?: string;
  trialEndsAt?: Date | null;
}

const _PRICING = {
  monthlyEUR: 9.99,
  yearlyEUR: 79,
  yearlyPerMonth: (79 / 12).toFixed(2),
  savingsPct: Math.round(100 - (79 / (9.99 * 12)) * 100),
};

const PAYMENT_LINKS: Record<BillingCycle, string> = {
  monthly: import.meta.env?.VITE_STRIPE_MONTHLY_LINK,
  yearly: import.meta.env?.VITE_STRIPE_YEARLY_LINK || "",
};

function useTranslate(language: string) {
  return (en: string, fr: string, ar: string) =>
    language === "ar" ? ar : language === "fr" ? fr : en;
}

function _CardBrandLikeBullet() {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-white/60">✓</span>;
}

export function StripePricingPage({
  open = true,
  onClose,
  forceOpen = false,
  planStatus,
  trialEndsAt,
}: StripePricingPageProps) {
  const { language, setPlanStatus, user, totalUsage: _totalUsage } = useApp();
  const { toast } = useToast();
  const isRTL = language === "ar";
  const t = useTranslate(language);

  const trialActive = planStatus === "free_trial" && trialEndsAt && trialEndsAt > new Date();

  // ── Native detection: use useState so it's set AFTER mount (injected JS is ready) ──
  const [isIosNative, setIsIosNative] = useState(false);
  const [isInNativeApp, setIsInNativeApp] = useState(false); // any native platform

  useEffect(() => {
    // @ts-ignore
    const hasNativeBridge = typeof window !== 'undefined' && !!window.ReactNativeWebView;
    setIsInNativeApp(hasNativeBridge);

    const iosDetected =
      // @ts-ignore
      (window.isNativeApp && window.nativePlatform === "ios") ||
      (navigator.userAgent.includes("IQXONativeApp") && /iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsIosNative(hasNativeBridge && iosDetected);
  }, []);

  const [localizedMonthly, setLocalizedMonthly] = useState<string>("€9.99");
  const [localizedYearly, setLocalizedYearly] = useState<string>("€79");
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (!isInNativeApp) return;
    // Request localized prices from native (works on iOS; ignored on Android)
    // @ts-ignore
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "get_products" }));

    const handleProductsResult = (e: Event) => {
      const customEvent = e as CustomEvent;
      const products = customEvent.detail;
      if (products && products.length > 0) {
        const monthly = products.find((p: any) => p.identifier === "com.iqxo.premium.monthly");
        const yearly = products.find((p: any) => p.identifier === "com.iqxo.premium.yearly");
        if (monthly?.priceString) setLocalizedMonthly(monthly.priceString);
        if (yearly?.priceString) setLocalizedYearly(yearly.priceString);
      }
    };

    window.addEventListener("nativeProductsResult", handleProductsResult);
    return () => window.removeEventListener("nativeProductsResult", handleProductsResult);
  }, [isInNativeApp]);

  useEffect(() => {
    const handleNativeIapResult = (e: Event) => {
      setIsPurchasing(false);
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      if (detail.success) {
        if (detail.isRestore) {
          toast({
            title: t("Purchases Restored", "Achats restaurés", "تمت استعادة المشتريات"),
            description: t("Your purchases have been synchronized.", "Vos achats ont été synchronisés.", "تمت مزامنة مشترياتك."),
          });
        } else {
          toast({
            title: t("Purchase successful! 🎉", "Achat réussi ! 🎉", "تمت عملية الشراء بنجاح! 🎉"),
            description: t("Welcome to Calm.", "Bienvenue dans Calm.", "أهلاً بك في Calm."),
          });
          onClose?.();
        }
        // State is updated by the global nativeCustomerInfoUpdate listener in store.tsx
      } else {
        toast({
          title: detail.isRestore ? t("Restore Failed", "Restauration échouée", "فشل الاستعادة") : t("Purchase Failed", "Achat échoué", "فشل الشراء"),
          description: detail.error || t("Something went wrong.", "Une erreur est survenue.", "حدث خطأ."),
          variant: "destructive",
        });
      }
    };

    window.addEventListener("nativeIapResult", handleNativeIapResult);
    return () => window.removeEventListener("nativeIapResult", handleNativeIapResult);
  }, [onClose, toast, t]);

  const _features = useMemo(
    () => [
      { icon: Mic, en: "Voice → Event", fr: "Voix → Événement", ar: "صوت ← حدث" },
      { icon: ImageIcon, en: "Image / PDF extraction", fr: "Extraction Image / PDF", ar: "استخراج صورة / PDF" },
      { icon: Brain, en: "Smart analysis", fr: "Analyse intelligente", ar: "تحليل ذكي" },
      { icon: Lightbulb, en: "AI Suggestions", fr: "Suggestions IA", ar: "اقتراحات AI" },
      { icon: Sparkles, en: "Any future AI feature", fr: "Toute future fonction IA", ar: "أي ميزة AI مستقبلية" },
    ],
    [],
  );

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (forceOpen) {
          e.preventDefault();
          e.stopPropagation();
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, forceOpen, onClose]);

  const handleSubscribe = (cycle: BillingCycle) => {
    if (isPurchasing) return;

    const base = PAYMENT_LINKS[cycle];
    const stripeUrl = base
      ? (user?.id
          ? `${base}?client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user?.email || "")}`
          : base)
      : null;

    // ── If running inside the native app, ALWAYS delegate to native ──────────────
    // The native app decides: iOS → Apple IAP, Android → open Stripe in WebView
    // This is 100% reliable because ReactNativeWebView is injected by the SDK itself
    // @ts-ignore
    if (isInNativeApp && window.ReactNativeWebView) {
      setIsPurchasing(true);
      // @ts-ignore
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "initiate_purchase",
        cycle,
        productId: cycle === "monthly" ? "com.iqxo.premium.monthly" : "com.iqxo.premium.yearly",
        userId: user?.id,
        stripeUrl, // native uses this for Android
      }));
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // Pure web/browser: use Stripe directly
    if (!stripeUrl) {
      devWarn("Billing", "Missing payment link for billing cycle", { cycle });
      toast({
        title: "Payment link unavailable",
        description:
          cycle === "yearly"
            ? "Yearly billing isn't configured yet. Please try monthly or contact support."
            : "Monthly billing isn't configured yet. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    window.location.href = stripeUrl;
  };

  const handleRestore = () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    // @ts-ignore
    if (window.ReactNativeWebView) {
      // @ts-ignore
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "restore_iap",
        userId: user?.id,
      }));
    }
  };

  const handleTrial = async () => {
    if (!user) return;

    // Trial is currently active — inform the user instead of silently closing
    if (trialActive) {
      toast({
        title: t("Your free trial is active", "Votre essai gratuit est actif", "تجربتك المجانية نشطة"),
        description: t(
          "You already have an active 7-day free trial. Enjoy all features!",
          "Vous avez déjà un essai gratuit de 7 jours actif. Profitez de toutes les fonctionnalités !",
          "لديك تجربة مجانية لمدة 7 أيام نشطة بالفعل. استمتع بجميع الميزات!",
        ),
      });
      onClose?.();
      return;
    }

    try {
      // Check if trial was already used (expired)
      const { data: existing } = await supabase
        .from("user_plans")
        .select("trial_started_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.trial_started_at) {
        toast({
          title: t("Trial already used", "Essai déjà utilisé", "التجربة مستخدمة مسبقًا"),
          description: t(
            "You've already used your free trial on this account. Subscribe to keep going.",
            "Vous avez déjà utilisé votre essai gratuit. Abonnez-vous pour continuer.",
            "استخدمت تجربتك المجانية من قبل على هذا الحساب. اشترك للمتابعة.",
          ),
          variant: "destructive",
        });
        return;
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { error } = await supabase.from("user_plans").upsert(
        {
          user_id: user.id,
          plan_status: "free_trial",
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;

      devLog("Billing", "Free trial activated via Supabase");
      setPlanStatus("free_trial", trialEnd);

      // ✅ Success — let the user know their trial just started
      toast({
        title: t("Free trial activated! 🎉", "Essai gratuit activé ! 🎉", "تم تفعيل التجربة المجانية! 🎉"),
        description: t(
          "Your 7-day free trial has started. Enjoy all features!",
          "Votre essai gratuit de 7 jours a commencé. Profitez de toutes les fonctionnalités !",
          "بدأت تجربتك المجانية لمدة 7 أيام. استمتع بجميع الميزات!",
        ),
      });
      onClose?.();
    } catch (err) {
      devError("Billing", "Free trial activation failed", err);
      const errMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: t("Couldn't start free trial", "Impossible de démarrer l'essai", "تعذّر بدء التجربة المجانية"),
        description: getFriendlyErrorMessage(
          errMessage,
          t("Something went wrong. Please try again.", "Une erreur est survenue.", "حدث خطأ. حاول مرة أخرى."),
        ),
        variant: "destructive",
      });
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/72 px-4 py-5 backdrop-blur-2xl"
        onClick={forceOpen ? undefined : onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ type: "spring", damping: 30, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-[min(92vw,1100px)] max-h-[90vh] overflow-y-auto rounded-[32px] border border-white/[0.06] bg-[#0C0C0E] text-[#E8E8E8] shadow-[0_30px_120px_rgba(0,0,0,0.65)] ${isRTL ? "text-right" : ""}`}
          dir={isRTL ? "rtl" : "ltr"}
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
            <div className="ambient absolute -left-[12%] -top-[10%] h-[420px] w-[420px] rounded-full bg-[rgba(91,192,222,0.08)] blur-[120px] opacity-70" />
            <div className="ambient absolute -bottom-[12%] -right-[10%] h-[360px] w-[360px] rounded-full bg-[rgba(212,168,83,0.08)] blur-[120px] opacity-70" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%)]" />
          </div>

          <div className="relative px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.04] pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.05] bg-white/[0.03]">
                  <Crown className="h-5 w-5 text-[var(--amber)]" strokeWidth={1.6} />
                </div>
                <div>
                  <BrandLogo as="span" className="text-[0.65rem] uppercase tracking-[0.3em] text-[#6E6E78]" />
                  <div className="mt-1 text-[0.9rem] text-[#A0A0A8]">
                    {t("Choose your plan", "Choisissez votre plan", "اختر خطتك")}
                  </div>
                </div>
              </div>

              {!forceOpen && (
                <button
                  onClick={() => onClose?.()}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.03] text-[#A0A0A8] transition-colors hover:border-white/[0.08] hover:bg-white/[0.05] hover:text-[#E8E8E8]"
                  aria-label="Close pricing modal"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="px-0 py-10 sm:px-1 sm:py-12">
              <div className="mx-auto max-w-[640px] text-center">
                <BrandLogo as="span" className="text-[0.7rem] uppercase tracking-[0.25em] text-[#6E6E78] opacity-60" />

                <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-[rgba(91,192,222,0.12)] bg-[rgba(91,192,222,0.08)] px-5 py-2 text-[0.8rem] font-normal text-[var(--cyan)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)]" />
                  {t("7 Days of Calm — Free", "7 jours de calme — Gratuit", "7 أيام من الهدوء — مجاناً")}
                </div>

                <h2 className="mt-8 text-[clamp(1.5rem,4vw,2.15rem)] font-normal leading-[1.25] tracking-[-0.03em] text-[#E8E8E8]">
                  {t(
                    "Start free. Upgrade when you're ready.",
                    "Commencez gratuitement. Passez à la version supérieure quand vous êtes prêt.",
                    "ابدأ مجانًا. وارتقِ عندما تكون مستعدًا.",
                  )}
                </h2>

                <p className="mx-auto mt-4 max-w-[360px] text-[0.95rem] leading-[1.7] text-[#A0A0A8] opacity-85">
                  {t(
                    "Start free. Upgrade when you need more. No hidden fees, ever.",
                    "Commencez gratuitement. Passez à la version supérieure quand vous en avez besoin. Aucun frais caché.",
                    "ابدأ مجانًا. وارتقِ عندما تحتاج المزيد. لا رسوم خفية أبدًا.",
                  )}
                </p>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 lg:gap-4">
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 }}
                  className="relative overflow-hidden rounded-[32px] border border-[rgba(91,192,222,0.1)] bg-[linear-gradient(180deg,rgba(91,192,222,0.08),rgba(91,192,222,0.02))] px-8 py-11 text-center"
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,var(--cyan),transparent)] opacity-30" />
                  <div className="text-[0.65rem] uppercase tracking-[0.3em] text-[var(--cyan)] opacity-80">
                    {t("7 Days of Calm", "7 jours de calme", "7 أيام من الهدوء")}
                  </div>
                  <h3 className="mt-5 text-[1.5rem] font-normal tracking-[-0.02em] text-[#E8E8E8]">
                    {t("Free Trial", "Essai gratuit", "تجربة مجانية")}
                  </h3>
                  <p className="mt-2 text-[0.9rem] font-light text-[#A0A0A8]">
                    {t("Feel the difference. No commitment.", "Ressentez la différence. Sans engagement.", "اشعر بالفرق. بدون التزام.")}
                  </p>

                  <div className="mt-8 grid grid-cols-2 gap-3 text-left">
                    {[
                      ["30", t("Total captures", "Captures totales", "إجمالي الالتقاطات")],
                      ["7", t("Days", "Jours", "أيام")],
                      ["All", t("Features", "Fonctionnalités", "الميزات")],
                      ["0", t("Card needed", "Carte requise", "لا حاجة لبطاقة")],
                    ].map(([num, label]) => (
                      <div
                        key={`${num}-${label}`}
                        className="rounded-[16px] border border-[rgba(91,192,222,0.06)] bg-[rgba(91,192,222,0.04)] p-4"
                      >
                        <div className="mb-1 text-[1.4rem] font-light leading-none text-[var(--cyan)]">{num}</div>
                        <div className="text-[0.75rem] text-[#6E6E78]">{label}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleTrial}
                    className="mt-8 block w-full rounded-full border border-[rgba(91,192,222,0.15)] bg-[var(--cyan-soft)] px-4 py-4 text-[0.9rem] font-medium text-[var(--cyan)] transition-all hover:border-[rgba(91,192,222,0.25)] hover:bg-[rgba(91,192,222,0.1)] hover:text-[#7DD3F0]"
                  >
                    {t("Start Free Trial", "Commencer l'essai gratuit", "ابدأ التجربة المجانية")}
                  </button>

                  <p className="mt-4 text-[0.75rem] text-[#6E6E78]">
                    {t(
                      "Voice, photos, notes, documents — try everything.",
                      "Voix, photos, notes, documents — essayez tout.",
                      "الصوت والصور والملاحظات والمستندات — جرّب كل شيء.",
                    )}
                  </p>

                  <AnimatePresence>
                    {trialActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mt-5 rounded-[16px] border border-[rgba(212,168,83,0.08)] bg-[rgba(212,168,83,0.06)] px-4 py-3 text-[0.75rem] text-[#A0A0A8]"
                      >
                        {t(
                          "Your free trial is already active.",
                          "Votre essai gratuit est déjà actif.",
                          "التجربة المجانية مفعّلة بالفعل.",
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 }}
                  className="relative overflow-hidden rounded-[32px] border border-[rgba(255,255,255,0.06)] bg-[var(--bg-luxury)] px-8 py-11 text-center"
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,var(--amber),var(--cyan),transparent)] opacity-30" />
                  <div className="text-[0.65rem] uppercase tracking-[0.3em] text-[var(--amber)] opacity-70">
                    {t("Upgrade Your Day", "Améliorez votre journée", "طوّر يومك")}
                  </div>

                  <div className="mt-8 flex items-end justify-center gap-0.5 tracking-[-0.03em] text-[#E8E8E8]">
                    <span className="text-[3rem] font-light leading-none">{isIosNative ? localizedMonthly : "€9.99"}</span>
                  </div>
                  <div className="mt-2 text-[0.85rem] text-[#6E6E78]">
                    {t("per month", "par mois", "شهريًا")}
                  </div>

                  <div className="mt-8 space-y-0 text-left">
                    {[
                      t("Unlimited captures", "Captures illimitées", "التقاطات غير محدودة"),
                      t("All features unlocked", "Toutes les fonctionnalités débloquées", "جميع الميزات مفتوحة"),
                      t("Cancel anytime", "Annulez à tout moment", "ألغِ في أي وقت"),
                      t("30-day money-back guarantee", "Garantie de remboursement 30 jours", "ضمان استرداد خلال 30 يومًا"),
                    ].map((feature) => (
                      <div key={feature} className="flex items-center gap-3 border-b border-[var(--border)] py-3 text-left text-[0.9rem] text-[#A0A0A8] last:border-b-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--cyan-soft)] text-[0.7rem] text-[var(--cyan)]">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe("monthly")}
                    disabled={isPurchasing}
                    className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#E8E8E8] to-[#FFFFFF] py-4 text-[1.1rem] font-medium tracking-tight text-[#0C0C0E] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isPurchasing ? t("Processing...", "Traitement...", "جاري المعالجة...") : t("Get Monthly", "Obtenir Mensuel", "اشترك شهريًا")}
                  </button>

                  <div className="mt-5 text-[0.75rem] text-[#6E6E78]">
                    {t(
                      "No questions asked. Full refund within 30 days.",
                      "Sans questions. Remboursement complet sous 30 jours.",
                      "بدون أسئلة. استرداد كامل خلال 30 يومًا.",
                    )}
                  </div>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="relative overflow-hidden rounded-[32px] border border-[rgba(212,168,83,0.1)] bg-[linear-gradient(180deg,rgba(212,168,83,0.08),rgba(212,168,83,0.02))] px-8 py-11 text-center"
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,var(--amber),transparent)] opacity-40" />
                  <div className="text-[0.65rem] uppercase tracking-[0.3em] text-[var(--amber)] opacity-80">
                    {t("A Calmer Year", "Une année plus calme", "عام أكثر هدوءًا")}
                  </div>
                  <h3 className="mt-5 text-[1.5rem] font-normal tracking-[-0.02em] text-[#E8E8E8]">
                    {t("Unlimited Peace of Mind", "Sérénité illimitée", "راحة بال غير محدودة")}
                  </h3>
                  <p className="mt-2 text-[0.9rem] font-light text-[#A0A0A8]">
                    {t("One commitment. A full year of calm.", "Un engagement. Une année de calme.", "التزام واحد. عام كامل من الهدوء.")}
                  </p>

                  <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-[rgba(212,168,83,0.12)] bg-[var(--amber-soft)] px-4 py-2">
                    <span className="text-[0.75rem] font-medium text-[var(--amber)]">🔥 Most Popular</span>
                  </div>

                  <div className="mt-6 flex items-end justify-center gap-0.5 tracking-[-0.03em] text-[#E8E8E8]">
                    <span className="text-[3rem] font-light leading-none">{isIosNative ? localizedYearly : "€79"}</span>
                  </div>
                  <div className="mt-2 text-[0.85rem] text-[#6E6E78]">
                    {t("per year", "par an", "سنويًا")}
                  </div>
                  <div className="mt-2 text-[0.8rem] italic font-light text-[var(--amber)]/70">
                    {t("Billed yearly — a calmer commitment", "Facturé chaque année — un engagement plus calme", "يُفوتر سنويًا — التزام أكثر هدوءًا")}
                  </div>

                  <div className="mt-8 space-y-0 text-left">
                    {[
                      t("Everything in Monthly", "Tout ce qui est inclus dans Monthly", "كل ما في الخطة الشهرية"),
                      t("12 months of uninterrupted calm", "12 mois de calme ininterrompu", "12 شهرًا من الهدوء المتواصل"),
                      t("Save €40.88 vs monthly (€119.88/year)", "Économisez 40,88 € vs mensuel (119,88 €/an)", "وفّر 40.88€ مقارنة بالشهرية (119.88€ سنويًا)"),
                      t("30-day money-back guarantee", "Garantie de remboursement 30 jours", "ضمان استرداد خلال 30 يومًا"),
                    ].map((feature, index) => (
                      <div key={feature} className="flex items-center gap-3 border-b border-[var(--border)] py-3 text-left text-[0.9rem] text-[#A0A0A8] last:border-b-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--amber-soft)] text-[0.7rem] text-[var(--amber)]">
                          ✓
                        </span>
                        <span className={index === 2 ? "text-[var(--amber)]" : ""}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe("yearly")}
                    disabled={isPurchasing}
                    className="mt-8 block w-full rounded-full border border-[rgba(212,168,83,0.15)] bg-[var(--amber-soft)] px-4 py-4 text-[0.9rem] font-medium text-[var(--amber)] transition-all hover:border-[rgba(212,168,83,0.25)] hover:bg-[rgba(212,168,83,0.1)] hover:text-[#E8C070] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isPurchasing ? t("Processing...", "Traitement...", "جاري المعالجة...") : t("Commit to Calm", "S'engager vers le calme", "الالتزام بالهدوء")}
                  </button>

                  <div className="mt-5 text-[0.75rem] text-[#6E6E78]">
                    {t(
                      "No questions asked. Full refund within 30 days.",
                      "Sans questions. Remboursement complet sous 30 jours.",
                      "بدون أسئلة. استرداد كامل خلال 30 يومًا.",
                    )}
                  </div>
                </motion.section>

                <div className="md:col-span-3 mx-auto mt-6 max-w-[600px] rounded-[16px] border border-[var(--border)] bg-[var(--bg-card)] px-5 py-5 text-center">
                  <p className="text-[0.85rem] leading-6 text-[#A0A0A8]">
                    {t(
                      "After your 7-day trial, continue Free with 10 captures/month.",
                      "Après votre essai de 7 jours, continuez gratuitement avec 10 captures/mois.",
                      "بعد تجربتك لمدة 7 أيام، يمكنك المتابعة مجانًا مع 10 عمليات التقاط شهريًا.",
                    )}{" "}
                    <strong className="font-medium text-[#E8E8E8]">
                      {t("No credit card required.", "Aucune carte requise.", "لا حاجة لبطاقة ائتمان.")}
                    </strong>{" "}
                    {t("Upgrade anytime.", "Mettez à niveau à tout moment.", "يمكنك الترقية في أي وقت.")}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#6E6E78]">
                <Shield className="h-3.5 w-3.5" />
                <span>
                  {t(
                    "Billing is handled securely through Stripe.",
                    "La facturation est gérée en toute sécurité par Stripe.",
                    "تتم إدارة الفوترة بأمان عبر Stripe.",
                  )}
                </span>
              </div>

              {isIosNative && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <button onClick={handleRestore} disabled={isPurchasing} className="text-sm text-[#6E6E78] underline transition-colors hover:text-[#E8E8E8] disabled:opacity-50">
                    {isPurchasing ? t("Processing...", "Traitement...", "جاري المعالجة...") : t("Restore Purchases", "Restaurer les achats", "استعادة المشتريات")}
                  </button>
                  <a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noreferrer" className="text-sm text-[#6E6E78] underline transition-colors hover:text-[#E8E8E8]">
                    {t("Manage Subscription", "Gérer l'abonnement", "إدارة الاشتراك")}
                  </a>
                  <div className="flex gap-4 text-xs text-[#6E6E78] mt-2">
                    <a href="/terms" target="_blank" className="underline hover:text-[#E8E8E8]">{t("Terms of Service", "Conditions d'utilisation", "شروط الخدمة")}</a>
                    <a href="/privacy" target="_blank" className="underline hover:text-[#E8E8E8]">{t("Privacy Policy", "Politique de confidentialité", "سياسة الخصوصية")}</a>
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}