"use client";

import { useEffect, useState } from "react";
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
  const [mode, setMode] = useState<Mode>("signup"); // default to signup to match template
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
  const [googleLoading, setGoogleLoading] = useState(false);

  const i18n = {
    en: {
      title: 'Create your <em>calm</em> space',
      title_signin: 'Sign in to your <em>calm</em> space',
      subtitle: 'Start free. No card required.',
      subtitle_signin: 'Welcome back.',
      google: 'Continue with Google',
      apple: 'Continue with Apple',
      microsoft: 'Continue with Microsoft',
      divider: 'or',
      passwordPlaceholder: 'Password',
      emailPlaceholder: 'Email',
      fullNamePlaceholder: 'Full Name',
      submit: 'Create account',
      submit_signin: 'Sign in',
      member: 'Already a member?',
      noAccount: "Don't have an account?",
      login: 'Log in',
      signup: 'Sign up',
      terms: 'By continuing, you agree to the',
      and: 'and the',
      footer: "Your mind doesn't need to hold everything.",
      forgotPassword: "Forgot password?",
      forgotTitle: "Reset your password",
      forgotSubtitle: "We'll send a secure link to your email address.",
      forgotEmailPlaceholder: "you@example.com",
      forgotSend: "Send reset link",
      forgotSending: "Sending...",
      forgotSuccessTitle: "Password reset email sent",
      forgotSuccessBody: "If that email is registered, check your inbox and spam folder for the reset link.",
      forgotRetry: "Send another link",
      forgotCancel: "Back to sign in",
      checkEmail: "Account created! Check your email to confirm, then sign in.",
    },
    fr: {
      title: 'Créez votre espace de <em>calme</em>',
      title_signin: 'Connectez-vous à votre espace de <em>calme</em>',
      subtitle: 'Commencez gratuitement. Aucune carte requise.',
      subtitle_signin: 'Bon retour.',
      google: 'Continuer avec Google',
      apple: 'Continuer avec Apple',
      microsoft: 'Continuer avec Microsoft',
      divider: 'ou',
      passwordPlaceholder: 'Mot de passe',
      emailPlaceholder: 'E-mail',
      fullNamePlaceholder: 'Nom complet',
      submit: 'Créer un compte',
      submit_signin: 'Se connecter',
      member: 'Déjà membre ?',
      noAccount: "Pas de compte ?",
      login: 'Se connecter',
      signup: "S'inscrire",
      terms: 'En continuant, vous acceptez les',
      and: 'et la',
      footer: "Votre esprit n'a pas besoin de tout retenir.",
      forgotPassword: "Mot de passe oublié ?",
      forgotTitle: "Réinitialiser le mot de passe",
      forgotSubtitle: "Nous enverrons un lien sécurisé à ton adresse e-mail.",
      forgotEmailPlaceholder: "vous@exemple.com",
      forgotSend: "Envoyer le lien",
      forgotSending: "Envoi...",
      forgotSuccessTitle: "E-mail de réinitialisation envoyé",
      forgotSuccessBody: "Si cet e-mail existe, vérifie ta boîte de réception et les spams.",
      forgotRetry: "Envoyer un autre lien",
      forgotCancel: "Retour à la connexion",
      checkEmail: "Compte créé ! Vérifiez votre e-mail, puis connectez-vous.",
    },
    ar: {
      title: 'أنشئ مساحتك <em>الهادئة</em>',
      title_signin: 'سجل دخولك إلى مساحتك <em>الهادئة</em>',
      subtitle: 'ابدأ مجاناً. لا نطلب بطاقة ائتمانية.',
      subtitle_signin: 'مرحباً بعودتك.',
      google: 'المتابعة مع Google',
      apple: 'المتابعة مع Apple',
      microsoft: 'المتابعة مع Microsoft',
      divider: 'أو',
      passwordPlaceholder: 'كلمة المرور',
      emailPlaceholder: 'البريد الإلكتروني',
      fullNamePlaceholder: 'الاسم الكامل',
      submit: 'إنشاء حساب',
      submit_signin: 'تسجيل الدخول',
      member: 'مشترك بالفعل؟',
      noAccount: 'ليس لديك حساب؟',
      login: 'سجل دخولك',
      signup: 'إنشاء حساب',
      terms: 'بالمتابعة، أنت توافق على',
      and: 'و',
      footer: 'عقلك لا يحتاج إلى الاحتفاظ بكل شيء.',
      forgotPassword: 'هل نسيت كلمة المرور؟',
      forgotTitle: 'إعادة تعيين كلمة المرور',
      forgotSubtitle: 'سنرسل رابطًا آمنًا إلى بريدك الإلكتروني.',
      forgotEmailPlaceholder: 'you@example.com',
      forgotSend: 'إرسال رابط إعادة التعيين',
      forgotSending: 'جارٍ الإرسال...',
      forgotSuccessTitle: 'تم إرسال بريد إعادة التعيين',
      forgotSuccessBody: 'إذا كان هذا البريد مسجلًا، فتحقق من صندوق الوارد والرسائل غير المرغوب فيها.',
      forgotRetry: 'إرسال رابط آخر',
      forgotCancel: 'العودة لتسجيل الدخول',
      checkEmail: 'تم إنشاء الحساب! تحقق من بريدك الإلكتروني، ثم سجّل الدخول.',
    }
  };

  const t = i18n[language === "ar" ? "ar" : language === "fr" ? "fr" : "en"];

  useEffect(() => {
    if (user) {
      navigateToPath("/home", { replace: true });
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
  }, [forgotOpen, email]);

  const validateForm = (): string | null => {
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Please enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
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
      devLog("Auth", mode === "signin" ? "Login form submitted" : "Signup form submitted");

      if (mode === "signin") {
        const { error: err } = await signIn(email, password);
        if (err) {
          const message = err.toLowerCase().includes("invalid login")
            ? "Incorrect email or password. Please try again."
            : getFriendlyErrorMessage(err, err);
          setError(message);
          toast({
            title: "Couldn't sign in",
            description: message,
            variant: "destructive",
          });
        } else {
          sessionStorage.setItem("iqxo_just_signed_in", "1");
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
        } else {
          sessionStorage.setItem("iqxo_just_signed_in", "1");
          setSignupNotice(true);
          toast({
            title: t.checkEmail,
            description: undefined,
          });
        }
      }
    } catch (error) {
      devError("Auth", "Auth form submission failed", error);
      const message = getFriendlyErrorMessage(error, "Authentication failed");
      setError(message);
      toast({
        title: mode === "signin" ? "Couldn't sign in" : "Couldn't create account",
        description: message,
        variant: "destructive",
      });
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      devLog("Auth", "Google OAuth initiated");
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAppUrl("/home"),
        },
      });
      if (oauthError) {
        const message = getFriendlyErrorMessage(oauthError.message, oauthError.message);
        setError(message);
        toast({
          title: "Couldn't sign in with Google",
          description: message,
          variant: "destructive",
        });
      }
    } catch (err) {
      devError("Auth", "Google OAuth failed", err);
      const message = getFriendlyErrorMessage(err, "Google sign-in failed");
      setError(message);
      toast({
        title: "Couldn't sign in with Google",
        description: message,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleUnsupportedOAuth = (provider: string) => {
    toast({
      title: `${provider} Login`,
      description: `${provider} authentication configuration is not active on this environment. Please sign in with Google or Email instead.`,
      variant: "destructive",
    });
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
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
            redirectTo: buildAppUrl("/reset-password"),
          });

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
            const friendlyMessage = getFriendlyErrorMessage(resetError, message) || "We couldn't send the reset email right now. Please try again.";
            setForgotError(friendlyMessage);
            toast({
              title: "Couldn't send reset email",
              description: friendlyMessage,
              variant: "destructive",
            });
          },
        }
      );

      devLog("Auth", "Password reset email requested");
      setForgotSuccess(true);
      toast({
        title: t.forgotTitle,
        description: t.forgotSuccessBody,
      });
    } catch (resetError) {
      devError("Auth", "Password reset email request failed", resetError);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className={`login-body ${isRTL ? "dir-rtl" : ""}`}>
      <style>{`
        :root {
            --bg: #0C0C0E;
            --bg-elevated: #121214;
            --bg-card: #161618;
            --bg-input: #1A1A1C;
            --text: #E8E8E8;
            --text-soft: #A0A0A8;
            --text-muted: #6E6E78;
            --text-faded: #4A4A52;
            --cyan: #5BC0DE;
            --cyan-soft: rgba(91, 192, 222, 0.08);
            --cyan-glow: rgba(91, 192, 222, 0.15);
            --cyan-bright: #7DD3F0;
            --amber: #D4A853;
            --amber-soft: rgba(212, 168, 83, 0.08);
            --error: #E85D5D;
            --error-soft: rgba(232, 93, 93, 0.08);
            --border: rgba(255,255,255,0.04);
            --border-hover: rgba(255,255,255,0.08);
            --border-focus: rgba(91,192,222,0.25);
            --radius-sm: 16px;
            --radius-md: 24px;
            --radius-lg: 32px;
            --ease: cubic-bezier(0.22, 1, 0.36, 1);
        }

        .login-body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
        }

        .ambient {
            position: fixed;
            pointer-events: none;
            z-index: 0;
            filter: blur(120px);
            opacity: 0.2;
        }
        .ambient-1 {
            width: 500px; height: 500px;
            background: var(--cyan-soft);
            border-radius: 50%;
            top: -10%; left: -10%;
            animation: drift 20s ease-in-out infinite;
        }
        .ambient-2 {
            width: 400px; height: 400px;
            background: var(--amber-soft);
            border-radius: 50%;
            bottom: -5%; right: -10%;
            animation: drift 25s ease-in-out infinite reverse;
        }
        @keyframes drift {
            0%, 100% { transform: translate(0,0) scale(1); }
            33% { transform: translate(30px,-20px) scale(1.05); }
            66% { transform: translate(-15px,15px) scale(0.95); }
        }

        .login-container {
            position: relative;
            z-index: 1;
            width: 100%;
            max-width: 420px;
            padding: 0 24px;
        }

        .login-card {
            background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005));
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: var(--radius-lg);
            padding: 48px 32px;
            position: relative;
            overflow: hidden;
            animation: cardEnter 0.8s var(--ease) forwards;
            opacity: 0;
            transform: translateY(20px);
        }
        @keyframes cardEnter {
            to { opacity: 1; transform: translateY(0); }
        }
        .login-card::before {
            content: '';
            position: absolute;
            top: 0; left: 30%; right: 30%;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--cyan), transparent);
            opacity: 0.3;
        }

        .login-logo {
            text-align: center;
            margin-bottom: 32px;
            font-size: 1.4rem;
            font-weight: 500;
            letter-spacing: -0.01em;
            color: var(--text);
            opacity: 0.6;
        }
        .login-logo span { color: var(--cyan); }

        .login-title {
            font-size: 1.5rem;
            font-weight: 400;
            line-height: 1.3;
            letter-spacing: -0.02em;
            text-align: center;
            margin-bottom: 8px;
        }
        .login-title em {
            font-style: italic;
            color: var(--cyan);
            font-weight: 300;
        }

        .login-subtitle {
            font-size: 0.9rem;
            color: var(--text-soft);
            text-align: center;
            line-height: 1.6;
            font-weight: 300;
            margin-bottom: 32px;
        }

        /* Social Login */
        .social-btn {
            width: 100%;
            background: var(--bg-input);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 14px 18px;
            border-radius: var(--radius-sm);
            font-size: 0.95rem;
            cursor: pointer;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 10px;
            transition: all 0.4s var(--ease);
        }
        .social-btn:hover {
            border-color: var(--border-hover);
            background: rgba(255,255,255,0.02);
        }
        .social-btn svg {
            width: 20px;
            height: 20px;
        }

        /* Divider */
        .divider {
            display: flex;
            align-items: center;
            gap: 16px;
            margin: 24px 0;
        }
        .divider-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--border-hover), transparent);
        }
        .divider-text {
            font-size: 0.75rem;
            color: var(--text-faded);
            white-space: nowrap;
        }

        /* Form */
        .form-group {
            margin-bottom: 16px;
        }
        .form-input {
            width: 100%;
            background: var(--bg-input);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 14px 16px;
            font-size: 0.95rem;
            color: var(--text);
            font-family: inherit;
            outline: none;
            transition: all 0.4s var(--ease);
        }
        .form-input::placeholder { color: var(--text-faded); }
        .form-input:focus {
            border-color: var(--border-focus);
            box-shadow: 0 0 0 3px var(--cyan-glow);
        }

        /* Password field with toggle */
        .password-wrapper {
            position: relative;
        }
        .password-toggle {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 0.8rem;
        }

        /* Submit */
        .submit-btn {
            width: 100%;
            background: var(--cyan-soft);
            border: 1px solid rgba(91,192,222,0.15);
            color: var(--cyan);
            padding: 16px;
            border-radius: 100px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            font-family: inherit;
            letter-spacing: 0.02em;
            transition: all 0.6s var(--ease);
            margin-top: 8px;
        }
        .submit-btn:hover:not(:disabled) {
            background: rgba(91,192,222,0.1);
            border-color: rgba(91,192,222,0.3);
            color: var(--cyan-bright);
        }
        .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Links */
        .link-row {
            text-align: center;
            margin-top: 20px;
            font-size: 0.85rem;
            color: var(--text-muted);
        }
        .link-row button {
            background: none;
            border: none;
            font-size: 0.85rem;
            font-family: inherit;
            color: var(--cyan);
            text-decoration: none;
            opacity: 0.7;
            transition: opacity 0.3s;
            cursor: pointer;
            padding: 0;
            margin-left: 6px;
        }
        .link-row button:hover { opacity: 1; }

        /* Terms */
        .terms {
            text-align: center;
            margin-top: 24px;
            font-size: 0.7rem;
            color: var(--text-muted);
            line-height: 1.6;
            opacity: 0.5;
        }
        .terms a {
            color: var(--text-soft);
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        /* Footer */
        .footer {
            text-align: center;
            margin-top: 40px;
        }
        .footer-logo {
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--text);
            opacity: 0.15;
            margin-bottom: 4px;
        }
        .footer-logo span { color: var(--cyan); }
        .footer-text {
            font-size: 0.65rem;
            color: var(--text-muted);
            opacity: 0.3;
        }

        .notice-box {
            padding: 12px;
            border-radius: var(--radius-sm);
            font-size: 0.85rem;
            margin-bottom: 20px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.06);
        }
        .notice-error {
            background: var(--error-soft);
            color: var(--error);
            border-color: rgba(232, 93, 93, 0.15);
        }
        .notice-success {
            background: var(--cyan-soft);
            color: var(--cyan);
            border-color: rgba(91, 192, 222, 0.15);
        }

        @media (max-width: 480px) {
            .login-card { padding: 36px 20px; }
            .login-title { font-size: 1.3rem; }
        }
      `}</style>

      <div className="ambient ambient-1"></div>
      <div className="ambient ambient-2"></div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">IQ<span>X</span>O</div>

          {!forgotOpen ? (
            <>
              {mode === "signup" ? (
                <>
                  <h1 className="login-title" dangerouslySetInnerHTML={{ __html: t.title }} />
                  <p className="login-subtitle">{t.subtitle}</p>
                </>
              ) : (
                <>
                  <h1 className="login-title" dangerouslySetInnerHTML={{ __html: t.title_signin }} />
                  <p className="login-subtitle">{t.subtitle_signin}</p>
                </>
              )}

              {error && (
                <div className="notice-box notice-error">{error}</div>
              )}

              {signupNotice && (
                <div className="notice-box notice-success">{t.checkEmail}</div>
              )}

              {/* Social Login */}
              <button className="social-btn" onClick={handleGoogleSignIn} disabled={googleLoading || loading}>
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                )}
                <span>{t.google}</span>
              </button>

              <div className="divider">
                <div className="divider-line"></div>
                <span className="divider-text">{t.divider}</span>
                <div className="divider-line"></div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t.fullNamePlaceholder}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <input
                    type="email"
                    className="form-input"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="form-group">
                  <div className="password-wrapper">
                    <input
                      type={showPass ? "text" : "password"}
                      className="form-input"
                      placeholder={t.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowPass(!showPass)}>
                      {showPass ? "🔒" : "👁"}
                    </button>
                  </div>
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin mx-auto" />
                  ) : mode === "signup" ? (
                    t.submit
                  ) : (
                    t.submit_signin
                  )}
                </button>
              </form>

              {mode === "signin" && (
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {t.forgotPassword}
                  </button>
                </div>
              )}

              <div className="link-row">
                <span>{mode === "signup" ? t.member : t.noAccount}</span>
                <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
                  {mode === "signup" ? t.login : t.signup}
                </button>
              </div>

              <div className="terms">
                <span>{t.terms} </span>
                <a href="/terms">Terms & Conditions</a> <span> {t.and} </span>
                <a href="/privacy">Privacy Policy</a>.
              </div>
            </>
          ) : (
            <>
              <h1 className="login-title">{t.forgotTitle}</h1>
              <p className="login-subtitle">{t.forgotSubtitle}</p>

              {forgotError && (
                <div className="notice-box notice-error">{forgotError}</div>
              )}

              {forgotSuccess && (
                <div className="notice-box notice-success">{t.forgotSuccessBody}</div>
              )}

              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <input
                    type="email"
                    className="form-input"
                    placeholder={t.forgotEmailPlaceholder}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={forgotLoading || forgotSuccess}
                    required
                  />
                </div>

                <button type="submit" className="submit-btn" disabled={forgotLoading || forgotSuccess}>
                  {forgotLoading ? (
                    <div className="w-5 h-5 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin mx-auto" />
                  ) : (
                    t.forgotSend
                  )}
                </button>
              </form>

              <div className="link-row">
                <button type="button" onClick={() => setForgotOpen(false)}>
                  {t.forgotCancel}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="footer">
          <div className="footer-logo">IQ<span>X</span>O</div>
          <p className="footer-text">{t.footer}</p>
        </div>
      </div>
    </div>
  );
}

