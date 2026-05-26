"use client";

import { motion } from "framer-motion";
import { ProfileIdentityHub } from "../components/dashboard/profile-identity-hub";
import { useApp } from "../lib/store";
import { navigateToPath } from "../lib/navigation";

export default function ProfilePage() {
  const { language } = useApp();
  const isRTL = language === "ar";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`min-h-screen max-w-md mx-auto bg-background ${isRTL ? "dir-rtl" : ""}`}
    >
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          {language === "ar" ? "ملفي الشخصي" : "My Profile"}
        </h1>
        <motion.button
          onClick={() => navigateToPath("/")}
          className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          whileTap={{ scale: 0.95 }}
          aria-label="Close profile"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      </div>

      <div className="pb-8">
        <ProfileIdentityHub />
      </div>
    </motion.div>
  );
}
