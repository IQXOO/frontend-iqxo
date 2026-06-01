"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/store";
import { navigateToPath } from "../lib/navigation";

interface OnboardingPageProps {
  onDone: () => void;
}

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function OnboardingPage({ onDone }: OnboardingPageProps) {
  const { setLanguage } = useApp();
  const [selectedLang, setSelectedLang] = useState<"fr" | "en">("fr");
  const [splashOneGone, setSplashOneGone] = useState(false);
  const [selectedCard, setSelectedCard] = useState<"fr" | "en">("fr");
  const [isContinuing, setIsContinuing] = useState(false);

  const langs = useMemo(
    () => [
      {
        code: "fr" as const,
        flag: "🇫🇷",
        name: "Français",
        subtitle: "Continuer en français",
      },
      {
        code: "en" as const,
        flag: "🇬🇧",
        name: "English",
        subtitle: "Continue in English",
      },
    ],
    [],
  );

  useEffect(() => {
    const t1 = window.setTimeout(() => setSplashOneGone(true), 2500);
    return () => window.clearTimeout(t1);
  }, []);

  useEffect(() => {
    const browserLang = navigator.language || navigator.userLanguage || "";
    if (browserLang.toLowerCase().startsWith("en")) {
      setSelectedLang("en");
      setSelectedCard("en");
    }
  }, []);

  useEffect(() => {
    const t2 = window.setTimeout(() => setSelectedCard(selectedLang), 0);
    return () => window.clearTimeout(t2);
  }, [selectedLang]);

  const selectLang = (lang: "fr" | "en") => {
    setSelectedLang(lang);
    setSelectedCard(lang);
  };

  const continueToApp = () => {
    if (isContinuing) return;
    setIsContinuing(true);
    setLanguage(selectedLang);
    localStorage.setItem("iqxo-lang", selectedLang);
    onDone();
    navigateToPath("/pricing", { replace: true });
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-[#0C0C0E] text-[#E8E8E8] [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',Roboto,sans-serif]">
      <style>{`
        @keyframes splash1In {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes splash1Out {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.1); pointer-events: none; }
        }
        @keyframes splash2In {
          from { opacity: 0; }
          to { opacity: 1; pointer-events: auto; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loaderFill {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes loaderFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .onboarding-ambient {
          position: fixed;
          pointer-events: none;
          filter: blur(100px);
          opacity: 0.15;
        }
        .onboarding-ambient-1 {
          width: 400px;
          height: 400px;
          background: rgba(91, 192, 222, 0.08);
          border-radius: 9999px;
          top: -10%;
          left: -20%;
        }
        .onboarding-ambient-2 {
          width: 300px;
          height: 300px;
          background: rgba(212, 168, 83, 0.08);
          border-radius: 9999px;
          bottom: -5%;
          right: -20%;
        }
      `}</style>

      <div className="onboarding-ambient onboarding-ambient-1" />
      <div className="onboarding-ambient onboarding-ambient-2" />

      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0C0C0E] ${splashOneGone ? "pointer-events-none" : ""}`}
        style={{
          animation: splashOneGone ? `splash1Out 0.8s ${ease} forwards` : undefined,
        }}
      >
        <div
          className="text-[3.5rem] font-semibold tracking-[-0.02em] opacity-0"
          style={{ animation: `splash1In 0.8s ${ease} 0.3s forwards` }}
        >
          IQ<span className="text-[#5BC0DE]">X</span>O
        </div>
        <p
          className="mt-4 text-[0.9rem] font-light text-[#6E6E78] opacity-0"
          style={{ animation: `splash1In 0.8s ${ease} 0.6s forwards` }}
        >
          Votre esprit n'a pas besoin de tout retenir.
        </p>
        <div
          className="mt-8 h-[2px] w-10 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)] opacity-0"
          style={{ animation: `loaderFade 0.5s ${ease} 1s forwards` }}
        >
          <div
            className="h-full w-full bg-[#5BC0DE]"
            style={{ animation: `loaderFill 1.5s ${ease} 1s forwards` }}
          />
        </div>
      </div>

      <div
        className="fixed inset-0 z-[50] flex flex-col items-center justify-center bg-[#0C0C0E] px-6 opacity-0"
        style={{
          animation: `splash2In 0.8s ${ease} 2.8s forwards`,
        }}
      >
        <div className="mb-3 text-[2.5rem] font-semibold tracking-[-0.02em] opacity-80">
          IQ<span className="text-[#5BC0DE]">X</span>O
        </div>
        <p className="mb-12 text-center text-[0.85rem] font-light text-[#6E6E78]">
          Votre esprit n'a pas besoin de tout retenir.
        </p>

        <div className="mb-8 flex w-full max-w-[340px] flex-col gap-3 opacity-0" style={{ animation: `fadeUp 0.6s ${ease} 3.2s forwards` }}>
          {langs.map((lang) => {
            const active = selectedCard === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => selectLang(lang.code)}
                className={`relative flex items-center gap-4 rounded-[24px] border-2 px-6 py-5 text-left transition-all duration-300 ${
                  active
                    ? "border-[rgba(91,192,222,0.3)] bg-[rgba(91,192,222,0.08)]"
                    : "border-[rgba(255,255,255,0.04)] bg-[#161618] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)]"
                }`}
              >
                <span className="text-[2rem]">{lang.flag}</span>
                <span className="flex-1">
                  <span className="block text-[1.1rem] font-medium text-[#E8E8E8]">{lang.name}</span>
                  <span className="block text-[0.85rem] font-light text-[#6E6E78]">{lang.subtitle}</span>
                </span>
                {active ? <span className="text-[1.2rem] text-[#5BC0DE]">✓</span> : null}
              </button>
            );
          })}
        </div>

        <div className="mb-8 flex w-full max-w-[340px] gap-3 opacity-0" style={{ animation: `fadeUp 0.6s ${ease} 3.4s forwards` }}>
          <button
            type="button"
            onClick={continueToApp}
            disabled={isContinuing}
            className="flex-1 rounded-full border border-[rgba(91,192,222,0.15)] bg-[rgba(91,192,222,0.08)] px-5 py-4 text-[1rem] font-medium tracking-[0.02em] text-[#5BC0DE] transition-all duration-300 hover:border-[rgba(91,192,222,0.3)] hover:bg-[rgba(91,192,222,0.1)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selectedLang === "fr" ? "Continuer" : "Continue"}
          </button>
        </div>

        <div className="fixed bottom-6 text-center opacity-0" style={{ animation: `fadeUp 0.6s ${ease} 3.6s forwards` }}>
          <div className="text-[0.9rem] font-medium text-[#E8E8E8] opacity-15">
            IQ<span className="text-[#5BC0DE]">X</span>O
          </div>
        </div>
      </div>
    </div>
  );
}
