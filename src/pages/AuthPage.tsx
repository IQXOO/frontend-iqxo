"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Sparkles, AlertCircle, X, Send, CheckCircle2 } from "lucide-react";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { buildAppUrl } from "../lib/auth-urls";
import { devError, devLog, getFriendlyErrorMessage, withAsyncDiagnostics } from "../lib/logger";
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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [signupNotice, setSignupNotice] = useState(false);

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
      forgotPassword: "Forgot password?",
      forgotTitle: "Reset your password",
      forgotSubtitle: "We'll send a secure link to your email address.",
      forgotEmailLabel: "Email address",
      forgotEmailPlaceholder: "you@example.com",
      forgotSend: "Send reset link",
      forgotSending: "Sending...",
      forgotSuccessTitle: "Password reset email sent",
      forgotSuccessBody:
        "If that email is registered, check your inbox and spam folder for the reset link.",
      forgotRetry: "Send another link",
      forgotCancel: "Back to sign in",
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
      forgotPassword: "Mot de passe oublié ?",
      forgotTitle: "Réinitialiser le mot de passe",
      forgotSubtitle: "Nous enverrons un lien sécurisé à ton adresse e-mail.",
      forgotEmailLabel: "Adresse e-mail",
      forgotEmailPlaceholder: "vous@exemple.com",
      forgotSend: "Envoyer le lien",
      forgotSending: "Envoi...",
      forgotSuccessTitle: "E-mail de réinitialisation envoyé",
      forgotSuccessBody:
        "Si cet e-mail existe, vérifie ta boîte de réception et les spams.",
      forgotRetry: "Envoyer un autre lien",
      forgotCancel: "Retour à la connexion",
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
      forgotPassword: "هل نسيت كلمة المرور؟",
      forgotTitle: "إعادة تعيين كلمة المرور",
      forgotSubtitle: "سنرسل رابطًا آمنًا إلى بريدك الإلكتروني.",
      forgotEmailLabel: "البريد الإلكتروني",
      forgotEmailPlaceholder: "you@example.com",
      forgotSend: "إرسال رابط إعادة التعيين",
      forgotSending: "جارٍ الإرسال...",
      forgotSuccessTitle: "تم إرسال بريد إعادة التعيين",
      forgotSuccessBody:
        "إذا كان هذا البريد مسجلًا، فتحقق من صندوق الوارد والرسائل غير المرغوب فيها.",
      forgotRetry: "إرسال رابط آخر",
      forgotCancel: "العودة لتسجيل الدخول",
    },
  }[language];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("forgot") === "1") {
      setForgotOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("forgot");
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, []);

  useEffect(() => {
    // clear signup notice when switching modes
    setSignupNotice(false);
  }, [mode]);

  useEffect(() => {
    if (forgotOpen) {
      setForgotEmail(email.trim());
      setForgotError(null);
      setForgotSuccess(false);
    }
  }, [forgotOpen]);

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
        // Show localized instruction to check email for confirmation
        if (!err) {
          setSignupNotice(true);
          toast({
            title: L.checkEmail,
            description: undefined,
          });
        }
        // Note: No email confirmation forced here — Supabase session may fire immediately via onAuthStateChange
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

  const validateForgotEmail = (): string | null => {
    if (!forgotEmail.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const validationError = validateForgotEmail();
    if (validationError) {
      setForgotError(validationError);
      toast({
        title: "Check the email address",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setForgotLoading(true);

    try {
      await withAsyncDiagnostics(
        "Auth",
        "reset-password-request",
        async () => {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            forgotEmail.trim(),
            { redirectTo: buildAppUrl("/reset-password") },
          );

          if (resetError) {
            throw resetError;
          }
        },
        {
          method: "POST",
          context: {
            action: "forgot-password",
            emailDomain: forgotEmail.split("@")[1] ?? "",
          },
          onError: (message, resetError) => {
            const friendlyMessage =
              getFriendlyErrorMessage(resetError, message) ||
              "We couldn't send the reset email right now. Please try again.";
            setForgotError(friendlyMessage);
            toast({
              title: "Couldn't send reset email",
              description: friendlyMessage,
              variant: "destructive",
            });
          },
        },
      );

      devLog("Auth", "Password reset email requested", {
        emailDomain: forgotEmail.split("@")[1] ?? "",
      });
      setForgotSuccess(true);
      toast({
        title: L.forgotTitle,
        description: L.forgotSuccessBody,
      });
    } catch (resetError) {
      devError("Auth", "Password reset email request failed", resetError);
    } finally {
      setForgotLoading(false);
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

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
              {mode === "signin" && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email.trim());
                      setForgotError(null);
                      setForgotSuccess(false);
                      setForgotOpen(true);
                    }}
                    className="text-xs font-medium text-primary/90 transition-colors hover:text-primary"
                  >
                    {L.forgotPassword}
                  </button>
                </div>
              )}
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

            {/* Signup success notice */}
            {signupNotice && mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700">{L.checkEmail}</p>
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

      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (forgotLoading) return;
              setForgotOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
            >
              <div className="relative overflow-hidden border-b border-border bg-secondary/25 px-6 py-5">
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3">
                    <Send className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-foreground">{L.forgotTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{L.forgotSubtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !forgotLoading && setForgotOpen(false)}
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
                    aria-label="Close reset dialog"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-6">
                {forgotSuccess ? (
                  <div className="space-y-5 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-foreground">{L.forgotSuccessTitle}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{L.forgotSuccessBody}</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotSuccess(false);
                          setForgotError(null);
                        }}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        {L.forgotRetry}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForgotOpen(false)}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        {L.forgotCancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} noValidate className="space-y-5">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {L.forgotEmailLabel}
                      </label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(event) => setForgotEmail(event.target.value)}
                        placeholder={L.forgotEmailPlaceholder}
                        autoComplete="email"
                        className="w-full rounded-xl border border-border bg-secondary/25 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary/50 focus:outline-none"
                        disabled={forgotLoading}
                      />
                    </div>

                    {forgotError && (
                      <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="text-sm text-destructive">{forgotError}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setForgotOpen(false)}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                        disabled={forgotLoading}
                      >
                        {L.forgotCancel}
                      </button>
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {forgotLoading ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                          />
                        ) : null}
                        {forgotLoading ? L.forgotSending : L.forgotSend}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
