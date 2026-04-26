"use client";

import { motion } from "framer-motion";
import { Calendar, Zap, Compass, Archive, Briefcase } from "lucide-react";
import { useApp } from "../../lib/store";

export type NavigationTab =
  | "today"
  | "tomorrow"
  | "future"
  | "archive"
  | "schedule";

interface NavigationTabsProps {
  active: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

const TAB_CONFIG = {
  today: {
    icon: Calendar,
    activeClass:
      "bg-blue-500/15 border-blue-400/40 text-blue-600 dark:text-blue-400",
    iconClass: "text-blue-500 dark:text-blue-400",
    dotClass: "bg-blue-500",
  },
  tomorrow: {
    icon: Zap,
    activeClass:
      "bg-amber-500/15 border-amber-400/40 text-amber-600 dark:text-amber-400",
    iconClass: "text-amber-500 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  future: {
    icon: Compass,
    activeClass:
      "bg-violet-500/15 border-violet-400/40 text-violet-600 dark:text-violet-400",
    iconClass: "text-violet-500 dark:text-violet-400",
    dotClass: "bg-violet-500",
  },
  archive: {
    icon: Archive,
    activeClass:
      "bg-emerald-500/15 border-emerald-400/40 text-emerald-600 dark:text-emerald-400",
    iconClass: "text-emerald-500 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  schedule: {
    icon: Briefcase,
    activeClass:
      "bg-blue-500/15 border-blue-400/40 text-blue-600 dark:text-blue-400",
    iconClass: "text-blue-500 dark:text-blue-400",
    dotClass: "bg-blue-500",
  },
};

export function NavigationTabs({ active, onTabChange }: NavigationTabsProps) {
  const { language, t } = useApp();
  const isRTL = language === "ar";

  const tabs: Array<{ id: NavigationTab; label: string }> = [
    { id: "today", label: t("navToday") },
    { id: "tomorrow", label: t("navTomorrow") },
    { id: "future", label: t("navFuture") },
    { id: "schedule", label: t("workSchedule") },
    { id: "archive", label: t("navArchive") },
  ];

  return (
    <div className="px-4 py-3" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex gap-2 bg-secondary/40 dark:bg-white/[0.04] backdrop-blur-xl border border-border rounded-2xl p-1.5">
        {tabs.map((tab) => {
          const config = TAB_CONFIG[tab.id];
          const isActive = active === tab.id;
          const Icon = config.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 relative flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                isActive
                  ? config.activeClass
                  : "border-transparent text-foreground/40 dark:text-white/30 hover:text-foreground/70 dark:hover:text-white/60 hover:bg-secondary/50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className={`absolute inset-0 rounded-xl ${config.activeClass}`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <Icon
                  className={`w-4 h-4 ${isActive ? config.iconClass : "text-foreground/40 dark:text-white/30"}`}
                />
                <span className="leading-none">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
