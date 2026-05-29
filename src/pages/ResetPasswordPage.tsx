"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import {
  devError,
  devLog,
  devWarn,
  getFriendlyErrorMessage,
  withAsyncDiagnostics,
} from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

type RecoveryState = "checking" | "ready" | "invalid";

function getHashParams(): URLSearchParams {
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function getRecoveryLinkErrorMessage(errorCode: string | null, rawMessage: string | null): string {
  const normalizedCode = (errorCode ?? "").toLowerCase();
  const normalizedMessage = (rawMessage ?? "").toLowerCase();

  if (normalizedCode.includes("otp_expired") || normalizedMessage.includes("expired")) {
    return "Your reset link expired. Request a new one.";
  }

  if (normalizedCode.includes("access_denied") || normalizedMessage.includes("invalid")) {
    return "Your reset link is invalid. Request a new one.";
  }

  return "This reset link is invalid or expired.";
}

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: "Weak", width: "20%", tone: "bg-destructive" };
  if (score <= 3) return { label: "Fair", width: "55%", tone: "bg-amber-500" };
  if (score <= 4) return { label: "Strong", width: "80%", tone: "bg-primary" };
  return { label: "Excellent", width: "100%", tone: "bg-emerald-500" };
}

function getPasswordError(password: string, confirmPassword: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Use a mix of uppercase, lowercase, and numbers.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export default function ResetPasswordPage() {
  const { language } = useApp();
  const { toast } = useToast();
  const isRTL = language === "ar";

  const copy = {
    en: {
      title: "Set a new password",
      subtitle: "Choose a strong password for your IQXO account.",
      readyTitle: "Recovery link ready",
      readySubtitle: "Create a new password to finish securing your account.",
      invalidTitle: "Reset link unavailable",
      invalidSubtitle: "Your reset link expired. Request a new one from sign in.",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      passwordHint: "Use at least 8 characters with uppercase, lowercase, and a number.",
      submit: "Update password",
      updating: "Updating...",
      successTitle: "Password updated",
      successBody: "Your password was updated successfully. Redirecting to the app...",
      successButton: "Continue to IQXO",
      backToSignIn: "Back to sign in",
      requestNewLink: "Request a new reset email",
      validating: "Checking your secure link...",
      validationFailed: "We couldn't verify this reset session.",
      resendHint: "If you still need a link, request another reset email from the login screen.",
    },
    fr: {
      title: "Définir un nouveau mot de passe",
      subtitle: "Choisis un mot de passe solide pour ton compte IQXO.",
      readyTitle: "Lien de récupération prêt",
      readySubtitle: "Crée un nouveau mot de passe pour sécuriser ton compte.",
      invalidTitle: "Lien de réinitialisation indisponible",
      invalidSubtitle: "Le lien a expiré. Demande-en un nouveau depuis la connexion.",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      passwordHint: "Au moins 8 caractères avec majuscules, minuscules et chiffre.",
      submit: "Mettre à jour le mot de passe",
      updating: "Mise à jour...",
      successTitle: "Mot de passe mis à jour",
      successBody: "Ton mot de passe a été mis à jour. Redirection en cours...",
      successButton: "Continuer vers IQXO",
      backToSignIn: "Retour à la connexion",
      requestNewLink: "Demander un nouvel e-mail",
      validating: "Vérification du lien sécurisé...",
      validationFailed: "Impossible de vérifier cette session de récupération.",
      resendHint: "Si besoin, demande un nouveau lien depuis l’écran de connexion.",
    },
    ar: {
      title: "تعيين كلمة مرور جديدة",
      subtitle: "اختر كلمة مرور قوية لحساب IQXO الخاص بك.",
      readyTitle: "رابط الاستعادة جاهز",
      readySubtitle: "أنشئ كلمة مرور جديدة لإكمال تأمين حسابك.",
      invalidTitle: "رابط إعادة التعيين غير متاح",
      invalidSubtitle: "انتهت صلاحية الرابط. اطلب رابطًا جديدًا من شاشة تسجيل الدخول.",
      newPassword: "كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور",
      passwordHint: "استخدم 8 أحرف على الأقل مع أحرف كبيرة وصغيرة ورقم.",
      submit: "تحديث كلمة المرور",
      updating: "جارٍ التحديث...",
      successTitle: "تم تحديث كلمة المرور",
      successBody: "تم تحديث كلمة المرور بنجاح. جارٍ التحويل إلى التطبيق...",
      successButton: "متابعة إلى IQXO",
      backToSignIn: "العودة لتسجيل الدخول",
      requestNewLink: "طلب بريد إعادة تعيين جديد",
      validating: "جارٍ التحقق من الرابط الآمن...",
      validationFailed: "تعذر التحقق من جلسة الاستعادة هذه.",
      resendHint: "إذا لزم الأمر، اطلب رابطًا جديدًا من شاشة تسجيل الدخول.",
    },
  }[language];

  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [sessionNote, setSessionNote] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    let active = true;

    const verifyRecoverySession = async () => {
      setRecoveryState("checking");
      setError(null);

      try {
        const url = new URL(window.location.href);
        const hashParams = getHashParams();
        const urlError =
          url.searchParams.get("error") ||
          url.searchParams.get("error_description") ||
          hashParams.get("error") ||
          hashParams.get("error_description");
        if (urlError) {
          throw new Error(
            getRecoveryLinkErrorMessage(
              url.searchParams.get("error_code") || hashParams.get("error_code"),
              urlError,
            ),
          );
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        let currentSession = data.session;
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const code = url.searchParams.get("code");

        if (!currentSession && accessToken && refreshToken) {
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) throw setSessionError;
          currentSession = sessionData.session;

          const cleanUrl = new URL(window.location.href);
          cleanUrl.hash = "";
          cleanUrl.searchParams.delete("code");
          cleanUrl.searchParams.delete("type");
          cleanUrl.searchParams.delete("error");
          cleanUrl.searchParams.delete("error_code");
          cleanUrl.searchParams.delete("error_description");
          window.history.replaceState(window.history.state, "", cleanUrl.toString());
        }

        if (!currentSession && code) {
          const { data: exchangedData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          currentSession = exchangedData.session;

          const cleanUrl = new URL(window.location.href);
          cleanUrl.hash = "";
          cleanUrl.searchParams.delete("code");
          cleanUrl.searchParams.delete("type");
          cleanUrl.searchParams.delete("error");
          cleanUrl.searchParams.delete("error_code");
          cleanUrl.searchParams.delete("error_description");
          window.history.replaceState(window.history.state, "", cleanUrl.toString());
        }

        if (!active) return;

        if (currentSession) {
          setRecoveryState("ready");
          setSessionNote(currentSession.user.email ?? null);
          devLog("Auth", "Recovery session validated", {
            hasSession: true,
          });
        } else {
          setRecoveryState("invalid");
          setSessionNote(null);
          devWarn("Auth", "Invalid or expired recovery session");
        }
      } catch (sessionError) {
        if (!active) return;
        devError("Auth", "Recovery session validation failed", sessionError);
        setRecoveryState("invalid");
        setSessionNote(null);
        setError(
          getFriendlyErrorMessage(
            sessionError,
            "This reset link is invalid or expired.",
          ),
        );
      }
    };

    verifyRecoverySession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setRecoveryState("ready");
        setSessionNote(session.user.email ?? null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      setPassword("");
      setConfirmPassword("");
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (recoveryState !== "ready") {
      const message = "This reset link is invalid or expired.";
      setError(message);
      toast({
        title: "Reset session unavailable",
        description: message,
        variant: "destructive",
      });
      return;
    }

    const passwordError = getPasswordError(password, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      toast({
        title: "Check your password",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await withAsyncDiagnostics(
        "Auth",
        "update-password",
        async () => {
          const { error: updateError } = await supabase.auth.updateUser({
            password,
          });

          if (updateError) {
            throw updateError;
          }
        },
        {
          method: "POST",
          context: {
            action: "password-reset",
            hasSession: recoveryState === "ready",
          },
          onError: (message, resetError) => {
            const friendlyMessage = getFriendlyErrorMessage(
              resetError,
              message,
            );
            setError(friendlyMessage);
            if (/session|expired|invalid/i.test(friendlyMessage)) {
              setRecoveryState("invalid");
            }
            toast({
              title: "Couldn't update password",
              description: friendlyMessage,
              variant: "destructive",
            });
          },
        },
      );

      devLog("Auth", "Password updated successfully");
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      toast({
        title: copy.successTitle,
        description: "Your password was updated successfully.",
      });

      window.setTimeout(() => {
        window.location.replace("/");
      }, 1600);
    } catch (updateError) {
      devError("Auth", "Password update failed", updateError);
      const friendlyMessage = getFriendlyErrorMessage(
        updateError,
        "This reset link is invalid or expired.",
      );
      setError(friendlyMessage);
      if (/session|expired|invalid/i.test(friendlyMessage)) {
        setRecoveryState("invalid");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (recoveryState === "checking") {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="rounded-2xl bg-primary/10 p-4">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{copy.validating}</h2>
            <p className="text-sm text-muted-foreground">We are preparing your recovery session.</p>
          </div>
        </div>
      );
    }

    if (recoveryState === "invalid") {
      return (
        <div className="space-y-5 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldCheck className="h-7 w-7 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{copy.invalidTitle}</h2>
            <p className="text-sm text-muted-foreground">{error ?? copy.invalidSubtitle}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary/20 p-4 text-left">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">What next</p>
            <p className="mt-2 text-sm text-muted-foreground">{copy.resendHint}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1" onClick={() => window.location.assign("/?forgot=1")}>{copy.requestNewLink}</Button>
            <Button variant="outline" className="flex-1" onClick={() => window.location.assign("/")}>{copy.backToSignIn}</Button>
          </div>
        </div>
      );
    }

    if (success) {
      return (
        <div className="space-y-5 py-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{copy.successTitle}</h2>
            <p className="text-sm text-muted-foreground">{copy.successBody}</p>
          </div>
          <Button className="w-full" onClick={() => window.location.replace("/")}>{copy.successButton}</Button>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="new-password" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {copy.newPassword}
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-12 rounded-xl pl-10 pr-12"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className={`h-full rounded-full ${strength.tone}`}
                initial={false}
                animate={{ width: strength.width }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{strength.label}</span>
          </div>
          <p className="text-xs text-muted-foreground">{copy.passwordHint}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {copy.confirmPassword}
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-12 rounded-xl pl-10 pr-12"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">{copy.validationFailed}</p>
              <p className="text-xs text-destructive/80">{error}</p>
            </div>
          </motion.div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl"
            onClick={() => window.location.assign("/")}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.backToSignIn}
          </Button>
          <Button type="submit" className="h-12 rounded-xl" disabled={loading}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            {loading ? copy.updating : copy.submit}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div
      className={`min-h-screen bg-background flex flex-col items-center justify-center px-5 py-8 ${
        isRTL ? "dir-rtl" : ""
      }`}
    >
      <div className="pointer-events-none fixed -top-32 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">IQXO</h1>
          <p className="text-muted-foreground text-sm mt-1">{copy.subtitle}</p>
        </div>

        <Card className="border-border/70 bg-card/90 shadow-2xl backdrop-blur">
          <CardHeader className="pb-4 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl tracking-tight">
              {recoveryState === "invalid"
                ? copy.invalidTitle
                : success
                  ? copy.successTitle
                  : copy.title}
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              {recoveryState === "invalid"
                ? copy.invalidSubtitle
                : recoveryState === "checking"
                  ? copy.validating
                  : sessionNote
                    ? `${copy.readySubtitle} ${sessionNote}`
                    : copy.readySubtitle}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
