"use client"

import { motion } from "framer-motion"
import { Zap } from "lucide-react"
import { useApp } from "@/lib/store"
import { getActionsRemaining, getUsagePercentage, isLimitExceeded, isNearLimit } from "@/lib/usage-utils"

export function SmartActionsCard() {
  const { totalUsage, language } = useApp()

  const remaining = getActionsRemaining(totalUsage)
  const percentage = getUsagePercentage(totalUsage)
  const isExceeded = isLimitExceeded(totalUsage)
  const isNear = isNearLimit(totalUsage)
  const isHealthy = percentage <= 30

  // Determine status and colors
  let statusColor = "blue"
  let statusLabel = language === "ar" ? "استخدام صحي" : "Healthy usage"
  let glow = "from-blue-500/20 to-blue-500/5"
  let barGradient = "bg-gradient-to-r from-blue-500 to-cyan-500"
  let iconBg = "bg-blue-500/10"
  let iconColor = "text-blue-400"
  let borderColor = "border-border"

  if (isExceeded) {
    statusColor = "red"
    statusLabel = language === "ar" ? "تم الوصول إلى الحد الأقصى" : "Monthly limit reached"
    glow = "from-red-500/20 to-red-500/5"
    barGradient = "bg-gradient-to-r from-red-500 to-rose-500"
    iconBg = "bg-red-500/10"
    iconColor = "text-red-400"
    borderColor = "border-red-500/30 bg-red-500/5"
  } else if (isNear) {
    statusColor = "amber"
    statusLabel = language === "ar" ? "استخدام معتدل" : "Moderate usage"
    glow = "from-amber-500/20 to-amber-500/5"
    barGradient = "bg-gradient-to-r from-amber-500 to-orange-500"
    iconBg = "bg-amber-500/10"
    iconColor = "text-amber-400"
    borderColor = "border-amber-500/30 bg-amber-500/5"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      className={`relative overflow-hidden ${borderColor}`}
    >
      {/* Animated gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${glow} rounded-2xl`} />

      {/* Glass card */}
      <div className="relative glass rounded-2xl p-6 border border-inherit backdrop-blur-xl">
        {/* Decorative glow blurs */}
        {!isExceeded && (
          <>
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl" />
          </>
        )}

        {/* Header Section */}
        <div className="relative z-10 mb-5">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                <Zap className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {language === "ar" ? "الإجراءات الذكية المتبقية" : "Smart Actions Remaining"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {language === "ar" ? "ميزانية معالجة الذكاء الاصطناعي المتاحة هذا الشهر" : "AI processing budget available this month"}
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              statusColor === "red" ? "bg-red-500/20 text-red-400" :
              statusColor === "amber" ? "bg-amber-500/20 text-amber-400" :
              "bg-emerald-500/20 text-emerald-400"
            }`}>
              {percentage.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Main Display Area */}
        <div className="relative z-10 mb-6">
          <div className="space-y-2">
            {/* Actions Count */}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">{remaining}</span>
              <span className="text-sm text-muted-foreground/70">/ 1000 Actions</span>
            </div>

            {/* Status message */}
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                statusColor === "red" ? "bg-red-400" :
                statusColor === "amber" ? "bg-amber-400" :
                "bg-emerald-400"
              }`} />
              <p className={`text-xs font-medium ${
                statusColor === "red" ? "text-red-400" :
                statusColor === "amber" ? "text-amber-400" :
                "text-emerald-400"
              }`}>
                {statusLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="relative z-10">
          {/* Label and percentage */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground/70">
              {language === "ar" ? "استخدام هذا الشهر" : "Usage this month"}
            </span>
            <span className={`text-xs font-semibold ${
              statusColor === "red" ? "text-red-400" :
              statusColor === "amber" ? "text-amber-400" :
              "text-emerald-400"
            }`}>
              {percentage > 100 ? "100" : percentage.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar with glow effect */}
          <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              className={`h-full ${barGradient} rounded-full shadow-lg ${
                !isExceeded && !isNear ? "shadow-blue-500/50" :
                isNear ? "shadow-amber-500/50" :
                "shadow-red-500/50"
              }`}
            />
          </div>
        </div>

        {/* Additional Info Section */}
        {(isExceeded || isNear || isHealthy) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-5 pt-4 border-t border-white/5"
          >
            {isExceeded ? (
              <div className="text-xs text-red-400/80 leading-relaxed">
                {language === "ar"
                  ? "لقد وصلت إلى حد الميزانية الشهري. يرجى ترقية خطتك أو الانتظار حتى الشهر القادم."
                  : "You've reached your monthly budget limit. Please upgrade your plan or wait until next month."}
              </div>
            ) : isNear ? (
              <div className="text-xs text-amber-400/80 leading-relaxed">
                {language === "ar"
                  ? `متبقي ${remaining} إجراء فقط. استخدم بحكمة أو فكر في الترقية.`
                  : `Only ${remaining} actions left. Use wisely or consider upgrading.`}
              </div>
            ) : (
              <div className="text-xs text-emerald-400/80 leading-relaxed">
                {language === "ar"
                  ? "لديك متسع كبير. استمتع بمعالجة الذكاء الاصطناعي غير المحدودة!"
                  : "You have plenty of room. Enjoy unlimited AI processing!"}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
