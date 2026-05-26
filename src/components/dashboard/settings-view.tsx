"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Settings, LogOut, Loader2, X } from "lucide-react";
import { useApp } from "../../lib/store";
import { SettingsBentoGrid } from "./settings-bento-grid";
import { shouldShowBillingPopup } from "@/lib/billing-utils";
import { navigateToPath } from "@/lib/navigation";

type SettingsTab = "settings" | "profile";

interface SettingsViewProps {
  onClose?: () => void;
}

export function SettingsView({ onClose }: SettingsViewProps) {
  const { user, language, t, signOut, planStatus, planResolved } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");
  const [isPending, setIsPending] = useState(false);
  const isRTL = language === "ar";
  const canShowBillingPopup = shouldShowBillingPopup(planResolved, planStatus);

  const handleLogout = async () => {
    setIsPending(true);
    try {
      await signOut();
    } finally {
      setIsPending(false);
    }
  };

  const handleProfileClick = () => {
    onClose?.();
    navigateToPath("/profile");
  };
  const tabs = [
    { id: "settings" as const, label: t("settingsTitle"), icon: Settings },
    { id: "profile" as const, label: t("profile"), icon: User },
  ];

  return (
    <div className={`min-h-full ${isRTL ? "dir-rtl" : ""}`}>
      {/* Header with Close Button */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {t("settingsTitle")}
        </h2>
        <motion.button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          whileTap={{ scale: 0.95 }}
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Tab Switcher */}
      <div className="sticky top-16 z-20 bg-background/60 backdrop-blur-xl border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-secondary/30">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => {
                if (tab.id === "profile") {
                  handleProfileClick();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <tab.icon className="w-4 h-4" strokeWidth={1.5} />
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "settings" && (
            <SettingsBentoGrid
              onOpenBilling={() => {
                if (canShowBillingPopup) {
                  navigateToPath("/pricing");
                }
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Logout Button - Fixed at bottom */}
      <div className="px-5 pb-8">
        <motion.button
          onClick={handleLogout}
          disabled={isPending}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/15 transition-colors disabled:opacity-50"
        >
          {isPending ? (
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
  );
}
