"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Crown, Sparkles, Shield, Zap, Infinity, Check, CreditCard, Lock, X } from "lucide-react"
import { useApp } from "@/lib/store"
import { useState } from "react"

interface StripeProPassProps {
  open?: boolean
  onClose?: () => void
}

export function StripeProPass({ open = true, onClose }: StripeProPassProps) {
  const { language } = useApp()
  const isRTL = language === "ar"
  const [isLoading, setIsLoading] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")

  const features = [
    {
      icon: Infinity,
      label: language === "ar" ? "حفظ غير محدود" : "Unlimited Saves",
      description: language === "ar" ? "احفظ كل لحظة" : "Capture every moment",
    },
    {
      icon: Zap,
      label: language === "ar" ? "تحليلات ذكية" : "Smart Analytics",
      description: language === "ar" ? "فهم أعمق لحياتك" : "Deeper insights into your life",
    },
    {
      icon: Shield,
      label: language === "ar" ? "مزامنة متقدمة" : "Priority Sync",
      description: language === "ar" ? "الأمان أولاً دائماً" : "Your data, always secure",
    },
    {
      icon: Sparkles,
      label: language === "ar" ? "ميزات حصرية" : "Exclusive Features",
      description: language === "ar" ? "أول من يجرب الجديد" : "Be first to try new features",
    },
  ]

  const handleCheckout = async () => {
    setIsLoading(true)
    // Simulate Stripe checkout
    await new Promise((r) => setTimeout(r, 2000))
    setIsLoading(false)
    // In production, this would redirect to Stripe
  }

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(" ") : value
  }

  // Format expiry as MM/YY
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4)
    }
    return v
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg bg-background rounded-t-3xl border-t border-border max-h-[90vh] overflow-y-auto ${
            isRTL ? "dir-rtl text-right" : ""
          }`}
        >
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors z-10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {/* Animated gradient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-blue-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative p-6 space-y-6">
            {/* Header */}
            <div className="text-center pt-4">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Number.MAX_SAFE_INTEGER, ease: "easeInOut" }}
                className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 mb-4"
              >
                <Crown className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
              </motion.div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {language === "ar" ? "بطاقة Pro" : "The Pro Pass"}
              </h2>
              <p className="text-white/50 mt-2 text-sm">
                {language === "ar"
                  ? "استثمر في راحة بالك"
                  : "Invest in your peace of mind"}
              </p>
            </div>

            {/* Premium Card with animated border */}
            <div className="relative group">
              {/* Animated gradient border */}
              <motion.div
                className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-30"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 5, repeat: Number.MAX_SAFE_INTEGER, ease: "linear" }}
                style={{ backgroundSize: "200% 200%" }}
              />

              {/* Card content */}
              <div className="relative bg-[#0f0f14] rounded-2xl p-6 space-y-5">
                {/* Price */}
                <div className="text-center">
                  <div className="inline-flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">$9.99</span>
                    <span className="text-white/40 text-sm">
                      /{language === "ar" ? "شهر" : "month"}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {features.map((feature, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500/10">
                        <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white/90">{feature.label}</p>
                        <p className="text-[11px] text-white/40">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mock Stripe Form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-white/40" strokeWidth={1.5} />
                <span className="text-sm text-white/60">
                  {language === "ar" ? "تفاصيل الدفع" : "Payment Details"}
                </span>
              </div>

              {/* Card Number */}
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5">
                  <div className="w-8 h-5 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">VISA</span>
                  </div>
                </div>
              </div>

              {/* Expiry & CVC */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="CVC"
                  maxLength={3}
                  className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Secure badge */}
              <div className="flex items-center justify-center gap-2 text-white/30 text-xs">
                <Lock className="w-3 h-3" strokeWidth={1.5} />
                <span>{language === "ar" ? "مشفر ومحمي بواسطة Stripe" : "Encrypted & secured by Stripe"}</span>
              </div>
            </div>

            {/* CTA Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleCheckout}
              disabled={isLoading || cardNumber.length < 19}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.MAX_SAFE_INTEGER, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>{language === "ar" ? "جاري المعالجة..." : "Processing..."}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                  <span>{language === "ar" ? "احصل على Pro الآن" : "Get Pro Access"}</span>
                </>
              )}
            </motion.button>

            {/* Guarantee */}
            <p className="text-center text-[11px] text-white/30 pb-4">
              {language === "ar"
                ? "7 أيام ضمان استرجاع المال • إلغاء في أي وقت"
                : "7-day money-back guarantee • Cancel anytime"}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
