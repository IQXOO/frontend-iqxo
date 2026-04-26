"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { ProfileIdentityHub } from "@/components/dashboard/profile-identity-hub"
import { useApp } from "@/lib/store"

interface ProfileViewProps {
  onBack?: () => void
}

export function ProfileView({ onBack }: ProfileViewProps) {
  const { language } = useApp()
  const isRTL = language === "ar"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${isRTL ? "dir-rtl" : ""}`}
    >
      {/* Header with back button */}
      {onBack && (
        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
          <button
            onClick={onBack}
            className="glass rounded-lg p-2 hover:bg-white/10 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            {language === "ar" ? "ملفي الشخصي" : "My Profile"}
          </h1>
        </div>
      )}

      {/* Profile content */}
      <ProfileIdentityHub />
    </motion.div>
  )
}
