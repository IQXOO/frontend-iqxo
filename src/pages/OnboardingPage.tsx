"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../lib/store";

interface OnboardingPageProps {
  onDone: () => void;
}

export default function OnboardingPage({ onDone }: OnboardingPageProps) {
  const { setLanguage } = useApp();
  const [selected, setSelected] = useState<"en" | "fr" | null>(null);
  const [leaving, setLeaving] = useState(false);

  const handleSelect = (lang: "en" | "fr") => {
    setSelected(lang);
  };

  const handleContinue = () => {
    if (!selected) return;
    setLanguage(selected);
    setLeaving(true);
    setTimeout(onDone, 500);
  };

  const langs = [
    {
      code: "en" as const,
      flag: "🇬🇧",
      name: "English",
      subtitle: "Continue in English",
      dir: "ltr",
    },
    {
      code: "fr" as const,
      flag: "🇫🇷",
      name: "Français",
      subtitle: "Continuer en français",
      dir: "ltr",
    },
    // {
    //   code: "ar" as const,
    //   flag: "🇦🇪",
    //   name: "العربية",
    //   subtitle: "المتابعة بالعربية",
    //   dir: "rtl",
    // },
  ];

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background px-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4 }}
        >
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[300px] w-[300px] rounded-full opacity-20 blur-[100px]"
            style={{ background: "var(--primary)" }}
          />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10 text-center"
          >
            <h1 className="text-5xl font-bold text-foreground tracking-tight font-geometric">
              IQXO
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Choose your language · Choisissez votre langue ·
            </p>
          </motion.div>

          {/* Language cards */}
          <div className="w-full max-w-sm space-y-3">
            {langs.map((lang, i) => (
              <motion.button
                key={lang.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                onClick={() => handleSelect(lang.code)}
                dir={lang.dir}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                  selected === lang.code
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                    : "border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50"
                }`}
              >
                <span className="text-3xl">{lang.flag}</span>
                <div className="flex-1 text-left" dir="ltr">
                  <p
                    className={`text-base font-semibold ${selected === lang.code ? "text-primary" : "text-foreground"}`}
                  >
                    {lang.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lang.subtitle}
                  </p>
                </div>
                {selected === lang.code && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0"
                  >
                    <svg
                      className="h-3 w-3 text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Continue button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: selected ? 1 : 0.4, y: 0 }}
            transition={{ delay: 0.45 }}
            onClick={handleContinue}
            disabled={!selected}
            className="mt-8 w-full max-w-sm py-4 rounded-2xl bg-primary text-primary-foreground text-base font-semibold transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            {selected === "fr" ? "Continuer" : "Continue"}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
