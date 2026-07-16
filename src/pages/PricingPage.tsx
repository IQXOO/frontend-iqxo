"use client";

import { useState, useEffect } from "react";
import { useApp } from "../lib/store";
import { useToast } from "../hooks/use-toast";
import { navigateToPath } from "../lib/navigation";

const _PRICING = {
  monthlyEUR: 9.99,
  yearlyEUR: 79,
};

const _PAYMENT_LINKS = {
  monthly: import.meta.env?.VITE_STRIPE_MONTHLY_LINK,
  yearly: import.meta.env?.VITE_STRIPE_YEARLY_LINK || "",
};

type BillingCycle = "monthly" | "yearly";

const translations = {
  en: {
    experience: "Experience",
    pricing: "Pricing",
    trialBadge: "7 Days of Calm — Free",
    heroH1: "Your mind doesn't need to hold everything anymore.",
    heroClarity: "Voice, photos, notes, and documents — all quietly organized as you go.",
    heroParagraph1: "What you capture stays with you.",
    heroParagraph2: "Without effort. Without thinking.",
    heroCta: "Start 7 Days Free",
    heroCTANote: "30 captures. No card required. Cancel anytime.",
    connector1: "But first, the weight we all carry…",
    problemWhisper: "The Weight",
    problemH2: "You carry too much in your head.",
    problemP1: "Things you meant to remember…",
    problemP2: "ideas, messages, small tasks…",
    problemP3: "They don't disappear — they just pile up.",
    connector2: "What if you could simply… let go?",
    shiftH3: "You stop trying to remember.",
    shiftP: "And start trusting that it's already there.",
    connector3: "This is where IQXO lives…",
    solutionWhisper: "The Relief",
    solutionH2: "IQXO carries it so you don't have to.",
    solutionSub: "Everything you capture finds its place. Your mind stays free for what matters.",
    relief1Title: "Remember less",
    relief1Desc: "Drop anything in — voice, photo, note, document. It stays safe.",
    relief2Title: "Find easily",
    relief2Desc: "Everything is where you expect it. No searching, no folders.",
    relief3Title: "Think clearer",
    relief3Desc: "Your mind isn't cluttered with things to remember. It's just… clear.",
    connector4: "A day with IQXO feels like this…",
    expWhisper: "The Flow",
    expH2: "A calmer way to move through your day.",
    exp1Title: "Capture",
    exp1Desc: "Speak, snap, write, or upload. Whatever feels natural in the moment.",
    exp2Title: "Release",
    exp2Desc: "It quietly becomes organized for you. No steps. No thinking. No effort.",
    exp3Title: "Be present",
    exp3Desc: "Everything stays where it should be. Your day stays clear. Your mind stays free.",
    breathH2: "A simpler way to move through your day.",
    breathP: "Less noise. Less thinking. More clarity.",
    connector5: "Some moments deserve more…",
    premiumH2: "A more comfortable way to live your day.",
    premiumP: "Everything you capture stays organized automatically — so your mind can stay free.",
    connector6: "Upgrading your day…",
    pricingWhisper: "Choose Your Pace",
    pricingH2: "Start free. Upgrade when you're ready.",
    pricingSub: "Start free. Upgrade when you need more. No hidden fees, ever.",
    trialLabel: "7 Days of Calm",
    trialTitle: "Free Trial",
    trialSubtitle: "Feel the difference. No commitment.",
    trialLimitNum1: "30",
    trialLimitLabel1: "Total captures",
    trialLimitNum2: "7",
    trialLimitLabel2: "Days",
    trialLimitNum3: "All",
    trialLimitLabel3: "Features",
    trialLimitNum4: "0",
    trialLimitLabel4: "Card needed",
    trialCta: "Start Free Trial",
    trialNote: "Voice, photos, notes, documents — try everything.",
    proLabel: "Upgrade to Pro",
    monthlyText: "Monthly",
    yearlyText: "Yearly",
    yearlySavings: "-34%",
    monthlyAmount: "€9",
    monthlyAmountSpan: ".99",
    monthlyPeriod: "per month",
    yearlyAmount: "€79",
    yearlyPeriod: "per year",
    yearlySavingsText: "Save €40.88 vs monthly",
    feature1: "Unlimited captures",
    feature2: "All features unlocked",
    feature3: "Cancel anytime",
    feature4: "30-day money-back guarantee",
    proCtaMonthly: "Upgrade to Pro",
    proCtaYearly: "Commit to Pro",
    proGuarantee: "No questions asked. Full refund within 30 days.",
    freeTierPart1: "After your 7-day trial, continue Free with 10 captures/month.",
    freeTierPart2: "No credit card required. Upgrade anytime.",
    ctaFinalH2: "Let your day take care of itself.",
    ctaFinalBtn: "Start 7 Days Free",
    ctaFinalNote: "30 captures. No card. No strings.",
    footerTagline: "Let your day take care of itself.",
  },
  fr: {
    experience: "Expérience",
    pricing: "Tarifs",
    trialBadge: "7 Jours de Calme — Gratuit",
    heroH1: "Votre esprit n'a plus besoin de tout retenir.",
    heroClarity: "Voix, photos, notes et documents — tout s'organise tranquillement au fur et à mesure.",
    heroParagraph1: "Ce que vous capturez reste avec vous.",
    heroParagraph2: "Sans effort. Sans y penser.",
    heroCta: "Commencer 7 Jours Gratuits",
    heroCTANote: "30 captures. Pas de carte requise. Annulation à tout moment.",
    connector1: "Mais d'abord, le poids que nous portons tous…",
    problemWhisper: "Le Poids",
    problemH2: "Vous portez trop de choses dans votre tête.",
    problemP1: "Les choses que vous vouliez retenir…",
    problemP2: "idées, messages, petites tâches…",
    problemP3: "Elles ne disparaissent pas — elles s'accumulent.",
    connector2: "Et si vous pouviez simplement… lâcher prise ?",
    shiftH3: "Vous arrêtez d'essayer de vous souvenir.",
    shiftP: "Et commencez à faire confiance que c'est déjà là.",
    connector3: "C'est ici qu'IQXO vit…",
    solutionWhisper: "Le Soulagement",
    solutionH2: "IQXO porte ça pour que vous n'ayez pas à le faire.",
    solutionSub: "Tout ce que vous capturez trouve sa place. Votre esprit reste libre pour l'essentiel.",
    relief1Title: "Moins se souvenir",
    relief1Desc: "Déposez n'importe quoi — voix, photo, note, document. Ça reste en sécurité.",
    relief2Title: "Trouver facilement",
    relief2Desc: "Tout est là où vous l'attendez. Pas de recherche, pas de dossiers.",
    relief3Title: "Penser plus clair",
    relief3Desc: "Votre esprit n'est pas encombré de choses à retenir. Il est juste… clair.",
    connector4: "Une journée avec IQXO ressemble à ça…",
    expWhisper: "Le Flux",
    expH2: "Une façon plus calme de traverser votre journée.",
    exp1Title: "Capturer",
    exp1Desc: "Parlez, photographiez, écrivez ou téléchargez. Ce qui vous semble naturel.",
    exp2Title: "Libérer",
    exp2Desc: "Ça s'organise tranquillement pour vous. Pas d'étapes. Pas de réflexion. Pas d'effort.",
    exp3Title: "Être présent",
    exp3Desc: "Tout reste là où il devrait être. Votre journée reste claire. Votre esprit reste libre.",
    breathH2: "Une façon plus simple de traverser votre journée.",
    breathP: "Moins de bruit. Moins de pensées. Plus de clarté.",
    connector5: "Certains moments méritent plus…",
    premiumH2: "Une façon plus confortable de vivre votre journée.",
    premiumP: "Tout ce que vous capturez reste organisé automatiquement — pour que votre esprit reste libre.",
    connector6: "Améliorer votre journée…",
    pricingWhisper: "Choisissez Votre Rythme",
    pricingH2: "Commencez gratuitement. Passez Pro quand vous êtes prêt.",
    pricingSub: "Commencez gratuitement. Passez Pro quand vous en avez besoin. Aucun frais caché, jamais.",
    trialLabel: "7 Jours de Calme",
    trialTitle: "Essai Gratuit",
    trialSubtitle: "Sentez la différence. Sans engagement.",
    trialLimitNum1: "30",
    trialLimitLabel1: "Captures totales",
    trialLimitNum2: "7",
    trialLimitLabel2: "Jours",
    trialLimitNum3: "Tout",
    trialLimitLabel3: "Fonctionnalités",
    trialLimitNum4: "0",
    trialLimitLabel4: "Carte requise",
    trialCta: "Commencer l'Essai Gratuit",
    trialNote: "Voix, photos, notes, documents — essayez tout.",
    proLabel: "Améliorez Votre Journée",
    monthlyText: "Monthly",
    yearlyText: "Yearly",
    yearlySavings: "-34%",
    monthlyAmount: "9",
    monthlyAmountSpan: ",99 €",
    monthlyPeriod: "par mois",
    yearlyAmount: "79",
    yearlyPeriod: "par an",
    yearlySavingsText: "Économisez 40,88 € vs mensuel",
    feature1: "Captures illimitées",
    feature2: "Toutes les fonctionnalités débloquées",
    feature3: "Annulation à tout moment",
    feature4: "Garantie 30 jours remboursement",
    proCtaMonthly: "Passer au Pro",
    proCtaYearly: "S'Engager au Pro",
    proGuarantee: "Sans questions. Remboursement complet sous 30 jours.",
    freeTierPart1: "Après votre essai de 7 jours, continuez Gratuit avec 10 captures/mois.",
    freeTierPart2: "Pas de carte de crédit requise. Passez Pro à tout moment.",
    ctaFinalH2: "Laissez votre journée se gérer toute seule.",
    ctaFinalBtn: "Commencer 7 Jours Gratuits",
    ctaFinalNote: "30 captures. Pas de carte. Pas d'engagement.",
    footerTagline: "Laissez votre journée se gérer toute seule.",
  },
};

