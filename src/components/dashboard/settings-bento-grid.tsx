"use client"

import { motion } from "framer-motion"
import {
  Palette,
  CreditCard,
  Moon,
  Sun,
  ChevronRight,
  Globe,
  Sparkles,
} from "lucide-react"
import { useApp } from "@/lib/store"
import { shouldShowBillingPopup } from "@/lib/billing-utils"

interface SettingsBentoGridProps {
  onOpenBilling?: () => void
}

export function SettingsBentoGrid({ onOpenBilling }: SettingsBentoGridProps) {
  const {
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    planStatus,
    planResolved,
  } = useApp()
  const isRTL = language === "ar"
  const canOpenBilling = shouldShowBillingPopup(planResolved, planStatus)

  const sections = [
    {
      id: "preferences",
      title: language === "ar" ? "التفضيلات" : "Preferences",
      subtitle: language === "ar" ? "خصص تجربتك" : "Make it yours",
      icon: Palette,
      color: "from-blue-500/15 to-blue-500/5",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      items: [
        {
          icon: theme === "dark" ? Moon : Sun,
          label: language === "ar" ? "المظهر" : "Appearance",
          description:
            theme === "dark"
              ? language === "ar"
                ? "الوضع الداكن"
                : "Dark mode"
              : language === "ar"
                ? "الوضع الفاتح"
                : "Light mode",
          action: (
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
              )}
            </motion.button>
          ),
        },
        {
          icon: Globe,
          label: language === "ar" ? "اللغة" : "Language",
          description:
            language === "ar"
              ? "العربية"
              : language === "fr"
                ? "Francais"
                : "English",
          action: (
            <motion.button
              onClick={toggleLanguage}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-xs font-semibold text-foreground"
            >
              {language.toUpperCase()}
            </motion.button>
          ),
        },
      ],
    },
    {
      id: "billing",
      title: language === "ar" ? "الفواتير" : "Billing",
      subtitle:
        language === "ar" ? "استثمر في راحة بالك" : "Invest in your peace of mind",
      icon: CreditCard,
      color: "from-emerald-500/15 to-emerald-500/5",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      items: [
        {
          icon: Sparkles,
          label:
            !planResolved
              ? language === "ar"
                ? "جارٍ التحقق"
                : "Checking plan"
              : planStatus === "pro"
                ? language === "ar"
                  ? "الخطة الحالية"
                  : "Current Plan"
                : language === "ar"
                  ? "الخطة الحالية"
                  : "Current Plan",
          description:
            !planResolved
              ? language === "ar"
                ? "جارٍ التحقق من خطتك..."
                : "Checking your plan..."
              : planStatus === "pro"
                ? language === "ar"
                  ? "Pro - وصول كامل"
                  : "Pro - Full access"
                : language === "ar"
                  ? "مجاني - ميزات محدودة"
                  : "Free - Limited features",
          action: (
            <motion.button
              onClick={() => {
                if (canOpenBilling) onOpenBilling?.()
              }}
              whileHover={{ scale: canOpenBilling ? 1.02 : 1 }}
              whileTap={{ scale: canOpenBilling ? 0.98 : 1 }}
              disabled={!canOpenBilling}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                canOpenBilling
                  ? "bg-gradient-to-r from-blue-500/80 to-purple-500/80 hover:from-blue-500 hover:to-purple-500 text-white"
                  : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
              }`}
            >
              {planResolved && planStatus === "pro"
                ? language === "ar"
                  ? "نشطة"
                  : "Active"
                : language === "ar"
                  ? "ترقية"
                  : "Upgrade"}
              <ChevronRight className="w-3 h-3" strokeWidth={2} />
            </motion.button>
          ),
        },
      ],
    },
  ]

  return (
    <div className={`px-5 py-6 space-y-5 ${isRTL ? "dir-rtl text-right" : ""}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {language === "ar" ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {language === "ar" ? "اجعل IQXO ملكك" : "Make IQXO truly yours"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sections.map((section, sectionIdx) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIdx * 0.08, duration: 0.5 }}
            className={`glass rounded-2xl p-5 border border-border bg-gradient-to-br ${section.color}`}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${section.iconBg}`}>
                <section.icon className={`w-4 h-4 ${section.iconColor}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">{section.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
              </div>
            </div>

            <div className="space-y-2">
              {section.items.map((item, itemIdx) => (
                <motion.div
                  key={itemIdx}
                  whileHover={{ backgroundColor: "var(--secondary)" }}
                  className="flex items-center justify-between p-3 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div>{item.action}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-6 text-center">
        <p className="text-[11px] text-muted-foreground/60">
          IQXO v1.0.0 • {language === "ar" ? "صنع بحب" : "Made with care"}
        </p>
      </motion.div>
    </div>
  )
}
