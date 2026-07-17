"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LogOut, Settings, Info, Trash2, Crown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { ProfileIdentityHub } from "../components/dashboard/profile-identity-hub";
import { useApp } from "../lib/store";
import { navigateToPath } from "../lib/navigation";

export default function ProfilePage() {
  const { language, signOut, t, planStatus } = useApp();
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

  const handleUpgradeClick = () => {
    window.dispatchEvent(new CustomEvent("trigger-paywall"));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`min-h-screen max-w-md mx-auto bg-background ${isRTL ? "dir-rtl" : ""}`}
    >
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-center relative">
        <h1 className="text-lg font-semibold text-foreground">
          {language === "ar" ? "ملفي الشخصي" : language === "fr" ? "Mon Profil" : "My Profile"}
        </h1>
        <motion.button
          onClick={() => navigateToPath("/")}
          className={`absolute ${isRTL ? "left-5" : "right-5"} w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors`}
          whileTap={{ scale: 0.95 }}
          aria-label="Close profile"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      </div>

      <div className="pb-8">
        <ProfileIdentityHub onUpgradeClick={handleUpgradeClick} />

        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">
              {language === "ar" ? "الإعدادات" : language === "fr" ? "Paramètres" : "Settings"}
            </span>
          </div>

          <div className="glass rounded-2xl border border-white/5 overflow-hidden flex flex-col mb-6">
            {/* Upgrade Plan */}
            {planStatus !== "pro" && (
              <button
                onClick={handleUpgradeClick}
                className="px-4 py-3.5 flex items-center justify-between w-full hover:bg-white/5 transition-colors text-left group border-b border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                    <Crown className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {language === "ar" ? "ترقية الحساب إلى Pro" : language === "fr" ? "Passer à Pro" : "Upgrade to Pro"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{language === "ar" ? "ترقية" : language === "fr" ? "Passer à Pro" : "Upgrade"}</span>
              </button>
            )}

            {/* Version Number */}
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground">
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {language === "ar" ? "رقم الإصدار" : language === "fr" ? "Numéro de version" : "Version Number"}
                </span>
              </div>
              <span className="text-sm text-muted-foreground font-mono">1.0.0</span>
            </div>

            {/* Delete Account */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="px-4 py-3.5 flex items-center justify-between w-full hover:bg-white/5 transition-colors text-left group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-rose-500">
                      {language === "ar" ? "حذف الحساب" : language === "fr" ? "Supprimer le compte" : "Delete Account"}
                    </span>
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className={`glass border-white/10 ${isRTL ? "dir-rtl text-right" : ""}`}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {language === "ar" ? "هل أنت متأكد من حذف الحساب؟" : language === "fr" ? "Êtes-vous sûr de vouloir supprimer le compte ?" : "Are you sure you want to delete your account?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {language === "ar" 
                      ? "هذا الإجراء سيؤدي إلى تسجيل خروجك فوراً (في الوقت الحالي)." 
                      : language === "fr"
                      ? "Cette action vous déconnectera immédiatement (pour le moment)."
                      : "This action will log you out immediately (for now)."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className={isRTL ? "flex-row-reverse space-x-reverse sm:justify-start" : ""}>
                  <AlertDialogCancel className="bg-secondary/50 border-white/5 hover:bg-secondary">
                    {language === "ar" ? "إلغاء" : language === "fr" ? "Annuler" : "Cancel"}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-rose-500 hover:bg-rose-600 text-white border-none">
                    {language === "ar" ? "تأكيد الحذف" : language === "fr" ? "Confirmer la suppression" : "Confirm Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

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
                <span>{language === "ar" ? "جاري تسجيل الخروج..." : language === "fr" ? "Déconnexion..." : "Signing out..."}</span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                <span>{language === "ar" ? "تسجيل الخروج" : language === "fr" ? "Se déconnecter" : "Sign out"}</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
