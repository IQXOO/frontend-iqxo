"use client"

import { motion } from "framer-motion"
import { Sparkles, Clock, Archive, CalendarCheck, TrendingUp, Heart, Download, Shield, Zap } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useApp } from "@/lib/store"
import { BentoChart } from "./bento-chart"
import { SmartActionsCard } from "./smart-actions-card"
import { exportEventsToPDF } from "@/lib/export-pdf"
import { formatUsageDisplay, getUsagePercentage, isLimitExceeded, isNearLimit } from "@/lib/usage-utils"

export function ProfileIdentityHub() {
  const { user, events, language, planStatus, trialEndsAt, totalUsage } = useApp()
  const isRTL = language === "ar"

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || 
    user?.email?.split("@")[0] || 
    "Friend"

  // Calculate life stats
  const totalEvents = events.length
  const completedEvents = events.filter((e) => new Date(e.date) < new Date()).length
  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date()).length
  const organizationScore = Math.min(100, Math.round((completedEvents / Math.max(totalEvents, 1)) * 100))

  // Calculate hours saved (estimate: 5 mins per event)
  const hoursSaved = Math.round((totalEvents * 5) / 60)

  // Get dynamic title based on engagement
  const getTitle = () => {
    if (totalEvents >= 50) return language === "ar" ? "سيد الاستراتيجية" : "Strategy Master"
    if (totalEvents >= 25) return language === "ar" ? "خبير التنظيم" : "Organization Expert"
    if (totalEvents >= 10) return language === "ar" ? "مخطط بارع" : "Skilled Planner"
    return language === "ar" ? "مستكشف جديد" : "Rising Star"
  }

  // Life Stats grid
  const lifeStats = [
    {
      icon: Archive,
      label: language === "ar" ? "وثائق معالجة" : "Documents Processed",
      value: totalEvents,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-400",
    },
    {
      icon: CalendarCheck,
      label: language === "ar" ? "أحداث مستقبلية" : "Future Events",
      value: upcomingEvents,
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-400",
    },
    {
      icon: Clock,
      label: language === "ar" ? "ذكريات محفوظة" : "Archived Memories",
      value: completedEvents,
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-400",
    },
    {
      icon: TrendingUp,
      label: language === "ar" ? "ساعات موفرة" : "Hours Saved",
      value: `${hoursSaved}h`,
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-400",
    },
  ]

  // Warm, human messages
  const getEncouragingMessage = () => {
    if (hoursSaved >= 5) {
      return language === "ar" 
        ? `لقد وفرت ${hoursSaved} ساعات هذا الأسبوع. أنت رائع!` 
        : `You've saved ${hoursSaved} hours this week. Great job!`
    }
    if (totalEvents >= 10) {
      return language === "ar" 
        ? `${totalEvents} لحظة من حياتك منظمة بعناية. استمر!` 
        : `${totalEvents} moments of your life, beautifully organized. Keep going!`
    }
    return language === "ar" 
      ? `أنت تبني شيئاً مميزاً هنا، يا ${firstName}.` 
      : `You're building something special here, ${firstName}.`
  }

  return (
    <div className={`px-5 py-6 space-y-6 ${isRTL ? "dir-rtl text-right" : ""}`}>
      {/* Glass ID Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden"
      >
        {/* Subtle animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl" />
        
        {/* Card */}
        <div className="relative glass rounded-3xl p-6 border border-border backdrop-blur-xl">
          {/* Decorative blurs */}
          <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

          {/* ID Card Header */}
          <div className="relative z-10 flex items-center gap-4 mb-5">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Avatar className="h-18 w-18 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                <AvatarImage
                  src={`https://api.dicebear.com/9.x/notionists/svg?seed=${firstName}`}
                  alt={firstName}
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-white text-xl font-bold">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{firstName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <p className="text-sm font-medium text-primary">{getTitle()}</p>
              </div>
            </div>
          </div>

          {/* Warm Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 mb-5 p-4 rounded-2xl bg-secondary/30 border border-border"
          >
            <div className="flex items-start gap-3">
              <Heart className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/70 leading-relaxed">
                {getEncouragingMessage()}
              </p>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {language === "ar" ? "معدل التنظيم" : "Organization Score"}
              </span>
              <span className="font-semibold text-blue-400">{organizationScore}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${organizationScore}%` }}
                transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Smart Actions Remaining Card */}
      <SmartActionsCard />

      {/* Life Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {lifeStats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.1, duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`glass rounded-2xl p-4 border border-border bg-gradient-to-br ${stat.color} cursor-default`}
          >
            <stat.icon className={`w-5 h-5 ${stat.iconColor} mb-3`} strokeWidth={1.5} />
            <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Visual Analytics - Bento Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-5 border border-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {language === "ar" ? "تحليلات الإنتاجية" : "Productivity Analytics"}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {language === "ar" ? "نظرة عامة على حياتك المنظمة" : "Overview of your organized life"}
            </p>
          </div>
        </div>
        <BentoChart />
      </motion.div>

      {/* Plan Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="glass rounded-2xl p-5 border border-border"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {planStatus === "pro"
                  ? (language === "ar" ? "Pro" : "Pro Plan")
                  : planStatus === "free_trial"
                  ? (language === "ar" ? "تجربة مجانية" : "Free Trial")
                  : planStatus === "expired"
                  ? (language === "ar" ? "التجربة انتهت" : "Trial Expired")
                  : (language === "ar" ? "لا توجد خطة" : "No Plan")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {planStatus === "free_trial" && trialEndsAt
                  ? (language === "ar"
                      ? `تنتهي ${new Date(trialEndsAt).toLocaleDateString("ar")}`
                      : `Ends ${new Date(trialEndsAt).toLocaleDateString()}`)
                  : planStatus === "pro"
                  ? (language === "ar" ? "وصول كامل" : "Full access")
                  : (language === "ar" ? "اختر خطة للمتابعة" : "Choose a plan to continue")}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            planStatus === "pro"
              ? "bg-emerald-500/20 text-emerald-400"
              : planStatus === "free_trial"
              ? "bg-blue-500/20 text-blue-400"
              : "bg-rose-500/20 text-rose-400"
          }`}>
            {planStatus === "pro" ? "✓ Active" : planStatus === "free_trial" ? "Trial" : "Inactive"}
          </div>
        </div>
      </motion.div>

      {/* Secure Export Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass rounded-2xl p-5 border border-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {language === "ar" ? "النسخ الاحتياطي الآمن" : "Secure Backup"}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {language === "ar" ? "تصدير سجلاتك بأمان" : "Export your records securely"}
            </p>
          </div>
        </div>
        <motion.button
          onClick={() => exportEventsToPDF(events, user?.email)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:from-emerald-500/30 hover:to-blue-500/30 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>{language === "ar" ? "تصدير كـ PDF" : "Export as PDF"}</span>
        </motion.button>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          {language === "ar" 
            ? "يتم تنزيل جميع البيانات محليًا، بدون مشاركة خارجية" 
            : "All data is downloaded locally. No external sharing."}
        </p>
      </motion.div>

      {/* Achievements Teaser */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="glass rounded-2xl p-5 border border-border/50"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {language === "ar" ? "الإنجازات القادمة" : "Achievements Coming Soon"}
          </h3>
          <span className="text-[10px] text-muted-foreground px-2 py-1 rounded-full bg-secondary/50">
            {language === "ar" ? "قريباً" : "Soon"}
          </span>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="h-10 w-10 rounded-xl bg-secondary/30 border border-border flex items-center justify-center text-muted-foreground/50 cursor-pointer hover:bg-secondary/50 transition-colors"
            >
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
