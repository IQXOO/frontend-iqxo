"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Mic,
  ImageIcon,
  Brain,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { BrandLogo } from "../components/brand-logo";
import {
  devError,
  devLog,
  getFriendlyErrorMessage,
} from "../lib/logger";
import { useToast } from "../hooks/use-toast";
import { navigateToPath } from "../lib/navigation";

const PRICING = {
  monthlyEUR: 9.99,
  yearlyEUR: 79,
  yearlyPerMonth: (79 / 12).toFixed(2),
  savingsPct: Math.round(100 - (79 / (9.99 * 12)) * 100),
};

const PAYMENT_LINKS = {
  monthly: (import.meta as any).env?.VITE_STRIPE_MONTHLY_LINK,
  yearly: (import.meta as any).env?.VITE_STRIPE_YEARLY_LINK || "",
};

type BillingCycle = keyof typeof PAYMENT_LINKS;

const lifestyleCards = [
  {
    title: "Remember less",
    text: "Drop anything in — voice, photo, note, document. It stays safe.",
  },
  {
    title: "Find easily",
    text: "Everything is where you expect it. No searching, no folders.",
  },
  {
    title: "Think clearer",
    text: "Your mind isn't cluttered with things to remember. It's just… clear.",
  },
];

const experienceSteps = [
  {
    num: "01",
    title: "Capture",
    text: "Speak, snap, write, or upload. Whatever feels natural in the moment.",
  },
  {
    num: "02",
    title: "Release",
    text: "It quietly becomes organized for you. No steps. No thinking. No effort.",
  },
  {
    num: "03",
    title: "Be present",
    text: "Everything stays where it should be. Your day stays clear. Your mind stays free.",
  },
];

const pricingFeatures = [
  "Unlimited captures",
  "All features unlocked",
  "Cancel anytime",
  "30-day money-back guarantee",
];

const yearlyFeatures = [
  "Everything in Monthly",
  "12 months of uninterrupted calm",
  "Save €40.88 vs monthly (€119.88/year)",
  "30-day money-back guarantee",
];

const trialStats = [
  ["30", "Total captures"],
  ["7", "Days"],
  ["All", "Features"],
  ["0", "Card needed"],
];

function translate<T>(language: string, en: T, fr: T, ar: T) {
  return language === "ar" ? ar : language === "fr" ? fr : en;
}

