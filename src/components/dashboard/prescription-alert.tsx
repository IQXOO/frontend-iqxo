"use client"

import { AlertCircle, Pill, Calendar, MapPin, X } from "lucide-react"
import { useApp } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

interface PrescriptionAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prescription: {
    medicine: string
    dosage: string
    purpose: string
    expirationDaysAgo: number
    imageUrl?: string
  }
}

export function PrescriptionAlert({
  open,
  onOpenChange,
  prescription,
}: PrescriptionAlertProps) {
  const { language, t } = useApp()
  const { toast } = useToast()
  const isRTL = language === "ar"

  if (!open) return null

  const handleOrderRefill = () => {
    toast({
      title: "Refill Requested",
      description: "Your pharmacy will contact you soon.",
    })
    onOpenChange(false)
  }

  const handleRemindLater = () => {
    toast({
      title: "Reminder Set",
      description: "We'll remind you in 7 days.",
    })
    onOpenChange(false)
  }

  const handleAddCalendar = () => {
    toast({
      title: "Added",
      description: "Added to your calendar.",
    })
    onOpenChange(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-3xl overflow-hidden glass backdrop-blur-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 ${
          isRTL ? "direction-rtl" : ""
        }`}
        style={{
          background: "linear-gradient(135deg, rgba(30, 144, 255, 0.05) 0%, rgba(144, 238, 144, 0.05) 100%)",
        }}
      >
        {/* Red Warning Banner */}
        <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 px-6 py-5 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-pattern" />
          <AlertCircle className="w-7 h-7 text-white flex-shrink-0" />
          <div className="flex-1 relative z-10">
            <p className="text-white font-semibold text-lg leading-tight">
              {t("prescriptionExpired")} <span className="text-orange-100">{prescription.expirationDaysAgo} {t("daysAgo")}</span>
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Medicine Details Card */}
        <div className="p-6 space-y-6">
          {/* Medicine Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">{t("medicineName")}</p>
              <p className="text-3xl font-bold text-foreground leading-tight">{prescription.medicine}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <p className="text-xs text-muted-foreground font-semibold mb-1">{t("dosage")}</p>
                <p className="text-lg font-semibold text-foreground">{prescription.dosage}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <p className="text-xs text-muted-foreground font-semibold mb-1">{t("purpose")}</p>
                <p className="text-lg font-semibold text-foreground">{prescription.purpose}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30">
              <p className="text-xs text-muted-foreground font-semibold mb-1">{t("expirationDate")}</p>
              <p className="text-lg font-bold text-red-400 line-through">{prescription.expirationDaysAgo} days ago</p>
            </div>
          </div>

          {/* Smart Action - Primary Button */}
          <div className="space-y-3">
            <button
              onClick={handleOrderRefill}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-lg text-white transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600"
            >
              {t("orderRefillNow")}
            </button>
            <p className="text-center text-xs text-muted-foreground">{t("refillSubtext")}</p>
          </div>

          {/* Secondary Options */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRemindLater}
              className="py-3 px-4 rounded-xl font-medium text-sm text-foreground bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 transform hover:scale-105"
            >
              <Calendar className="w-4 h-4 mx-auto mb-1" />
              {t("remindInTwoDays")}
            </button>
            <button
              onClick={handleAddCalendar}
              className="py-3 px-4 rounded-xl font-medium text-sm text-foreground bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 transform hover:scale-105"
            >
              <MapPin className="w-4 h-4 mx-auto mb-1" />
              {t("addToCalendar")}
            </button>
          </div>

          {/* Bottom Note */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <Pill className="w-4 h-4 inline mr-2 text-blue-400" />
              {t("pharmacyNote")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
