"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LogOut } from "lucide-react";
import { ProfileIdentityHub } from "../components/dashboard/profile-identity-hub";
import { useApp } from "../lib/store";
import { navigateToPath } from "../lib/navigation";

export default function ProfilePage() {
  const { language, signOut, t } = useApp();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isRTL = language === "ar";

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

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

        <div className="px-5 pt-2">
          <motion.button
            onClick={handleLogout}
            disabled={isSigningOut}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/15 transition-colors disabled:opacity-50"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("signingOut")}</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                <span>{t("signOut")}</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