function PageSection({
  whisper,
  title,
  subtitle,
  children,
  accent = "cyan",
  id,
}: {
  whisper: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  accent?: "cyan" | "amber" | "muted";
  id?: string;
}) {
  const whisperColor =
    accent === "cyan" ? "text-[#5BC0DE]" : accent === "amber" ? "text-[#D4A853]" : "text-[#6E6E78]";

  return (
    <section id={id} className="relative z-10 py-14 sm:py-16 md:py-20">
      <div className="mx-auto max-w-[640px] px-5 sm:px-8">
        <div className={`mb-8 text-center text-[0.7rem] uppercase tracking-[0.25em] ${whisperColor} opacity-50`}>
          {whisper}
        </div>
        <h2 className="mx-auto max-w-[540px] text-center text-[clamp(1.5rem,4vw,2.2rem)] font-normal leading-[1.25] tracking-[-0.02em] text-[#E8E8E8]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mx-auto mt-6 max-w-[460px] text-center text-[clamp(1rem,2vw,1.1rem)] font-light leading-[1.9] text-[#A0A0A8]">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

function Connector({ text }: { text: ReactNode }) {
  return (
    <div className="relative z-10 py-10 text-center sm:py-12">
      <div className="mx-auto mb-5 h-12 w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.08),transparent)]" />
      <p className="mx-auto max-w-[360px] px-5 text-[0.8rem] font-light italic leading-[1.8] text-[#6E6E78] opacity-70">
        {text}
      </p>
    </div>
  );
}

function PricingCard({
  title,
  label,
  subtitle,
  footer,
  accent,
  children,
  cta,
  ctaLabel,
  ctaClassName,
  badge,
}: {
  title: string;
  label: string;
  subtitle: string;
  footer: string;
  accent: "cyan" | "amber" | "luxury";
  children: ReactNode;
  cta: () => void;
  ctaLabel: string;
  ctaClassName: string;
  badge?: React.ReactNode;
}) {
  const cardClassName =
    accent === "cyan"
      ? "bg-[linear-gradient(180deg,rgba(91,192,222,0.08),rgba(91,192,222,0.02))] border-[rgba(91,192,222,0.1)]"
      : accent === "amber"
        ? "bg-[linear-gradient(180deg,rgba(212,168,83,0.08),rgba(212,168,83,0.02))] border-[rgba(212,168,83,0.1)]"
        : "bg-[#18181A] border-[rgba(255,255,255,0.06)]";

  const topLine =
    accent === "cyan"
      ? "bg-[linear-gradient(90deg,transparent,#5BC0DE,transparent)]"
      : accent === "amber"
        ? "bg-[linear-gradient(90deg,transparent,#D4A853,transparent)]"
        : "bg-[linear-gradient(90deg,transparent,#D4A853,#5BC0DE,transparent)]";

  return (
    <section
      className={`relative overflow-hidden rounded-[32px] border px-8 py-11 text-center ${cardClassName}`}
    >
      <div className={`absolute inset-x-0 top-0 h-[2px] ${topLine} opacity-30`} />
      <div className="text-[0.65rem] uppercase tracking-[0.3em] text-[#5BC0DE] opacity-80">
        {label}
      </div>
      <h3 className="mt-5 text-[1.5rem] font-normal tracking-[-0.02em] text-[#E8E8E8]">
        {title}
      </h3>
      <p className="mt-2 text-[0.9rem] font-light text-[#A0A0A8]">{subtitle}</p>
      {badge ? <div className="mt-5">{badge}</div> : null}
      <div className="mt-8">{children}</div>
      <button
        onClick={cta}
        className={ctaClassName}
      >
        {ctaLabel}
      </button>
      <div className="mt-5 text-[0.75rem] text-[#6E6E78]">{footer}</div>
    </section>
  );
}

export default function PricingPage() {
  const { language, user, planStatus, trialEndsAt, setPlanStatus } = useApp();
  const { toast } = useToast();
  const [scrolled, setScrolled] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const trialActive = planStatus === "free_trial" && trialEndsAt && trialEndsAt > new Date();

  const features = useMemo(
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
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubscribe = (cycle: BillingCycle) => {
    if (!user) {
      navigateToPath("/login");
      return;
    }

    const base = PAYMENT_LINKS[cycle];
    if (!base) {
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

    const url = user?.id
      ? `${base}?client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user?.email || "")}`
      : base;

    window.location.href = url;
  };

  const handleTrial = async () => {
    if (!user) {
      navigateToPath("/login");
      return;
    }

    // Trial is currently active — inform the user instead of silently navigating away
    if (trialActive) {
      toast({
        title: translate(language, "Your free trial is active", "Votre essai gratuit est actif", "تجربتك المجانية نشطة"),
        description: translate(
          language,
          "You already have an active 7-day free trial. Enjoy all features!",
          "Vous avez déjà un essai gratuit de 7 jours actif. Profitez de toutes les fonctionnalités !",
          "لديك تجربة مجانية لمدة 7 أيام نشطة بالفعل. استمتع بجميع الميزات!",
        ),
      });
      navigateToPath("/");
      return;
    }

    setTrialError(null);
    try {
      // Check if trial was already used (expired)
      const { data: existing } = await supabase
        .from("user_plans")
        .select("trial_started_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.trial_started_at) {
        const message = translate(
          language,
          "You've already used your free trial on this account. Subscribe to keep going.",
          "Vous avez déjà utilisé votre essai gratuit. Abonnez-vous pour continuer.",
          "استخدمت تجربتك المجانية من قبل على هذا الحساب. اشترك للمتابعة.",
        );
        setTrialError(message);
        toast({
          title: translate(language, "Trial already used", "Essai déjà utilisé", "التجربة مستخدمة مسبقًا"),
          description: message,
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
        title: translate(language, "Free trial activated! 🎉", "Essai gratuit activé ! 🎉", "تم تفعيل التجربة المجانية! 🎉"),
        description: translate(
          language,
          "Your 7-day free trial has started. Enjoy all features!",
          "Votre essai gratuit de 7 jours a commencé. Profitez de toutes les fonctionnalités !",
          "بدأت تجربتك المجانية لمدة 7 أيام. استمتع بجميع الميزات!",
        ),
      });
      navigateToPath("/");
    } catch (err: any) {
      devError("Billing", "Free trial activation failed", err);
      const message = getFriendlyErrorMessage(
        err,
        translate(language, "Something went wrong. Please try again.", "Une erreur est survenue.", "حدث خطأ. حاول مرة أخرى."),
      );
      setTrialError(message);
      toast({
        title: translate(language, "Couldn't start free trial", "Impossible de démarrer l'essai", "تعذّر بدء التجربة المجانية"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const isRTL = language === "ar";

  return (
    <div className={`relative min-h-screen overflow-x-hidden bg-[#0C0C0E] text-[#E8E8E8] ${isRTL ? "dir-rtl" : ""}`}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[15%] -top-[15%] h-[600px] w-[600px] rounded-full bg-[rgba(91,192,222,0.08)] blur-[120px] opacity-25 animate-[drift_25s_ease-in-out_infinite]" />
        <div className="absolute bottom-[10%] -right-[15%] h-[500px] w-[500px] rounded-full bg-[rgba(212,168,83,0.08)] blur-[120px] opacity-25 animate-[drift_30s_ease-in-out_infinite_reverse]" />
      </div>

      <nav
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 transition-all duration-700 sm:px-8 ${scrolled ? "border-b border-white/[0.04] bg-[rgba(12,12,14,0.6)] backdrop-blur-[40px]" : ""}`}
      >
        <BrandLogo className="text-[1.05rem] font-medium tracking-[-0.01em] text-[#E8E8E8]" />
        <div className="hidden items-center gap-4 sm:flex">
          <a href="#experience" className="text-[0.8rem] text-[#6E6E78] transition-colors hover:text-[#A0A0A8]">Experience</a>
          <a href="#pricing" className="text-[0.8rem] text-[#6E6E78] transition-colors hover:text-[#A0A0A8]">Pricing</a>
          <button
            type="button"
            onClick={() => navigateToPath("/login")}
            className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[#161618] px-4 py-2 text-[0.75rem] font-medium text-[#A0A0A8] transition-all hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#E8E8E8]"
          >
            Skip
          </button>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="min-h-screen px-5 pb-20 pt-32 text-center sm:px-8 sm:pb-20 sm:pt-36">
          <div className="mx-auto max-w-[540px]">
            <div className="mb-12 flex justify-center">
              <BrandLogo as="div" className="block text-[0.7rem] uppercase tracking-[0.25em] text-[#6E6E78] opacity-60" />
            </div>

            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(91,192,222,0.12)] bg-[rgba(91,192,222,0.08)] px-5 py-2 text-[0.8rem] text-[#5BC0DE]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5BC0DE] animate-pulse" />
              {translate(language, "7 Days of Calm — Free", "7 jours de calme — Gratuit", "7 أيام من الهدوء — مجاناً")}
            </div>

            <h1 className="text-[clamp(1.7rem,5vw,2.6rem)] font-normal leading-[1.2] tracking-[-0.03em] text-[#E8E8E8]">
              {translate(
                language,
                <>Your mind doesn't need to<br />hold <em className="font-light italic text-[#5BC0DE]">everything</em> anymore.</> as any,
                <>Votre esprit n'a plus besoin de tout<br />retenir <em className="font-light italic text-[#5BC0DE]">en permanence</em>.</> as any,
                <>عقلك لم يعد بحاجة إلى<br />حمل <em className="font-light italic text-[#5BC0DE]">كل شيء</em> بعد الآن.</> as any,
              )}
            </h1>

            <div className="mx-auto mb-10 mt-8 max-w-[420px] text-[clamp(0.9rem,2vw,1rem)] font-light leading-[1.7] text-[#A0A0A8] opacity-85">
              {translate(
                language,
                "Voice, photos, notes, and documents — all quietly organized as you go.",
                "Voix, photos, notes et documents — tout s'organise discrètement au fur et à mesure.",
                "الصوت والصور والملاحظات والمستندات — كلها تُنظم بهدوء أثناء استخدامك لها.",
              )}
            </div>

            <div className="mx-auto mb-12 max-w-[400px] text-[clamp(0.9rem,2vw,1rem)] font-light leading-[2] text-[#6E6E78]">
              <p>{translate(language, "What you capture stays with you.", "Ce que vous capturez reste avec vous.", "ما تلتقطه يبقى معك.")}</p>
              <p>{translate(language, "Without effort. Without thinking.", "Sans effort. Sans y penser.", "بدون جهد. وبدون تفكير.")}</p>
            </div>

            <button
              onClick={handleTrial}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(91,192,222,0.15)] bg-[rgba(91,192,222,0.08)] px-8 py-4 text-[0.9rem] font-medium text-[#5BC0DE] transition-all hover:border-[rgba(91,192,222,0.3)] hover:bg-[rgba(91,192,222,0.1)] hover:text-[#7DD3F0]"
            >
              {translate(language, "Start 7 Days Free", "Commencer 7 jours gratuits", "ابدأ 7 أيام مجانًا")}
              <span>→</span>
            </button>
            <p className="text-[0.75rem] text-[#6E6E78]">30 captures. No card required. Cancel anytime.</p>
          </div>
        </section>

        <Connector text={translate(language, "But first, the weight we all carry…", "Mais d'abord, le poids que nous portons…", "لكن أولًا، العبء الذي نحمله جميعًا…")} />

        <section className="relative z-10 py-14 text-center sm:py-16 md:py-20">
          <div className="mx-auto max-w-[640px] px-5 sm:px-8">
            <div className="mb-8 text-[0.7rem] uppercase tracking-[0.25em] text-[#D4A853] opacity-50">
              {translate(language, "The Weight", "Le poids", "العبء")}
            </div>
            <h2 className="text-[clamp(1.5rem,4vw,2.2rem)] font-normal leading-[1.25] tracking-[-0.02em] text-[#E8E8E8]">
              {translate(language, <>You carry too much<br />in your head.</> as any, <>Vous portez trop de choses<br />dans votre tête.</> as any, <>تحمل الكثير<br />في رأسك.</> as any)}
            </h2>
            <div className="mx-auto mt-8 max-w-[460px] text-[clamp(1rem,2vw,1.15rem)] font-light leading-[2.2] text-[#A0A0A8]">
              <p className="text-[#6E6E78]">{translate(language, "Things you meant to remember…", "Les choses que vous vouliez retenir…", "الأشياء التي كنت تنوي تذكرها…")}</p>
              <p className="text-[#6E6E78]">{translate(language, "ideas, messages, small tasks…", "idées, messages, petites tâches…", "أفكار، رسائل، مهام صغيرة…")}</p>
              <p className="text-[#D4A853]/70">{translate(language, "They don't disappear — they just pile up.", "Elles ne disparaissent pas — elles s'accumulent.", "لا تختفي — بل تتراكم.")}</p>
            </div>
          </div>
        </section>

        <Connector text={translate(language, "What if you could simply… let go?", "Et si vous pouviez simplement… laisser aller ?", "ماذا لو استطعت ببساطة… أن تتخلى؟")} />

        <section className="relative z-10 py-10 text-center sm:py-12">
          <div className="mx-auto max-w-[640px] px-5 sm:px-8">
            <h3 className="mb-4 text-[clamp(1.3rem,3.5vw,1.8rem)] font-normal leading-[1.3] tracking-[-0.02em] text-[#A0A0A8]">
              {translate(language, <>You stop trying<br />to remember.</> as any, <>Vous arrêtez d'essayer<br />de vous souvenir.</> as any, <>تتوقف عن المحاولة<br />للتذكر.</> as any)}
            </h3>
            <p className="mx-auto max-w-[380px] text-[1rem] font-light leading-[1.8] text-[#6E6E78]">
              {translate(language, <>And start trusting<br />that it's already there.</> as any, <>Et commencez à faire confiance<br />au fait que c'est déjà là.</> as any, <>وتبدأ بالثقة<br />أنه موجود بالفعل.</> as any)}
            </p>
          </div>
        </section>

        <Connector
          text={translate(
            language,
            <>
              This is where <BrandLogo as="span" className="text-[0.8rem] font-medium tracking-[-0.01em] text-[#6E6E78]" /> lives…
            </>,
            <>
              C'est là qu'<BrandLogo as="span" className="text-[0.8rem] font-medium tracking-[-0.01em] text-[#6E6E78]" /> vit…
            </>,
            <>
              هنا يعيش <BrandLogo as="span" className="text-[0.8rem] font-medium tracking-[-0.01em] text-[#6E6E78]" />…
            </>,
          )}
        />

        <PageSection
          whisper={translate(language, "The Relief", "Le soulagement", "الراحة")}
          title={translate(
            language,
            <>
              IQXO carries it<br />so you don't have to.
            </>,
            <>
              IQXO le porte<br />pour que vous n'ayez pas à le faire.
            </>,
            <>
              IQXO يحملها<br />حتى لا تضطر إلى ذلك.
            </>,
          )}
          subtitle={translate(language, "Everything you capture finds its place. Your mind stays free for what matters.", "Tout ce que vous capturez trouve sa place. Votre esprit reste libre pour l'essentiel.", "كل ما تلتقطه يجد مكانه. ويبقى عقلك حرًا لما يهم.")}
          accent="cyan"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {lifestyleCards.map((card) => (
              <div key={card.title} className="rounded-[24px] border border-[rgba(255,255,255,0.04)] bg-[#161618] p-9 text-left transition-all duration-700 hover:-translate-y-0.5 hover:border-white/[0.08]">
                <h3 className="mb-2 text-[0.95rem] font-medium tracking-[-0.01em] text-[#E8E8E8]">{card.title}</h3>
                <p className="text-[0.85rem] leading-[1.6] text-[#6E6E78]">{card.text}</p>
              </div>
            ))}
          </div>
        </PageSection>

        <Connector
          text={translate(
            language,
            <>
              A day with <BrandLogo as="span" className="text-[0.8rem] font-medium tracking-[-0.01em] text-[#6E6E78]" /> feels like this…
            </>,
            <>
              Une journée avec <BrandLogo as="span" className="text-[0.8rem] font-medium tracking-[-0.01em] text-[#6E6E78]" /> ressemble à ceci…
            </>,
            <>
              يبدو يومك مع <BrandLogo as="span" className="text-[0.8rem] font-medium tracking-[-0.01em] text-[#6E6E78]" /> هكذا…
            </>,
          )}
        />

        <PageSection
          whisper={translate(language, "The Flow", "Le flux", "التدفق")}
          title={translate(language, <>A calmer way to move<br />through your day.</> as any, <>Une façon plus calme de traverser<br />votre journée.</> as any, <>طريقة أهدأ<br />للتنقل خلال يومك.</> as any)}
          accent="muted"
          id="experience"
        >
          <div className="mx-auto max-w-[500px]">
            {experienceSteps.map((step, index) => (
              <div key={step.num} className={`border-b border-[rgba(255,255,255,0.04)] py-7 text-left ${index === experienceSteps.length - 1 ? "border-b-0" : ""}`}>
                <div className="mb-2 flex items-baseline gap-5">
                  <span className="min-w-[28px] text-[0.65rem] font-medium tracking-[0.15em] text-[#6E6E78]">{step.num}</span>
                  <h3 className="text-[1.05rem] font-medium tracking-[-0.01em] text-[#E8E8E8]">{step.title}</h3>
                </div>
                <p className="pl-12 text-[0.9rem] font-light leading-[1.7] text-[#A0A0A8]">{step.text}</p>
              </div>
            ))}
          </div>
        </PageSection>

        <section className="relative z-10 py-14 text-center sm:py-16 md:py-20">
          <div className="mx-auto max-w-[640px] px-5 sm:px-8">
            <h2 className="text-[clamp(1.4rem,3.5vw,1.9rem)] font-normal leading-[1.3] tracking-[-0.02em] text-[#A0A0A8]">
              {translate(language, <>A simpler way to move<br />through your day.</> as any, <>Une façon plus simple de traverser<br />votre journée.</> as any, <>طريقة أبسط<br />للتنقل خلال يومك.</> as any)}
            </h2>
            <p className="mt-5 text-[0.95rem] font-light text-[#6E6E78]">Less noise. Less thinking. More clarity.</p>
          </div>
        </section>

        <Connector text={translate(language, "Some moments deserve more…", "Certains moments méritent plus…", "بعض اللحظات تستحق أكثر…")} />

        <section className="relative z-10 py-14 sm:py-16 md:py-20">
          <div className="mx-auto max-w-[640px] px-5 sm:px-8">
            <div className="rounded-[32px] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.005))] px-10 py-16 text-center sm:px-14">
              <div className="mb-7 text-[1.6rem] opacity-35">◆</div>
              <h2 className="text-[clamp(1.4rem,3.5vw,1.9rem)] font-normal leading-[1.3] tracking-[-0.02em] text-[#E8E8E8]">
                {translate(language, <>A more comfortable way<br />to live your day.</> as any, <>Une façon plus confortable<br />de vivre votre journée.</> as any, <>طريقة أكثر راحة<br />لعيش يومك.</> as any)}
              </h2>
              <p className="mx-auto mt-5 max-w-[400px] text-[0.95rem] font-light leading-[1.8] text-[#A0A0A8]">
                {translate(language, "Everything you capture stays organized automatically — so your mind can stay free.", "Tout ce que vous capturez reste organisé automatiquement — pour que votre esprit reste libre.", "كل ما تلتقطه يبقى منظّمًا تلقائيًا — حتى يظل عقلك حرًا.")}
              </p>
            </div>
          </div>
        </section>

        <Connector text={translate(language, "Upgrading your day…", "Améliorer votre journée…", "ترقية يومك…")} />

        <section id="pricing" className="relative z-10 py-14 text-center sm:py-16 md:py-20">
          <div className="mx-auto max-w-[640px] px-5 sm:px-8">
            <div className="mb-8 text-[0.7rem] uppercase tracking-[0.25em] text-[#6E6E78] opacity-50">
              {translate(language, "Choose Your Pace", "Choisissez votre rythme", "اختر وتيرتك")}
            </div>
            <h2 className="text-[clamp(1.5rem,4vw,2.2rem)] font-normal leading-[1.25] tracking-[-0.02em] text-[#E8E8E8]">
              {translate(language, <>Start free. Upgrade when you're<br /><em className="font-light italic text-[#D4A853]">ready</em>.</> as any, <>Commencez gratuitement. Passez à la version supérieure quand vous êtes<br /><em className="font-light italic text-[#D4A853]">prêt</em>.</> as any, <>ابدأ مجانًا. وارتقِ عندما تكون<br /><em className="font-light italic text-[#D4A853]">مستعدًا</em>.</> as any)}
            </h2>
            <p className="mx-auto mt-6 max-w-[360px] text-[0.95rem] font-light leading-[1.7] text-[#A0A0A8]">
              {translate(language, "Start free. Upgrade when you need more. No hidden fees, ever.", "Commencez gratuitement. Passez à la version supérieure quand vous en avez besoin. Aucun frais caché.", "ابدأ مجانًا. وارتقِ عندما تحتاج المزيد. لا رسوم خفية أبدًا.")}
            </p>

            <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
              <PricingCard
                title={translate(language, "Free Trial", "Essai gratuit", "تجربة مجانية")}
                label={translate(language, "7 Days of Calm", "7 jours de calme", "7 أيام من الهدوء")}
                subtitle={translate(language, "Feel the difference. No commitment.", "Ressentez la différence. Sans engagement.", "اشعر بالفرق. بدون التزام.")}
                footer={translate(language, "Voice, photos, notes, documents — try everything.", "Voix, photos, notes, documents — essayez tout.", "الصوت والصور والملاحظات والمستندات — جرّب كل شيء.")}
                accent="cyan"
                cta={handleTrial}
                ctaLabel={translate(language, "Start Free Trial", "Commencer l'essai gratuit", "ابدأ التجربة المجانية")}
                ctaClassName="mt-8 block w-full rounded-full border border-[rgba(91,192,222,0.15)] bg-[rgba(91,192,222,0.08)] px-4 py-4 text-[0.9rem] font-medium text-[#5BC0DE] transition-all hover:border-[rgba(91,192,222,0.25)] hover:bg-[rgba(91,192,222,0.1)] hover:text-[#7DD3F0]"
              >
                <div className="grid grid-cols-2 gap-3 text-left">
                  {trialStats.map(([num, label]) => (
                    <div key={label} className="rounded-[16px] border border-[rgba(91,192,222,0.06)] bg-[rgba(91,192,222,0.04)] p-4">
                      <div className="mb-1 text-[1.4rem] font-light leading-none text-[#5BC0DE]">{num}</div>
                      <div className="text-[0.75rem] text-[#6E6E78]">{label}</div>
                    </div>
                  ))}
                </div>
                {trialError ? (
                  <div className="mt-4 rounded-[16px] border border-[rgba(212,168,83,0.1)] bg-[rgba(212,168,83,0.06)] px-4 py-3 text-left text-[0.75rem] text-[#A0A0A8]">
                    {trialError}
                  </div>
                ) : null}
                {trialActive ? (
                  <div className="mt-4 rounded-[16px] border border-[rgba(212,168,83,0.08)] bg-[rgba(212,168,83,0.06)] px-4 py-3 text-left text-[0.75rem] text-[#A0A0A8]">
                    {translate(language, "Your free trial is already active.", "Votre essai gratuit est déjà actif.", "التجربة المجانية مفعلة بالفعل.")}
                  </div>
                ) : null}
              </PricingCard>

              <PricingCard
                title={translate(language, "Upgrade to Calm", "Passer à Calm", "الترقية إلى Calm")}
                label={translate(language, "Upgrade Your Day", "Améliorez votre journée", "طوّر يومك")}
                subtitle={translate(language, "per month", "par mois", "شهريًا")}
                footer={translate(language, "No questions asked. Full refund within 30 days.", "Sans questions. Remboursement complet sous 30 jours.", "بدون أسئلة. استرداد كامل خلال 30 يومًا.")}
                accent="luxury"
                cta={() => handleSubscribe("monthly")}
                ctaLabel={translate(language, "Upgrade to Calm", "Passer à Calm", "الترقية إلى Calm")}
                ctaClassName="mt-8 block w-full rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent px-4 py-4 text-[0.9rem] font-medium text-[#A0A0A8] transition-all hover:border-[rgba(91,192,222,0.3)] hover:bg-[rgba(91,192,222,0.04)] hover:text-[#E8E8E8]"
                badge={
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,168,83,0.12)] bg-[rgba(212,168,83,0.08)] px-4 py-2 text-[0.75rem] font-medium text-[#D4A853]">
                    {translate(language, "Best Value", "Meilleur rapport", "الأفضل قيمة")}
                  </div>
                }
              >
                <div className="flex items-end justify-center gap-0.5 tracking-[-0.03em] text-[#E8E8E8]">
                  <span className="text-[3rem] font-light leading-none">€{PRICING.monthlyEUR}</span>
                  <span className="pb-1 text-[1.1rem] font-normal text-[#6E6E78]">.99</span>
                </div>
                <div className="mt-2 text-[0.85rem] text-[#6E6E78]">{translate(language, "per month", "par mois", "شهريًا")}</div>
                <div className="mt-8 text-left">
                  {pricingFeatures.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)] py-3 text-[0.9rem] text-[#A0A0A8] last:border-b-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(91,192,222,0.08)] text-[0.7rem] text-[#5BC0DE]">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </PricingCard>

              <PricingCard
                title={translate(language, "Unlimited Peace of Mind", "Sérénité illimitée", "راحة بال غير محدودة")}
                label={translate(language, "A Calmer Year", "Une année plus calme", "عام أكثر هدوءًا")}
                subtitle={translate(language, "One commitment. A full year of calm.", "Un engagement. Une année de calme.", "التزام واحد. عام كامل من الهدوء.")}
                footer={translate(language, "No questions asked. Full refund within 30 days.", "Sans questions. Remboursement complet sous 30 jours.", "بدون أسئلة. استرداد كامل خلال 30 يومًا.")}
                accent="amber"
                cta={() => handleSubscribe("yearly")}
                ctaLabel={translate(language, "Commit to Calm", "S'engager vers le calme", "الالتزام بالهدوء")}
                ctaClassName="mt-8 block w-full rounded-full border border-[rgba(212,168,83,0.15)] bg-[rgba(212,168,83,0.08)] px-4 py-4 text-[0.9rem] font-medium text-[#D4A853] transition-all hover:border-[rgba(212,168,83,0.25)] hover:bg-[rgba(212,168,83,0.1)] hover:text-[#E8C070]"
                badge={
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,168,83,0.12)] bg-[rgba(212,168,83,0.08)] px-4 py-2 text-[0.75rem] font-medium text-[#D4A853]">
                    🔥 {translate(language, "Most Popular", "Le plus populaire", "الأكثر شيوعًا")}
                  </div>
                }
              >
                <div className="flex items-end justify-center gap-0.5 tracking-[-0.03em] text-[#E8E8E8]">
                  <span className="text-[3rem] font-light leading-none">€79</span>
                </div>
                <div className="mt-2 text-[0.85rem] text-[#6E6E78]">{translate(language, "per year", "par an", "سنويًا")}</div>
                <div className="mt-2 text-[0.8rem] italic font-light text-[#D4A853]/70">
                  {translate(language, "Billed yearly — a calmer commitment", "Facturé chaque année — un engagement plus calme", "يُفوتر سنويًا — التزام أكثر هدوءًا")}
                </div>
                <div className="mt-8 text-left">
                  {yearlyFeatures.map((feature, index) => (
                    <div key={feature} className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)] py-3 text-[0.9rem] text-[#A0A0A8] last:border-b-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(212,168,83,0.08)] text-[0.7rem] text-[#D4A853]">✓</span>
                      <span className={index === 2 ? "text-[#D4A853]" : ""}>{feature}</span>
                    </div>
                  ))}
                </div>
              </PricingCard>

              <div className="md:col-span-3 mx-auto mt-6 max-w-[600px] rounded-[16px] border border-[rgba(255,255,255,0.04)] bg-[#161618] px-5 py-5 text-center">
                <p className="mb-2 text-[0.85rem] leading-6 text-[#A0A0A8]">
                  {translate(language, "After your 7-day trial, continue Free with 10 captures/month.", "Après votre essai de 7 jours, continuez gratuitement avec 10 captures/mois.", "بعد تجربتك لمدة 7 أيام، يمكنك المتابعة مجانًا مع 10 عمليات التقاط شهريًا.")} <strong className="font-medium text-[#E8E8E8]">{translate(language, "No credit card required.", "Aucune carte requise.", "لا حاجة لبطاقة ائتمان.")}</strong> {translate(language, "Upgrade anytime.", "Mettez à niveau à tout moment.", "يمكنك الترقية في أي وقت.")}
                </p>
                <p className="text-[0.75rem] text-[#6E6E78]">
                  {translate(language, "Billing is handled securely through Stripe.", "La facturation est gérée en toute sécurité par Stripe.", "تتم إدارة الفوترة بأمان عبر Stripe.")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 py-20 text-center sm:py-24">
          <div className="mx-auto max-w-[640px] px-5 sm:px-8">
            <h2 className="text-[clamp(1.7rem,5vw,2.6rem)] font-normal leading-[1.2] tracking-[-0.03em] text-[#E8E8E8]">
              {translate(language, <>Let your day<br />take care of <em className="font-light italic text-[#5BC0DE]">itself</em>.</> as any, <>Laissez votre journée<br />prendre soin d'<em className="font-light italic text-[#5BC0DE]">elle-même</em>.</> as any, <>دع يومك<br />يعتني بـ<em className="font-light italic text-[#5BC0DE]">نفسه</em>.</> as any)}
            </h2>
            <button
              onClick={handleTrial}
              className="mt-9 inline-flex items-center gap-2 rounded-full border border-[rgba(91,192,222,0.15)] bg-[rgba(91,192,222,0.08)] px-10 py-4 text-[1rem] font-medium text-[#5BC0DE] transition-all hover:border-[rgba(91,192,222,0.3)] hover:bg-[rgba(91,192,222,0.1)] hover:text-[#7DD3F0]"
            >
              {translate(language, "Start 7 Days Free", "Commencer 7 jours gratuits", "ابدأ 7 أيام مجانًا")}
              <span>→</span>
            </button>
            <p className="mt-4 text-[0.8rem] text-[#6E6E78]">30 captures. No card. No strings.</p>
          </div>
        </section>

        <footer className="border-t border-[rgba(255,255,255,0.04)] py-12 text-center">
          <div className="mx-auto max-w-[640px] px-5 sm:px-8">
            <BrandLogo as="span" className="mb-3 text-[1rem] font-medium tracking-[-0.01em] text-[#E8E8E8] opacity-25" />
            <p className="text-[0.75rem] text-[#6E6E78]">Let your day take care of itself.</p>
          </div>
        </footer>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] lg:hidden">
        <div className="mx-auto flex w-full max-w-[420px] gap-3">
          <button
            onClick={() => navigateToPath("/login")}
            className="flex-1 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(22,22,24,0.92)] px-5 py-4 text-[0.9rem] font-medium text-[#A0A0A8] shadow-[0_-8px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#E8E8E8]"
          >
            Skip
          </button>
          <button
            onClick={handleTrial}
            className="flex-[1.3] rounded-full border border-[rgba(91,192,222,0.15)] bg-[rgba(12,12,14,0.92)] px-5 py-4 text-[0.9rem] font-medium text-[#5BC0DE] shadow-[0_-8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all hover:border-[rgba(91,192,222,0.3)] hover:bg-[rgba(91,192,222,0.1)] hover:text-[#7DD3F0]"
          >
            {translate(language, "Start 7 Days Free", "Commencer 7 jours gratuits", "ابدأ 7 أيام مجانًا")}
          </button>
        </div>
      </div>
    </div>
  );
}
