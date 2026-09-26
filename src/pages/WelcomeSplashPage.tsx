"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { ArrowRight } from "lucide-react";

const i18n = {
  fr: {
    splashTagline: "Laissez IQXO retenir ce qui compte pour vous.",
    welcomeTitle: "Simplifions votre journée.",
    welcomeSub: "Laissez IQXO retenir ce qui compte pour vous.",
    btnContinue: "Continuer"
  },
  en: {
    splashTagline: "Let IQXO take care of the things you don't want to forget.",
    welcomeTitle: "Let's make your day easier.",
    welcomeSub: "Let IQXO take care of the things you don't want to forget.",
    btnContinue: "Continue"
  }
};

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

function IQXOIcon({ color = "#5BC0DE", className = "w-7 h-7" }: { color?: string, className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6"/>
      <path d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12Z" stroke={color} strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
    </svg>
  );
}

export default function WelcomeSplashPage() {
  const navigate = useNavigate();
  const { setLanguage } = useApp();
  
  const [step, setStep] = useState(0); // 0 = splash, 1 = welcome
  const [lang, setLang] = useState<'fr' | 'en'>('en');

  useEffect(() => {
    const browserLang = (
      navigator.language ||
      (navigator as Navigator & { userLanguage?: string }).userLanguage ||
      ""
    ).toLowerCase();
    const defaultLang = browserLang.startsWith("fr") ? "fr" : "en";
    setLang(defaultLang);
    setLanguage(defaultLang);
    
    // Splash timer
    const timer = window.setTimeout(() => {
      setStep(1);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [setLanguage]);

  const toggleLanguage = () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    setLang(newLang);
    setLanguage(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("iqxo-lang", newLang);
    }
  };

  const handleNextStep = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("iqxo_intro_dismissed", "1");
    }
    navigate("/login", { replace: true });
  };

  const t = i18n[lang];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0C0C0E] text-[#E8E8E8] [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',Roboto,sans-serif]">
      <style>{`
        .ambient-glow {
          position: absolute; width: 300px; height: 300px;
          background: rgba(91, 192, 222, 0.08); border-radius: 50%;
          filter: blur(90px); pointer-events: none; top: -10%; left: -10%;
        }
        .splash-1 {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; z-index: 100; background: #0C0C0E;
          animation: splash1Out 0.8s ${ease} 2.5s forwards;
        }
        .splash-1 .logo { font-size: 3rem; font-weight: 600; opacity: 0; transform: scale(0.8); animation: splash1In 0.8s ${ease} 0.2s forwards; }
        .splash-1 .logo span { color: #5BC0DE; }
        .splash-1 .tagline { font-size: 0.85rem; color: #6E6E78; margin-top: 12px; font-weight: 300; opacity: 0; transform: translateY(10px); animation: splash1In 0.8s ${ease} 0.5s forwards; }
        .splash-1 .loader { width: 40px; height: 2px; background: rgba(255,255,255,0.06); border-radius: 2px; margin-top: 28px; overflow: hidden; opacity: 0; animation: loaderFade 0.5s ${ease} 0.8s forwards; }
        .splash-1 .loader::after { content: ''; display: block; width: 100%; height: 100%; background: #5BC0DE; transform: translateX(-100%); animation: loaderFill 1.3s ${ease} 0.8s forwards; }
        
        @keyframes splash1In { to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes splash1Out { to { opacity: 0; transform: scale(1.05); pointer-events: none; visibility: hidden; } }
        @keyframes loaderFade { to { opacity: 1; } }
        @keyframes loaderFill { to { transform: translateX(0); } }
        
        .fade-in { animation: fadeIn 0.4s ${ease} forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Container */}
      <div className="w-full max-w-sm h-full max-h-[844px] sm:h-[844px] bg-[#0C0C0E] sm:border border-white/5 sm:rounded-[40px] p-6 flex flex-col justify-between relative overflow-hidden sm:shadow-2xl">
        <div className="ambient-glow" />

        {/* Splash Screen */}
        {step === 0 && (
          <div className="splash-1 sm:rounded-[40px]">
            <div className="logo">IQ<span>X</span>O</div>
            <p className="tagline">{t.splashTagline}</p>
            <div className="loader" />
          </div>
        )}

        {/* Header (visible step 1) */}
        <div className={`flex items-center justify-between h-10 z-10 transition-opacity duration-500 ${step === 1 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-xl font-medium tracking-tight text-[#E8E8E8]">
            IQ<span className="text-[#5BC0DE]">X</span>O
          </div>
          <button 
            type="button" 
            onClick={toggleLanguage}
            className="text-[11px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full text-gray-400 cursor-pointer font-medium hover:text-white transition-all uppercase"
          >
            {lang === 'fr' ? 'FR | en' : 'fr | EN'}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-center z-10 my-auto py-2 fade-in" key={step}>
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#161618] border border-white/5 flex items-center justify-center mx-auto">
                <IQXOIcon color="#5BC0DE" className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-normal text-[#E8E8E8]">{t.welcomeTitle}</h2>
                <p className="text-[#A0A0A8] text-xs leading-relaxed">{t.welcomeSub}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`w-full pt-2 z-10 transition-opacity duration-500 ${step === 1 ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            type="button" 
            onClick={handleNextStep}
            className="w-full h-[52px] bg-[#5BC0DE]/10 hover:bg-[#5BC0DE]/20 border border-[#5BC0DE]/20 text-[#5BC0DE] font-medium rounded-full flex items-center justify-center space-x-2 active:scale-[0.98] transition-all py-3.5 cursor-pointer"
          >
            <span className="text-sm">{t.btnContinue}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
