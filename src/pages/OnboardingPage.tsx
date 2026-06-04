"use client";

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";

interface OnboardingPageProps {
  onDone?: () => void;
}

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function OnboardingPage({ onDone }: OnboardingPageProps) {
  const navigate = useNavigate();
  const { setLanguage, setOnboardingDone } = useApp();

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const browserLang = (
      navigator.language ||
      (navigator as any).userLanguage ||
      ""
    ).toLowerCase();
    const lang = browserLang.startsWith("fr") ? "fr" : "en";

    setLanguage(lang);
    localStorage.setItem("iqxo-lang", lang);
    localStorage.setItem("iqxo_intro_dismissed", "1");
    void setOnboardingDone(true);
    onDone?.();

    const timer = window.setTimeout(() => {
      navigate("/pricing", { replace: true });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [navigate, onDone, setLanguage, setOnboardingDone]);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-[#0C0C0E] text-[#E8E8E8] [font-family:'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif]">
      <style>{`
        .splash-ambient {
          position: fixed;
          pointer-events: none;
          filter: blur(100px);
          opacity: 0.15;
        }
        .splash-ambient-1 {
          width: 400px;
          height: 400px;
          background: rgba(91, 192, 222, 0.08);
          border-radius: 9999px;
          top: -10%;
          left: -20%;
        }
        .splash-ambient-2 {
          width: 300px;
          height: 300px;
          background: rgba(212, 168, 83, 0.08);
          border-radius: 9999px;
          bottom: -5%;
          right: -20%;
        }
        @keyframes splashIn {
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashOut {
          to { opacity: 0; transform: scale(1.1); pointer-events: none; }
        }
        @keyframes loaderFade {
          to { opacity: 1; }
        }
        @keyframes loaderFill {
          to { transform: translateX(0); }
        }
        @keyframes footerFade {
          to { opacity: 0.15; }
        }
      `}</style>

      <div className="splash-ambient splash-ambient-1" />
      <div className="splash-ambient splash-ambient-2" />

      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0C0C0E]"
        style={{ animation: `splashOut 0.8s ${ease} 2.5s forwards` }}
      >
        <div
          className="text-[3.5rem] font-semibold tracking-[-0.02em] opacity-0 [transform:scale(0.8)]"
          style={{ animation: `splashIn 0.8s ${ease} 0.3s forwards` }}
        >
          IQ<span className="text-[#5BC0DE]">X</span>O
        </div>

        <p
          className="mt-4 text-[0.9rem] font-light text-[#6E6E78] opacity-0 [transform:translateY(10px)]"
          style={{ animation: `splashIn 0.8s ${ease} 0.6s forwards` }}
        >
          Your mind doesn't need to hold everything.
        </p>

        <div
          className="mt-8 h-[2px] w-10 overflow-hidden rounded-[2px] bg-[rgba(255,255,255,0.04)] opacity-0"
          style={{ animation: `loaderFade 0.5s ${ease} 1s forwards` }}
        >
          <div
            className="h-full w-full bg-[#5BC0DE] [transform:translateX(-100%)]"
            style={{ animation: `loaderFill 1.5s ${ease} 1s forwards` }}
          />
        </div>
      </div>

      <div
        className="fixed bottom-6 text-[0.9rem] font-medium text-[#E8E8E8] opacity-0"
        style={{ animation: `footerFade 0.6s ${ease} 1.5s forwards` }}
      >
        IQ<span className="text-[#5BC0DE]">X</span>O
      </div>
    </div>
  );
}