export default function PricingPage() {
  const { user: _user, planStatus: _planStatus, trialEndsAt: _trialEndsAt, setPlanStatus: _setPlanStatus } = useApp();
  const { toast: _toast } = useToast();
  const [scrolled, setScrolled] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [pageLang, setPageLang] = useState<"en" | "fr">("en");
  const [_trialError, _setTrialError] = useState<string | null>(null);

  const _trialActive = _planStatus === "free_trial" && _trialEndsAt && _trialEndsAt > new Date();
  const t = translations[pageLang];

  useEffect(() => {
    const stored = localStorage.getItem("iqxo-pricing-lang");
    if (stored === "en" || stored === "fr") {
      setPageLang(stored);
    }
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled((prev) => {
            const isScrolled = window.scrollY > 50;
            return prev === isScrolled ? prev : isScrolled;
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLanguageChange = (lang: "en" | "fr") => {
    setPageLang(lang);
    localStorage.setItem("iqxo-pricing-lang", lang);
  };

  const handleSubscribe = (_cycle: BillingCycle) => {
    navigateToPath("/login");
  };

  const handleTrial = async () => {
    navigateToPath("/login");
  };

  return (
    <div style={{ background: "#0C0C0E", color: "#E8E8E8", overflowX: "hidden", minHeight: "100vh" }}>
      {/* Ambient backgrounds */}
      <div style={{ position: "fixed", pointerEvents: "none", zIndex: 0, overflow: "hidden", inset: 0 }}>
        <div style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "rgba(91, 192, 222, 0.08)",
          filter: "blur(120px)",
          opacity: 0.25,
          top: "-15%",
          left: "-15%",
          animation: "drift 25s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "rgba(212, 168, 83, 0.08)",
          filter: "blur(120px)",
          opacity: 0.25,
          bottom: "10%",
          right: "-15%",
          animation: "drift 30s ease-in-out infinite reverse",
        }} />
      </div>

      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-30px) scale(1.05); }
          66% { transform: translate(-20px,20px) scale(0.95); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @media (max-width: 768px) {
          .nav-link {
            display: none !important;
          }
        }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        padding: "20px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 100,
        transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
        background: scrolled ? "rgba(12,12,14,0.6)" : "transparent",
        backdropFilter: scrolled ? "blur(40px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.04)" : "none",
      }}>
        <div style={{ fontSize: "1.05rem", fontWeight: "500", letterSpacing: "-0.01em" }}>
          IQ<span style={{ color: "#5BC0DE" }}>X</span>O
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <a href="#experience" className="nav-link" style={{ fontSize: "0.8rem", color: "#6E6E78", textDecoration: "none", transition: "color 0.6s ease" }}>
            {t.experience}
          </a>
          <a href="#pricing" className="nav-link" style={{ fontSize: "0.8rem", color: "#6E6E78", textDecoration: "none", transition: "color 0.6s ease" }}>
            {t.pricing}
          </a>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "#161618",
            border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: "100px",
            padding: "3px",
            marginLeft: "24px",
          }}>
            <button
              onClick={() => handleLanguageChange("en")}
              style={{
                background: pageLang === "en" ? "#18181A" : "transparent",
                border: pageLang === "en" ? "1px solid rgba(255,255,255,0.08)" : "none",
                color: pageLang === "en" ? "#A0A0A8" : "#6E6E78",
                padding: "6px 14px",
                borderRadius: "100px",
                fontSize: "0.75rem",
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "all 0.4s ease",
                fontWeight: "500",
                letterSpacing: "0.02em",
              }}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageChange("fr")}
              style={{
                background: pageLang === "fr" ? "#18181A" : "transparent",
                border: pageLang === "fr" ? "1px solid rgba(255,255,255,0.08)" : "none",
                color: pageLang === "fr" ? "#A0A0A8" : "#6E6E78",
                padding: "6px 14px",
                borderRadius: "100px",
                fontSize: "0.75rem",
                fontFamily: "inherit",
                cursor: "pointer",
                transition: "all 0.4s ease",
                fontWeight: "500",
                letterSpacing: "0.02em",
              }}
            >
              FR
            </button>
          </div>
        </div>
      </nav>

      <main style={{ position: "relative", zIndex: 1 }}>
        {/* HERO */}
        <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 0 80px" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ maxWidth: "540px" }}>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#6E6E78", marginBottom: "48px", fontWeight: "400", opacity: 0.6 }}>
                IQXO
              </div>

              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(91, 192, 222, 0.08)",
                border: "1px solid rgba(91,192,222,0.12)",
                color: "#5BC0DE",
                padding: "10px 20px",
                borderRadius: "100px",
                fontSize: "0.8rem",
                marginBottom: "32px",
                fontWeight: "400",
                letterSpacing: "0.02em",
              }}>
                <span style={{
                  width: "6px",
                  height: "6px",
                  background: "#5BC0DE",
                  borderRadius: "50%",
                  animation: "pulse-dot 2s ease-in-out infinite",
                }} />
                {t.trialBadge}
              </div>

              <h1 style={{
                fontSize: "clamp(1.7rem, 5vw, 2.6rem)",
                fontWeight: 400,
                lineHeight: 1.2,
                letterSpacing: "-0.03em",
                marginBottom: "32px",
              }}>
                Your mind doesn't need to<br />hold <em style={{ fontStyle: "italic", color: "#5BC0DE", fontWeight: 300 }}>everything</em> anymore.
              </h1>

              <div style={{
                fontSize: "clamp(0.9rem, 2vw, 1rem)",
                color: "#A0A0A8",
                lineHeight: 1.7,
                fontWeight: 300,
                maxWidth: "420px",
                margin: "0 auto 40px",
                opacity: 0.85,
              }}>
                {t.heroClarity}
              </div>

              <div style={{
                fontSize: "clamp(0.9rem, 2vw, 1rem)",
                color: "#6E6E78",
                lineHeight: 2,
                fontWeight: 300,
                maxWidth: "400px",
                margin: "0 auto 48px",
              }}>
                <p>{t.heroParagraph1}</p>
                <p>{t.heroParagraph2}</p>
              </div>

              <button
                onClick={handleTrial}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(91, 192, 222, 0.08)",
                  border: "1px solid rgba(91,192,222,0.15)",
                  color: "#5BC0DE",
                  padding: "14px 32px",
                  borderRadius: "100px",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  transition: "all 0.6s ease",
                  fontWeight: 500,
                  marginBottom: "16px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t.heroCta}
                <span>→</span>
              </button>
              <p style={{ fontSize: "0.75rem", color: "#6E6E78", marginTop: "16px" }}>
                {t.heroCTANote}
              </p>
            </div>
          </div>
        </section>

        {/* CONNECTOR 1 */}
        <div style={{ textAlign: "center", padding: "48px 0", position: "relative" }}>
          <div style={{ width: "1px", height: "48px", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "0 auto 20px" }} />
          <p style={{ fontSize: "0.8rem", color: "#6E6E78", fontWeight: 300, fontStyle: "italic", maxWidth: "360px", margin: "0 auto", lineHeight: 1.8, opacity: 0.7 }}>
            {t.connector1}
          </p>
        </div>

        {/* PROBLEM */}
        <section style={{ padding: "80px 0 40px", textAlign: "center" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#D4A853", marginBottom: "36px", opacity: 0.5 }}>
              {t.problemWhisper}
            </div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 400, lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: "32px" }}>
              {t.problemH2}
            </h2>
            <div style={{ fontSize: "clamp(1rem, 2vw, 1.15rem)", color: "#A0A0A8", lineHeight: 2.2, fontWeight: 300, maxWidth: "460px", margin: "0 auto" }}>
              <p style={{ color: "#6E6E78" }}>{t.problemP1}</p>
              <p style={{ color: "#6E6E78" }}>{t.problemP2}</p>
              <p style={{ color: "#D4A853", opacity: 0.7 }}>{t.problemP3}</p>
            </div>
          </div>
        </section>

        {/* CONNECTOR 2 */}
        <div style={{ textAlign: "center", padding: "48px 0", position: "relative" }}>
          <div style={{ width: "1px", height: "48px", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "0 auto 20px" }} />
          <p style={{ fontSize: "0.8rem", color: "#6E6E78", fontWeight: 300, fontStyle: "italic", maxWidth: "360px", margin: "0 auto", lineHeight: 1.8, opacity: 0.7 }}>
            {t.connector2}
          </p>
        </div>

        {/* SHIFT */}
        <section style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <h3 style={{ fontSize: "clamp(1.3rem, 3.5vw, 1.8rem)", fontWeight: 400, lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: "16px", color: "#A0A0A8" }}>
              {t.shiftH3}
            </h3>
            <p style={{ fontSize: "1rem", color: "#6E6E78", fontWeight: 300, maxWidth: "380px", margin: "0 auto", lineHeight: 1.8 }}>
              {t.shiftP}
            </p>
          </div>
        </section>

        {/* CONNECTOR 3 */}
        <div style={{ textAlign: "center", padding: "48px 0", position: "relative" }}>
          <div style={{ width: "1px", height: "48px", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "0 auto 20px" }} />
          <p style={{ fontSize: "0.8rem", color: "#6E6E78", fontWeight: 300, fontStyle: "italic", maxWidth: "360px", margin: "0 auto", lineHeight: 1.8, opacity: 0.7 }}>
            {t.connector3}
          </p>
        </div>

        {/* SOLUTION */}
        <section style={{ padding: "80px 0 40px", textAlign: "center" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#5BC0DE", marginBottom: "36px", opacity: 0.5 }}>
              {t.solutionWhisper}
            </div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 400, lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: "24px" }}>
              {t.solutionH2}
            </h2>
            <div style={{ fontSize: "clamp(1rem, 2vw, 1.1rem)", color: "#A0A0A8", lineHeight: 1.9, fontWeight: 300, maxWidth: "420px", margin: "0 auto 48px" }}>
              {t.solutionSub}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              maxWidth: "580px",
              margin: "0 auto",
            }}>
              <div style={{
                background: "#161618",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "24px",
                padding: "36px 28px",
                textAlign: "left",
                transition: "all 0.8s ease",
              }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 500, color: "#E8E8E8", marginBottom: "10px", letterSpacing: "-0.01em" }}>
                  {t.relief1Title}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#6E6E78", lineHeight: 1.6, margin: 0 }}>
                  {t.relief1Desc}
                </p>
              </div>

              <div style={{
                background: "#161618",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "24px",
                padding: "36px 28px",
                textAlign: "left",
                transition: "all 0.8s ease",
              }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 500, color: "#E8E8E8", marginBottom: "10px", letterSpacing: "-0.01em" }}>
                  {t.relief2Title}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#6E6E78", lineHeight: 1.6, margin: 0 }}>
                  {t.relief2Desc}
                </p>
              </div>

              <div style={{
                background: "#161618",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "24px",
                padding: "36px 28px",
                textAlign: "left",
                transition: "all 0.8s ease",
              }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 500, color: "#E8E8E8", marginBottom: "10px", letterSpacing: "-0.01em" }}>
                  {t.relief3Title}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#6E6E78", lineHeight: 1.6, margin: 0 }}>
                  {t.relief3Desc}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CONNECTOR 4 */}
        <div style={{ textAlign: "center", padding: "48px 0", position: "relative" }}>
          <div style={{ width: "1px", height: "48px", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "0 auto 20px" }} />
          <p style={{ fontSize: "0.8rem", color: "#6E6E78", fontWeight: 300, fontStyle: "italic", maxWidth: "360px", margin: "0 auto", lineHeight: 1.8, opacity: 0.7 }}>
            {t.connector4}
          </p>
        </div>

        {/* EXPERIENCE */}
        <section id="experience" style={{ padding: "80px 0 40px", textAlign: "center" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#6E6E78", marginBottom: "36px", opacity: 0.5 }}>
              {t.expWhisper}
            </div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 400, lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: "48px" }}>
              {t.expH2}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: "500px", margin: "0 auto" }}>
              <div style={{ padding: "28px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.65rem", color: "#6E6E78", letterSpacing: "0.15em", fontWeight: 500, minWidth: "28px" }}>01</span>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 500, color: "#E8E8E8", letterSpacing: "-0.01em" }}>
                    {t.exp1Title}
                  </h3>
                </div>
                <p style={{ fontSize: "0.9rem", color: "#A0A0A8", lineHeight: 1.7, paddingLeft: "48px", fontWeight: 300 }}>
                  {t.exp1Desc}
                </p>
              </div>

              <div style={{ padding: "28px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.65rem", color: "#6E6E78", letterSpacing: "0.15em", fontWeight: 500, minWidth: "28px" }}>02</span>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 500, color: "#E8E8E8", letterSpacing: "-0.01em" }}>
                    {t.exp2Title}
                  </h3>
                </div>
                <p style={{ fontSize: "0.9rem", color: "#A0A0A8", lineHeight: 1.7, paddingLeft: "48px", fontWeight: 300 }}>
                  {t.exp2Desc}
                </p>
              </div>

              <div style={{ padding: "28px 0", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.65rem", color: "#6E6E78", letterSpacing: "0.15em", fontWeight: 500, minWidth: "28px" }}>03</span>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 500, color: "#E8E8E8", letterSpacing: "-0.01em" }}>
                    {t.exp3Title}
                  </h3>
                </div>
                <p style={{ fontSize: "0.9rem", color: "#A0A0A8", lineHeight: 1.7, paddingLeft: "48px", fontWeight: 300 }}>
                  {t.exp3Desc}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BREATH */}
        <section style={{ padding: "80px 0", textAlign: "center" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <h2 style={{ fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)", fontWeight: 400, lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: "20px", color: "#A0A0A8" }}>
              {t.breathH2}
            </h2>
            <p style={{ fontSize: "0.95rem", color: "#6E6E78", fontWeight: 300, letterSpacing: "0.02em" }}>
              {t.breathP}
            </p>
          </div>
        </section>

        {/* CONNECTOR 5 */}
        <div style={{ textAlign: "center", padding: "48px 0", position: "relative" }}>
          <div style={{ width: "1px", height: "48px", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "0 auto 20px" }} />
          <p style={{ fontSize: "0.8rem", color: "#6E6E78", fontWeight: 300, fontStyle: "italic", maxWidth: "360px", margin: "0 auto", lineHeight: 1.8, opacity: 0.7 }}>
            {t.connector5}
          </p>
        </div>

        {/* PREMIUM */}
        <section style={{ padding: "80px 0 40px" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.005))",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "32px",
              padding: "64px 40px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "28px", opacity: 0.35 }}>◆</div>
              <h2 style={{ fontSize: "clamp(1.4rem, 3.5vw, 1.9rem)", fontWeight: 400, lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: "20px" }}>
                {t.premiumH2}
              </h2>
              <p style={{ fontSize: "0.95rem", color: "#A0A0A8", lineHeight: 1.8, maxWidth: "400px", margin: "0 auto", fontWeight: 300 }}>
                {t.premiumP}
              </p>
            </div>
          </div>
        </section>

        {/* CONNECTOR 6 */}
        <div style={{ textAlign: "center", padding: "48px 0", position: "relative" }}>
          <div style={{ width: "1px", height: "48px", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)", margin: "0 auto 20px" }} />
          <p style={{ fontSize: "0.8rem", color: "#6E6E78", fontWeight: 300, fontStyle: "italic", maxWidth: "360px", margin: "0 auto", lineHeight: 1.8, opacity: 0.7 }}>
            {t.connector6}
          </p>
        </div>

        {/* PRICING */}
        <section id="pricing" style={{ padding: "80px 0 60px", textAlign: "center" }}>
          <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#6E6E78", marginBottom: "36px", opacity: 0.5 }}>
              {t.pricingWhisper}
            </div>
            <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 400, lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: "48px" }}>
              {t.pricingH2}
            </h2>
            <p style={{ fontSize: "0.95rem", color: "#A0A0A8", textAlign: "center", maxWidth: "360px", margin: "0 auto 40px", fontWeight: 300, lineHeight: 1.7 }}>
              {t.pricingSub}
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
              maxWidth: "900px",
              margin: "0 auto",
            }}>
              {/* TRIAL CARD */}
              <div style={{
                background: "linear-gradient(180deg, rgba(91,192,222,0.08), rgba(91,192,222,0.02))",
                border: "1px solid rgba(91,192,222,0.1)",
                borderRadius: "32px",
                padding: "44px 32px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "linear-gradient(90deg, transparent, #5BC0DE, transparent)",
                  opacity: 0.3,
                }} />
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#5BC0DE", marginBottom: "20px", fontWeight: 500, opacity: 0.8 }}>
                  {t.trialLabel}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 400, color: "#E8E8E8", marginBottom: "8px", letterSpacing: "-0.02em" }}>
                  {t.trialTitle}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#A0A0A8", marginBottom: "32px", fontWeight: 300 }}>
                  {t.trialSubtitle}
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "12px",
                  marginBottom: "32px",
                  textAlign: "left",
                }}>
                  <div style={{
                    background: "rgba(91,192,222,0.04)",
                    border: "1px solid rgba(91,192,222,0.06)",
                    borderRadius: "16px",
                    padding: "16px",
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 300, color: "#5BC0DE", lineHeight: 1, marginBottom: "6px" }}>
                      {t.trialLimitNum1}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6E6E78" }}>
                      {t.trialLimitLabel1}
                    </div>
                  </div>

                  <div style={{
                    background: "rgba(91,192,222,0.04)",
                    border: "1px solid rgba(91,192,222,0.06)",
                    borderRadius: "16px",
                    padding: "16px",
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 300, color: "#5BC0DE", lineHeight: 1, marginBottom: "6px" }}>
                      {t.trialLimitNum2}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6E6E78" }}>
                      {t.trialLimitLabel2}
                    </div>
                  </div>

                  <div style={{
                    background: "rgba(91,192,222,0.04)",
                    border: "1px solid rgba(91,192,222,0.06)",
                    borderRadius: "16px",
                    padding: "16px",
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 300, color: "#5BC0DE", lineHeight: 1, marginBottom: "6px" }}>
                      {t.trialLimitNum3}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6E6E78" }}>
                      {t.trialLimitLabel3}
                    </div>
                  </div>

                  <div style={{
                    background: "rgba(91,192,222,0.04)",
                    border: "1px solid rgba(91,192,222,0.06)",
                    borderRadius: "16px",
                    padding: "16px",
                  }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 300, color: "#5BC0DE", lineHeight: 1, marginBottom: "6px" }}>
                      {t.trialLimitNum4}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6E6E78" }}>
                      {t.trialLimitLabel4}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleTrial}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "rgba(91, 192, 222, 0.08)",
                    border: "1px solid rgba(91,192,222,0.15)",
                    color: "#5BC0DE",
                    padding: "16px",
                    borderRadius: "100px",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.02em",
                    transition: "all 0.6s ease",
                  }}
                >
                  {t.trialCta}
                </button>
                <p style={{ marginTop: "16px", fontSize: "0.75rem", color: "#6E6E78" }}>
                  {t.trialNote}
                </p>
              </div>

              {/* PRO CARD WITH TOGGLE */}
              <div style={{
                background: "#18181A",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "32px",
                padding: "44px 32px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "linear-gradient(90deg, transparent, #D4A853, #5BC0DE, transparent)",
                  opacity: 0.3,
                }} />

                <div style={{ fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#D4A853", marginBottom: "24px", fontWeight: 500, opacity: 0.7 }}>
                  {t.proLabel}
                </div>

                {/* Toggle */}
                <div style={{
                  display: "inline-flex",
                  background: "#161618",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: "100px",
                  padding: "4px",
                  marginBottom: "32px",
                }}>
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    style={{
                      background: billingCycle === "monthly" ? "#18181A" : "transparent",
                      border: billingCycle === "monthly" ? "1px solid rgba(255,255,255,0.08)" : "none",
                      color: billingCycle === "monthly" ? "#A0A0A8" : "#6E6E78",
                      padding: "10px 24px",
                      borderRadius: "100px",
                      fontSize: "0.85rem",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      transition: "all 0.4s ease",
                      fontWeight: 400,
                    }}
                  >
                    {t.monthlyText}
                  </button>
                  <button
                    onClick={() => setBillingCycle("yearly")}
                    style={{
                      background: billingCycle === "yearly" ? "#18181A" : "transparent",
                      border: billingCycle === "yearly" ? "1px solid rgba(255,255,255,0.08)" : "none",
                      color: billingCycle === "yearly" ? "#A0A0A8" : "#6E6E78",
                      padding: "10px 24px",
                      borderRadius: "100px",
                      fontSize: "0.85rem",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      transition: "all 0.4s ease",
                      fontWeight: 400,
                    }}
                  >
                    {t.yearlyText} <span style={{ fontSize: "0.7rem", opacity: 0.7, marginLeft: "4px" }}>{t.yearlySavings}</span>
                  </button>
                </div>

                {/* Subscription Title (Apple Guideline 3.1.2) */}
                <div style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5BC0DE", marginBottom: "6px" }}>
                  {billingCycle === "monthly" ? (pageLang === "fr" ? "IQXO Premium Mensuel" : "IQXO Premium Monthly") : (pageLang === "fr" ? "IQXO Premium Annuel" : "IQXO Premium Yearly")}
                </div>

                {/* Price Display */}
                <div style={{ fontSize: "3rem", fontWeight: 300, color: "#E8E8E8", lineHeight: 1, marginBottom: "8px", letterSpacing: "-0.03em" }}>
                  {billingCycle === "monthly" ? t.monthlyAmount : t.yearlyAmount}
                  <span style={{ fontSize: "1.1rem", color: "#6E6E78", fontWeight: 400 }}>
                    {billingCycle === "monthly" ? t.monthlyAmountSpan : ""}
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6E6E78", marginBottom: "8px" }}>
                  {billingCycle === "monthly" ? t.monthlyPeriod : t.yearlyPeriod}
                </div>
                {billingCycle === "yearly" && (
                  <div style={{ fontSize: "0.8rem", color: "#D4A853", opacity: 0.7, marginBottom: "32px", fontStyle: "italic", fontWeight: 300 }}>
                    {t.yearlySavingsText}
                  </div>
                )}
                {billingCycle === "monthly" && <div style={{ height: "36px" }} />}

                {/* Features */}
                <div style={{ textAlign: "left", marginBottom: "32px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "24px" }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    fontSize: "0.9rem",
                    color: "#A0A0A8",
                  }}>
                    <div style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "rgba(91,192,222,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "#5BC0DE",
                      fontSize: "0.7rem",
                    }}>✓</div>
                    {t.feature1}
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    fontSize: "0.9rem",
                    color: "#A0A0A8",
                  }}>
                    <div style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "rgba(91,192,222,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "#5BC0DE",
                      fontSize: "0.7rem",
                    }}>✓</div>
                    {t.feature2}
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    fontSize: "0.9rem",
                    color: "#A0A0A8",
                  }}>
                    <div style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "rgba(91,192,222,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "#5BC0DE",
                      fontSize: "0.7rem",
                    }}>✓</div>
                    {t.feature3}
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 0",
                    fontSize: "0.9rem",
                    color: "#A0A0A8",
                  }}>
                    <div style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "rgba(91,192,222,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "#5BC0DE",
                      fontSize: "0.7rem",
                    }}>✓</div>
                    {t.feature4}
                  </div>
                </div>

                <button
                  onClick={() => handleSubscribe(billingCycle)}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#A0A0A8",
                    padding: "16px",
                    borderRadius: "100px",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.02em",
                    transition: "all 0.6s ease",
                  }}
                >
                  {billingCycle === "monthly" ? t.proCtaMonthly : t.proCtaYearly}
                </button>
                <div style={{ marginTop: "20px", fontSize: "0.75rem", color: "#6E6E78" }}>
                  {t.proGuarantee}
                </div>

                {/* Apple Guideline 3.1.2 Legal Disclosure & Mandatory Links */}
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                  <p style={{ fontSize: "0.7rem", color: "#6E6E78", lineHeight: 1.5, marginBottom: "10px" }}>
                    {pageLang === "fr"
                      ? "Facturation récurrente. Annulez à tout moment au moins 24h avant la fin de la période dans les paramètres App Store."
                      : "Recurring billing. Cancel anytime at least 24 hours before the end of the current period in App Store Account Settings."}
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px", fontSize: "0.75rem", color: "#A0A0A8" }}>
                    <a href="https://www.iqxo.ai/terms" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "inherit" }}>
                      {pageLang === "fr" ? "Conditions d'utilisation (EULA)" : "Terms of Use (EULA)"}
                    </a>
                    <span style={{ opacity: 0.3 }}>•</span>
                    <a href="https://www.iqxo.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "inherit" }}>
                      {pageLang === "fr" ? "Politique de confidentialité" : "Privacy Policy"}
                    </a>
                  </div>
                </div>
              </div>

              {/* FREE TIER NOTE */}
              <div style={{
                gridColumn: "1 / -1",
                maxWidth: "600px",
                margin: "24px auto 0",
                padding: "20px",
                background: "#161618",
                border: "1px solid rgba(255,255,255,0.04)",
                borderRadius: "16px",
                textAlign: "center",
              }}>
                <p style={{ fontSize: "0.85rem", color: "#A0A0A8", lineHeight: 1.6, marginBottom: "8px" }}>
                  {t.freeTierPart1}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#6E6E78" }}>
                  {t.freeTierPart2}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: "120px 0", textAlign: "center", position: "relative" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <h2 style={{ fontSize: "clamp(1.7rem, 5vw, 2.6rem)", fontWeight: 400, lineHeight: 1.2, letterSpacing: "-0.03em", marginBottom: "36px" }}>
              {t.ctaFinalH2}
            </h2>
            <button
              onClick={handleTrial}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                background: "rgba(91, 192, 222, 0.08)",
                border: "1px solid rgba(91,192,222,0.15)",
                color: "#5BC0DE",
                padding: "16px 40px",
                borderRadius: "100px",
                fontSize: "1rem",
                textDecoration: "none",
                transition: "all 0.6s ease",
                fontWeight: 500,
                marginBottom: "16px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t.ctaFinalBtn}
              <span>→</span>
            </button>
            <p style={{ fontSize: "0.8rem", color: "#6E6E78" }}>
              {t.ctaFinalNote}
            </p>
          </div>
        </section>

        {/* SOCIAL MEDIA CONNECTIONS */}
        <section className="py-10">
          <div className="max-w-xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6">
              <div className="h-[1px] w-10 sm:w-20 bg-gradient-to-r from-transparent via-white/10 to-white/25" />
              <div className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-[0_0_25px_rgba(91,192,222,0.08)] hover:border-[#5BC0DE]/40 transition-all duration-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5BC0DE] animate-pulse shadow-[0_0_8px_#5BC0DE]" />
                <span className="text-xs sm:text-sm font-medium tracking-wide bg-gradient-to-r from-white via-[#E8E8E8] to-[#5BC0DE] bg-clip-text text-transparent">
                  {pageLang === "fr" ? "Restons connectés" : "Let’s stay connected"}
                </span>
              </div>
              <div className="h-[1px] w-10 sm:w-20 bg-gradient-to-l from-transparent via-white/10 to-white/25" />
            </div>
            <div className="inline-flex items-center justify-center gap-7 sm:gap-9 px-8 py-4 rounded-2xl border border-white/5 bg-white/[0.015] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:border-white/10 transition-all duration-300">
              {[
                {
                  name: "Facebook",
                  url: "https://www.facebook.com/profile.php?id=61590836542860",
                  icon: (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.891h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                  )
                },
                {
                  name: "Instagram",
                  url: "https://www.instagram.com/iqxoapp?igsh=bjFzdTBxZjFpNDZj&utm_source=qr",
                  icon: (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                  )
                },
                {
                  name: "TikTok",
                  url: "https://www.tiktok.com/@iqxoapp?is_from_webapp=1&sender_device=pc",
                  icon: (
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  )
                },
                {
                  name: "X (Twitter)",
                  url: "https://x.com/iqxoapp?s=21",
                  icon: (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  )
                }
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="text-[#E8E8E8] dark:text-white hover:text-[#5BC0DE] dark:hover:text-[#5BC0DE] transition-all duration-200 hover:scale-125 active:scale-95"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: "48px 0", borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
          <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 32px" }}>
            <div style={{ fontSize: "1rem", marginBottom: "12px", opacity: 0.25, fontWeight: 500, letterSpacing: "-0.01em" }}>
              IQXO
            </div>
            <p style={{ fontSize: "0.75rem", color: "#6E6E78" }}>
              {t.footerTagline}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
