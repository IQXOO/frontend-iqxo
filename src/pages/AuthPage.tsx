"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Sparkles, AlertCircle } from "lucide-react";
import { useApp } from "../lib/store";
import { devError, devLog, getFriendlyErrorMessage } from "../lib/logger";
import { useToast } from "../hooks/use-toast";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const { signIn, signUp, language } = useApp();
  const { toast } = useToast();
  const isRTL = language === "ar";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = {
    en: {
      signin: "Sign In",
      signup: "Create Account",
      email: "Email",
      password: "Password",
      fullName: "Full Name",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      signupLink: "Sign Up",
      signinLink: "Sign In",
      checkEmail: "Account created! Check your email to confirm, then sign in.",
      tagline: "Your intelligent event companion",
    },
    fr: {
      signin: "Se connecter",
      signup: "Créer un compte",
      email: "E-mail",
      password: "Mot de passe",
      fullName: "Nom complet",
      noAccount: "Pas de compte ?",
      hasAccount: "Déjà un compte ?",
      signupLink: "S'inscrire",
      signinLink: "Se connecter",
      checkEmail: "Compte créé ! Vérifiez votre e-mail, puis connectez-vous.",
      tagline: "Votre assistant événementiel intelligent",
    },
    ar: {
      signin: "تسجيل الدخول",
      signup: "إنشاء حساب",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      fullName: "الاسم الكامل",
      noAccount: "ليس لديك حساب؟",
      hasAccount: "لديك حساب بالفعل؟",
      signupLink: "إنشاء حساب",
      signinLink: "تسجيل الدخول",
      checkEmail: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني، ثم سجّل الدخول.",
      tagline: "رفيقك الذكي للأحداث",
    },
  }[language];

  const validateForm = (): string | null => {
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "signup" && /^.{8,}$/.test(password) === false) return "Password must be at least 8 characters.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      toast({
        title: language === "fr" ? "Formulaire incomplet" : language === "ar" ? "النموذج غير مكتمل" : "Please check the form",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      devLog('Auth', mode === "signin" ? 'Login form submitted' : 'Signup form submitted');

      if (mode === "signin") {
        const { error: err } = await signIn(email, password);
        if (err) {
          // Make Supabase error messages more user-friendly
          const message = err.toLowerCase().includes("invalid login")
            ? "Incorrect email or password. Please try again."
            : getFriendlyErrorMessage(err, err);
          setError(message);
          toast({
            title: mode === "signin" ? "Couldn't sign in" : "Couldn't create account",
            description: message,
            variant: "destructive",
          });
        }
      } else {
        const { error: err } = await signUp(email, password, fullName);
        if (err) {
          const message = getFriendlyErrorMessage(err, err);
          setError(message);
          toast({
            title: "Couldn't create account",
            description: message,
            variant: "destructive",
          });
        }
        // No email confirmation — Supabase session fires immediately via onAuthStateChange
      }
    } catch (error) {
      devError('Auth', 'Auth form submission failed', error)
      const message = getFriendlyErrorMessage(error, 'Authentication failed')
      setError(message)
      toast({
        title: mode === "signin" ? "Couldn't sign in" : "Couldn't create account",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen bg-background flex flex-col items-center justify-center px-5 ${
        isRTL ? "dir-rtl" : ""
      }`}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full opacity-20 blur-[120px] bg-primary" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">IQXO</h1>
          <p className="text-muted-foreground text-sm mt-1">{L.tagline}</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-secondary/40 p-1 mb-6">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? L.signin : L.signup}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="fullname"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {L.fullName}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {L.email}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {L.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-secondary/30 border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
                {mode === "signup" && (
                  <p className="mt-1 text-[11px] text-muted-foreground/60 px-1">
                    Minimum 8 characters
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
              >
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive">{error}</p>
              </motion.div>
            )}



            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                />
              ) : (
                mode === "signin" ? L.signin : L.signup
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
