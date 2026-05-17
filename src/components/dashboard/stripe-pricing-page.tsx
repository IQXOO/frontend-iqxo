"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Check,
  X,
  Gift,
  Clock,
  Mic,
  ImageIcon,
  Brain,
  Lightbulb,
  Zap,
  Lock,
  AlertCircle,
  CreditCard,
  ChevronRight,
  Shield,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { useApp } from "../../lib/store";
import { devError, devLog, devWarn, fetchWithDiagnostics, getFriendlyErrorMessage, readResponseText } from "../../lib/logger";
import { useToast } from "../../hooks/use-toast";

type BillingCycle = "monthly" | "yearly";

interface PricingConfig {
  monthlyEUR: number;
  yearlyEUR: number;
  yearlyPerMonth: string;
  savingsPct: number;
}

const PRICING: PricingConfig = {
  monthlyEUR: 9.99,
  yearlyEUR: 79,
  yearlyPerMonth: (79 / 12).toFixed(2),
  savingsPct: Math.round(100 - (79 / (9.99 * 12)) * 100),
};

const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_API || "http://localhost:4000";

const PAYMENT_LINKS: Record<BillingCycle, string> = {
  monthly: (import.meta as any).env?.VITE_STRIPE_MONTHLY_LINK,
  yearly: (import.meta as any).env?.VITE_STRIPE_YEARLY_LINK || "",
};

function useTranslate(language: string) {
  return (en: string, fr: string, ar: string) =>
    language === "ar" ? ar : language === "fr" ? fr : en;
}

function formatCardNumber(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 16);
  return v.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 4);
  if (v.length >= 3) return v.slice(0, 2) + "/" + v.slice(2);
  return v;
}

function detectCardBrand(number: string): string {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]|^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "generic";
}

function CardBrandIcon({ brand }: { brand: string }) {
  if (brand === "visa")
    return (
      <div className="h-5 w-9 rounded bg-[#1A1F71] flex items-center justify-center px-1">
        <span
          className="text-[9px] font-black italic tracking-wider"
          style={{ color: "#fff", fontFamily: "serif" }}
        >
          VISA
        </span>
      </div>
    );
  if (brand === "mastercard")
    return (
      <div className="h-5 w-9 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-[#EB001B] opacity-90 -mr-1.5 z-10" />
        <div className="w-4 h-4 rounded-full bg-[#F79E1B] opacity-90" />
      </div>
    );
  if (brand === "amex")
    return (
      <div className="h-5 w-9 rounded bg-[#007BC1] flex items-center justify-center">
        <span className="text-[8px] font-black text-white tracking-tighter">
          AMEX
        </span>
      </div>
    );
  return (
    <div className="h-5 w-9 rounded bg-white/10 flex items-center justify-center">
      <CreditCard className="w-3.5 h-3.5 text-white/40" />
    </div>
  );
}

