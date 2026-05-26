"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Sparkles, AlertCircle, X, Send, CheckCircle2 } from "lucide-react";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { buildAppUrl } from "../lib/auth-urls";
import { devError, devLog, getFriendlyErrorMessage, withAsyncDiagnostics } from "../lib/logger";
import { useToast } from "../hooks/use-toast";
import { navigateToPath } from "../lib/navigation";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { signIn, signUp, language, user } = useApp();
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
    if (user) {
      navigateToPath("/", { replace: true });
    }
  }, [user]);

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
        if (!err) {
          setSignupNotice(true);
          toast({
            title: L.checkEmail,
            description: undefined,
          });
        }
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
      <div className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full opacity-20 blur-[120px] bg-primary" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-primary/20"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-7 h-7 text-primary" strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">IQXO</h1>
          <p className="text-sm text-muted-foreground">{L.tagline}</p>
        </div>

        <AnimatePresence mode="wait">
          {!forgotOpen ? (
            <motion.form
              key="auth-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="inline-flex gap-2 w-full mb-6 p-1 bg-secondary/30 rounded-xl">
                <motion.button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                    mode === "signin"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {L.signin}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                    mode === "signup"
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {L.signup}
                </motion.button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              {signupNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-primary">{L.checkEmail}</p>
                </motion.div>
              )}

              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder={L.fullName}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-secondary transition-all"
                    />
                  </div>
                </motion.div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  placeholder={L.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-secondary transition-all"
                  disabled={loading}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder={L.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-secondary/50 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-secondary transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  </div>
                ) : mode === "signin" ? (
                  L.signin
                ) : (
                  L.signup
                )}
              </button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {mode === "signin" ? L.noAccount : L.hasAccount}{" "}
                </span>
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-primary hover:underline font-medium"
                >
                  {mode === "signin" ? L.signupLink : L.signinLink}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {L.forgotPassword}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="forgot-form"
              onSubmit={handleForgotPassword}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {L.forgotTitle}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {L.forgotSubtitle}
              </p>

              {forgotError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{forgotError}</p>
                </motion.div>
              )}

              {forgotSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {L.forgotSuccessTitle}
                    </p>
                    <p className="text-sm text-primary/80 mt-1">
                      {L.forgotSuccessBody}
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  placeholder={L.forgotEmailPlaceholder}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:bg-secondary transition-all"
                  disabled={forgotLoading || forgotSuccess}
                />
              </div>

              <button
                type="submit"
                disabled={forgotLoading || forgotSuccess}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {L.forgotSending}
                  </>
                ) : forgotSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {L.forgotSuccessTitle}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {L.forgotSend}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {L.forgotCancel}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