function CardForm({
  language,
  onValidChange,
}: {
  language: string;
  onValidChange: (valid: boolean) => void;
}) {
  const t = useTranslate(language);
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const brand = detectCardBrand(number);

  const validate = useCallback(
    (n: string, e: string, c: string, nm: string) => {
      const errs: Record<string, string> = {};
      const clean = n.replace(/\s/g, "");
      if (clean.length > 0 && clean.length < 13)
        errs.number = t(
          "Invalid card number",
          "Numéro invalide",
          "رقم غير صالح",
        );
      if (e.length > 0 && e.length < 5)
        errs.expiry = t("Invalid date", "Date invalide", "تاريخ غير صالح");
      if (e.length === 5) {
        const [mm, yy] = e.split("/").map(Number);
        const now = new Date();
        const year = 2000 + yy;
        if (
          mm < 1 ||
          mm > 12 ||
          year < now.getFullYear() ||
          (year === now.getFullYear() && mm < now.getMonth() + 1)
        )
          errs.expiry = t(
            "Card expired",
            "Carte expirée",
            "البطاقة منتهية الصلاحية",
          );
      }
      if (c.length > 0 && c.length < 3)
        errs.cvc = t("Invalid CVC", "CVC invalide", "CVC غير صالح");
      setErrors(errs);
      const isValid =
        Object.keys(errs).length === 0 &&
        clean.length >= 13 &&
        e.length === 5 &&
        c.length >= 3 &&
        nm.trim().length > 0;
      onValidChange(isValid);
      return isValid;
    },
    [onValidChange, t],
  );

  const field =
    "w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-white placeholder:text-white/20 text-sm focus:outline-none transition-colors";
  const borderOk = "border-white/[0.08] focus:border-blue-500/50";
  const borderErr = "border-red-500/50 focus:border-red-500/70";

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          validate(number, expiry, cvc, e.target.value);
        }}
        onBlur={() => setTouched((p) => ({ ...p, name: true }))}
        placeholder={t("Name on card", "Nom sur la carte", "الاسم على البطاقة")}
        className={`${field} ${touched.name && !name.trim() ? borderErr : borderOk}`}
      />
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={number}
          onChange={(e) => {
            const v = formatCardNumber(e.target.value);
            setNumber(v);
            validate(v, expiry, cvc, name);
          }}
          onBlur={() => setTouched((p) => ({ ...p, number: true }))}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          className={`${field} pr-16 ${touched.number && errors.number ? borderErr : borderOk}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <CardBrandIcon brand={brand} />
        </div>
        {touched.number && errors.number && (
          <p className="text-[11px] text-red-400 mt-1 ml-1">{errors.number}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            type="text"
            inputMode="numeric"
            value={expiry}
            onChange={(e) => {
              const v = formatExpiry(e.target.value);
              setExpiry(v);
              validate(number, v, cvc, name);
            }}
            onBlur={() => setTouched((p) => ({ ...p, expiry: true }))}
            placeholder="MM/YY"
            maxLength={5}
            className={`${field} ${touched.expiry && errors.expiry ? borderErr : borderOk}`}
          />
          {touched.expiry && errors.expiry && (
            <p className="text-[11px] text-red-400 mt-1 ml-1">
              {errors.expiry}
            </p>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={cvc}
            onChange={(e) => {
              const v = e.target.value
                .replace(/\D/g, "")
                .slice(0, brand === "amex" ? 4 : 3);
              setCvc(v);
              validate(number, expiry, v, name);
            }}
            onBlur={() => setTouched((p) => ({ ...p, cvc: true }))}
            placeholder={brand === "amex" ? "4 digits" : "CVC"}
            maxLength={brand === "amex" ? 4 : 3}
            className={`${field} pr-9 ${touched.cvc && errors.cvc ? borderErr : borderOk}`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20">
            <Shield className="w-3.5 h-3.5" />
          </div>
          {touched.cvc && errors.cvc && (
            <p className="text-[11px] text-red-400 mt-1 ml-1">{errors.cvc}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface StripePricingPageProps {
  open?: boolean;
  onClose?: () => void;
  forceOpen?: boolean;
  planStatus?: string;
  trialEndsAt?: Date | null;
}

export function StripePricingPage({
  open = true,
  onClose,
  forceOpen = false,
  planStatus,
  trialEndsAt,
}: StripePricingPageProps) {
  const { language, setPlanStatus, user, session } = useApp();
  const { toast } = useToast();
  const isRTL = language === "ar";
  const t = useTranslate(language);

  const [billing, setBilling] = useState<BillingCycle>("yearly");

  // ── Native iOS swipe-down-to-close ────────────────────────────────────────
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isDraggingSheet = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (forceOpen) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Only start drag if user touches the drag handle area (top 48px)
    const touch = e.touches[0];
    const rect = sheet.getBoundingClientRect();
    const relativeY = touch.clientY - rect.top;
    if (relativeY > 48) return; // only drag handle triggers sheet drag
    touchStartY.current = touch.clientY;
    touchCurrentY.current = touch.clientY;
    isDraggingSheet.current = true;
    sheet.style.transition = "none";
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSheet.current || forceOpen) return;
    const touch = e.touches[0];
    touchCurrentY.current = touch.clientY;
    const delta = Math.max(0, touch.clientY - touchStartY.current);
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transform = `translateY(${delta}px)`;
      sheet.style.opacity = String(Math.max(0.4, 1 - delta / 300));
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingSheet.current || forceOpen) return;
    isDraggingSheet.current = false;
    const sheet = sheetRef.current;
    const delta = touchCurrentY.current - touchStartY.current;
    if (sheet) {
      sheet.style.transition =
        "transform 0.3s cubic-bezier(0.32,0.72,0,1), opacity 0.3s";
      if (delta > 80) {
        // Dismiss
        sheet.style.transform = "translateY(100%)";
        sheet.style.opacity = "0";
        setTimeout(() => onClose?.(), 280);
      } else {
        // Snap back
        sheet.style.transform = "translateY(0)";
        sheet.style.opacity = "1";
      }
    }
  };
  const [step, setStep] = useState<"plans" | "success" | "error">("plans");
  const [trialError, setTrialError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleSubscribe = (cycle: BillingCycle) => {
    const base = PAYMENT_LINKS[cycle];
    if (!base) {
      devWarn('Billing', 'Missing payment link for billing cycle', { cycle })
      toast({
        title: "Payment link unavailable",
        description:
          cycle === "yearly"
            ? "Yearly billing isn't configured yet. Please try monthly or contact support."
            : "Monthly billing isn't configured yet. Please contact support.",
        variant: "destructive",
      });
      setErrorMessage(
        t(
          "Yearly payment link not configured yet. Please try monthly or contact support.",
          "Lien de paiement annuel non configuré. Essayez mensuel ou contactez le support.",
          "رابط الدفع السنوي غير متاح بعد. جرب الشهري أو تواصل مع الدعم.",
        ),
      );
      setStep("error");
      return;
    }
    const url = user?.id
      ? `${base}?client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user?.email || "")}`
      : base;
    window.location.href = url;
  };

  // ── Free Trial ─────────────────────────────────────────────────────────────
  const handleTrial = async () => {
    if (!user) return;
    setTrialError(null);
    devLog('Billing', 'Free trial request started', { hasExistingTrial: planStatus === 'free_trial' })

    // Already on active trial → just close the screen, open the app
    if (
      planStatus === "free_trial" &&
      trialEndsAt &&
      trialEndsAt > new Date()
    ) {
      onClose?.();
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetchWithDiagnostics(
        'Billing',
        'POST /start-trial',
        `${BACKEND_URL}/start-trial`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ userId: user.id }),
        },
        { timeoutMs: 15000, context: { userId: user.id } },
      );

      // Server endpoint not ready — activate locally and close
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        devWarn('Billing', 'Trial endpoint returned non-JSON response; using local fallback')
        const trialEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        setPlanStatus("free_trial", trialEnd);
        onClose?.();
        return;
      }

      const data = await res.json();

      if (res.status === 409) {
        // Trial already used — show inline warning with dismiss X
        devWarn('Billing', 'Trial already active or already used', { status: res.status })
        const message = t(
          "This account has already used its free trial. Please subscribe to continue.",
          "Ce compte a déjà utilisé l'essai gratuit. Veuillez vous abonner.",
          "هذا الحساب استخدم التجربة المجانية من قبل. يرجى الاشتراك للمتابعة.",
        );
        setTrialError(message);
        toast({
          title: "Trial unavailable",
          description: message,
          variant: "destructive",
        });
        return;
      }

      if (!res.ok) {
        const responseText = await readResponseText(res);
        throw new Error(data.error || responseText || `Trial request failed (${res.status})`);
      }

      // ✅ Trial started — activate + close immediately, no success screen
      devLog('Billing', 'Free trial activated')
      setPlanStatus("free_trial", new Date(data.trialEndsAt));
      onClose?.();
    } catch (err: any) {
      devError('Billing', 'Free trial request failed', err)
      const message = getFriendlyErrorMessage(
        err,
        t(
          "Something went wrong. Please try again.",
          "Une erreur est survenue.",
          "حدث خطأ.",
        ),
      );
      setTrialError(message);
      toast({
        title: "Couldn't start free trial",
        description: message,
        variant: "destructive",
      });
    }
  };

  const features = [
    { icon: Mic, en: "Voice → Event", fr: "Voix → Événement", ar: "صوت ← حدث" },
    {
      icon: ImageIcon,
      en: "Image / PDF extraction",
      fr: "Extraction Image / PDF",
      ar: "استخراج صورة / PDF",
    },
    {
      icon: Brain,
      en: "Smart analysis",
      fr: "Analyse intelligente",
      ar: "تحليل ذكي",
    },
    {
      icon: Lightbulb,
      en: "AI Suggestions",
      fr: "Suggestions IA",
      ar: "اقتراحات AI",
    },
    {
      icon: Sparkles,
      en: "Any future AI feature",
      fr: "Toute future fonction IA",
      ar: "أي ميزة AI مستقبلية",
    },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
        onClick={forceOpen ? undefined : onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          ref={sheetRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-[90vh] max-w-lg bg-[#0d0d12] rounded-t-3xl border-t border-white/[0.08] max-h-[70vh] overflow-y-auto relative ${isRTL ? "text-right" : ""}`}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Ambient glow (subtly reduced for calmer premium feel) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-40 bg-gradient-to-b from-blue-500/12 via-purple-500/6 to-transparent blur-2xl pointer-events-none rounded-full" />

          {/* Drag handle — touch target for swipe-down */}
          <div className="flex justify-center pt-3 pb-1 select-none">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>

          {/* Close button — always visible (not just when !forceOpen) */}

          <button
            onClick={onClose}
            className="absolute top-10 right-4 z-10 p-2 rounded-full bg-white/[0.06] hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>

          <div className="relative px-5 pb-8 pt-2">
            <AnimatePresence mode="wait">
              {/* ───────────────────── PLANS ────────────────────────────── */}
              {step === "plans" && (
                <motion.div
                  key="plans"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-5 pt-3"
                >
                  {/* Header */}
                  <div className="text-center">
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/5 mb-3"
                    >
                      <Crown className="w-7 h-7 text-amber-400" />
                    </motion.div>
                    <h2 className="text-xl font-bold text-white">
                      {t(
                        "Unlock IQXO Pro",
                        "Débloquer IQXO Pro",
                        "فعّل IQXO Pro",
                      )}
                    </h2>
                    <p className="text-sm text-white/40 mt-1">
                      {t(
                        "Turn photos, voice & documents into smart reminders instantly.",
                        "Transformez photos, voix et documents en rappels intelligents instantanément.",
                        "حوّل الصور والصوت والمستندات إلى تذكيرات ذكية فورًا.",
                      )}
                    </p>
                  </div>

                  {/* Expired banner */}
                  {planStatus === "expired" && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25"
                    >
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <p className="text-xs text-amber-300">
                        {t(
                          "Your free trial has ended. Choose a plan to continue.",
                          "Votre essai gratuit a expiré. Choisissez un plan.",
                          "انتهت التجربة المجانية. اختر خطة للمتابعة.",
                        )}
                      </p>
                    </motion.div>
                  )}

                  {/* Billing toggle */}
                  <div className="flex items-center justify-center p-1 bg-white/[0.04] rounded-2xl gap-1">
                    {(["monthly", "yearly"] as BillingCycle[]).map((cycle) => (
                      <button
                        key={cycle}
                        onClick={() => setBilling(cycle)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${billing === cycle ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/60"}`}
                      >
                        {cycle === "monthly"
                          ? t("Monthly", "Mensuel", "شهري")
                          : t("Yearly", "Annuel", "سنوي")}
                        {cycle === "yearly" && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${billing === "yearly" ? "bg-emerald-500/25 text-emerald-400" : "bg-emerald-500/10 text-emerald-500/60"}`}
                          >
                            -{PRICING.savingsPct}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Plan card */}
                  <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-transparent p-[1px]">
                      <div className="h-full w-full rounded-2xl bg-[#0d0d12]" />
                    </div>
                    <div className="relative p-5">
                      {billing === "yearly" && (
                        <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-b-xl bg-gradient-to-r from-blue-500 to-purple-500 text-[10px] font-bold text-white shadow">
                          {t("Best Value", "Meilleur rapport", "الأفضل قيمة")}
                        </div>
                      )}
                      <div className="flex items-end justify-between mb-4 mt-2">
                        <div>
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={billing}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              className="flex items-baseline gap-1"
                            >
                                {/* Emphasize monthly equivalent first for better psychological pricing */}
                                <span className="text-5xl font-extrabold text-white">
                                  {billing === "monthly"
                                    ? `${PRICING.monthlyEUR}€`
                                    : `${PRICING.yearlyPerMonth}€`}
                                </span>
                                <span className="text-white/30 text-sm">
                                  {t("/month", "/mois", "/شهر")}
                                </span>
                            </motion.div>
                          </AnimatePresence>
                            <p className="text-xs text-white/30 mt-0.5">
                              {billing === "monthly"
                                ? t(
                                    "Billed monthly",
                                    "Facturé mensuellement",
                                    "يُفوتر شهريًا",
                                  )
                                : t(
                                    `Billed annually at ${PRICING.yearlyEUR}€`,
                                    `Facturé annuellement ${PRICING.yearlyEUR}€`,
                                    `يُفوتر سنويًا ${PRICING.yearlyEUR}€`,
                                  )}
                            </p>
                        </div>
                        {billing === "yearly" && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-emerald-400">
                              {PRICING.yearlyPerMonth}€/mo
                            </p>
                            <p className="text-[10px] text-white/30">
                              {t("instead of", "au lieu de", "بدلاً من")}{" "}
                              {PRICING.monthlyEUR}€
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="grid items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-blue-500/8 border border-white/[0.04]">
                        <Zap className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                        <p className="text-sm font-semibold text-white">
                          {t(
                            "300 Smart Actions monthly",
                            "300 Actions Intelligentes par mois",
                            "300 إجراء ذكي شهريًا",
                          )}
                        </p>
                      </div>
                      <div className="space-y-2 mb-5">
                        {features.map((f, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * i }}
                            className="flex items-center gap-2.5"
                          >
                            <div className="h-6 w-6 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                              <f.icon className="w-3.5 h-3.5 text-white/50" />
                            </div>
                            <span className="text-sm text-white/70 flex-1">
                              {t(f.en, f.fr, f.ar)}
                            </span>
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          </motion.div>
                        ))}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSubscribe(billing)}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm shadow-md shadow-blue-500/12 hover:shadow-blue-500/18 transition-all flex items-center justify-center gap-3"
                      >
                        {/* Clear, human CTA with monthly-first emphasis */}
                        <span>
                          {t("Upgrade Now", "Mettre à niveau", "قم بالترقية")}
                        </span>
                        <span className="text-sm text-white/80 font-bold">
                          {billing === "monthly"
                            ? `${PRICING.monthlyEUR}€/month`
                            : `${PRICING.yearlyPerMonth}€/month`}
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>

                      {/* Sticky mobile CTA (keeps conversion anchor visible on small screens) */}
                      <div className="md:hidden sticky bottom-0 left-0 right-0 mt-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-transparent">
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSubscribe(billing)}
                          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-base shadow-md shadow-blue-500/12 hover:shadow-blue-500/18 transition-all flex items-center justify-center gap-3"
                        >
                          <span>{t("Upgrade Now", "Mettre à niveau", "قم بالترقية")}</span>
                          <span className="text-sm text-white/80 font-bold">
                            {billing === "monthly"
                              ? `${PRICING.monthlyEUR}€/month`
                              : `${PRICING.yearlyPerMonth}€/month`}
                          </span>
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Free trial button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTrial}
                    className="w-full p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] transition-all flex items-center gap-4"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/10 shrink-0">
                      <Gift className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white text-sm">
                        {t(
                          "2-Day Free Trial",
                          "Essai gratuit 2 jours",
                          "تجربة مجانية يومان",
                        )}
                      </p>
                      <p className="text-xs text-white/40">
                        {t(
                          "Full access · No credit card needed",
                          "Accès complet · Sans carte bancaire",
                          "وصول كامل · بدون بطاقة ائتمانية",
                        )}
                      </p>
                    </div>
                    <span className="text-base font-black text-emerald-400">
                      Free
                    </span>
                  </motion.button>

                  {/* Trial error — with X to dismiss and close */}
                  <AnimatePresence>
                    {trialError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                      >
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300 flex-1">
                          {trialError}
                        </p>
                        <button
                          onClick={() => {
                            setTrialError(null);
                            onClose?.();
                          }}
                          className="text-red-400/60 hover:text-red-300 shrink-0 transition-colors ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Security footer */}
                  <div className="flex items-center justify-center gap-2 text-white/25 text-[11px]">
                    <Lock className="w-3 h-3" />
                    <span>
                      {t(
                        "Encrypted & secured by Stripe",
                        "Chiffré par Stripe",
                        "مشفر بواسطة Stripe",
                      )}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* ───────────────────── SUCCESS ──────────────────────────── */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center py-12 gap-5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      delay: 0.1,
                      stiffness: 300,
                      damping: 20,
                    }}
                    className="relative"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, x: 0, y: 0 }}
                        animate={{
                          scale: [0, 1, 0],
                          x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 8)],
                          y: [0, -(20 + i * 6)],
                        }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.8 }}
                        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                        style={{
                          background: [
                            "#3b82f6",
                            "#8b5cf6",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#06b6d4",
                          ][i],
                        }}
                      />
                    ))}
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {t(
                        "You're all set! 🎉",
                        "Tout est prêt ! 🎉",
                        "أنت جاهز! 🎉",
                      )}
                    </h2>
                    <p className="text-white/50 text-sm mt-2 max-w-xs">
                      {t(
                        "Welcome to IQXO Pro. All AI features are now unlocked.",
                        "Bienvenue dans IQXO Pro. Toutes les fonctionnalités IA sont disponibles.",
                        "مرحباً بك في IQXO Pro. جميع ميزات AI متاحة الآن.",
                      )}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                  >
                    {t(
                      "Start Using IQXO",
                      "Commencer à utiliser IQXO",
                      "ابدأ باستخدام IQXO",
                    )}
                  </button>
                  {/* ✅ Cancel button on success step */}
                  <button
                    onClick={onClose}
                    className="text-white/25 text-xs hover:text-white/50 transition-colors -mt-2"
                  >
                    {t("Cancel", "Annuler", "إلغاء")}
                  </button>
                </motion.div>
              )}

              {/* ───────────────────── ERROR ────────────────────────────── */}
              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center py-12 gap-5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center"
                  >
                    <XCircle className="w-10 h-10 text-red-400" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {t("Payment Failed", "Paiement échoué", "فشل الدفع")}
                    </h2>
                    <p className="text-white/40 text-sm mt-2 max-w-xs">
                      {errorMessage ||
                        t(
                          "Something went wrong. Please try again.",
                          "Une erreur est survenue. Veuillez réessayer.",
                          "حدث خطأ. يرجى المحاولة مرة أخرى.",
                        )}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("plans")}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm"
                    >
                      {t("Try Again", "Réessayer", "حاول مرة أخرى")}
                    </button>
                    {/* ✅ Cancel button on error step */}
                    <button
                      onClick={onClose}
                      className="px-6 py-3 rounded-xl bg-white/[0.06] text-white/60 font-semibold text-sm hover:bg-white/[0.09] transition-colors"
                    >
                      {t("Cancel", "Annuler", "إلغاء")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
