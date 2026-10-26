"use client";

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { Switch } from "../components/ui/switch";
import { 
  ArrowRight, Calendar, Bell, Mic, Camera, PenTool, 
  CheckCircle, Plus, Trash2 
} from "lucide-react";
import { toast } from "../components/ui/use-toast";

interface OnboardingPageProps {
  onDone?: () => void;
}

function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Device";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "Android";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iPhone";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Win/i.test(ua)) return "Windows";
  return "Device";
}

const i18n = {
  fr: {
    calendarTitle: "Rassemblez vos agendas.",
    calendarSub: "Liez vos calendriers pour que tout soit au même endroit.",
    localCalendar: "Calendrier local",
    localCalDesc: "Agenda sur cet appareil",
    permissionCalTitle: "Permettez à IQXO de consulter votre agenda.",
    permissionCalSub: "Cela permet à IQXO de comprendre votre emploi du temps.",
    permissionNotifTitle: "Ne manquez jamais ce qui compte.",
    permissionNotifSub: "IQXO peut vous rappeler un événement important.",
    aiCaptureTitle: "Que voulez-vous que IQXO retienne ?",
    aiCaptureSub: "Essayez d'ajouter votre premier événement.",
    speak: "Parler",
    scan: "Scanner",
    type: "Écrire",
    confirmTitle: "C'est fait. C'est ajouté à votre agenda.",
    uncertainPrompt: "Pouvez-vous confirmer ceci ?",
    uncertainText: "L'emplacement n'est pas spécifié. Souhaitez-vous indiquer un lieu ?",
    trialTitle: "Votre journée est prête.",
    trialSub: "IQXO est prêt à vous accompagner au quotidien.",
    btnContinue: "Continuer",
    btnConnect: "Continuer",
    btnAllow: "Autoriser l'accès",
    doneBtn: "Accéder à mon agenda",
    event: "Événement"
  },
  en: {
    calendarTitle: "Let's bring your schedule together.",
    calendarSub: "Connect your calendars so IQXO can keep everything in one place.",
    localCalendar: "Local Calendar",
    localCalDesc: "On-device calendars",
    permissionCalTitle: "Let IQXO see your schedule.",
    permissionCalSub: "This helps IQXO understand what's already on your calendar.",
    permissionNotifTitle: "Never miss what matters.",
    permissionNotifSub: "IQXO can remind you when something important is coming up.",
    aiCaptureTitle: "What do you want IQXO to remember?",
    aiCaptureSub: "Try creating your first event now.",
    speak: "Speak",
    scan: "Scan",
    type: "Type",
    confirmTitle: "Got it. I added it to your calendar.",
    uncertainPrompt: "Can you confirm this?",
    uncertainText: "No location was specified. Would you like to set one?",
    trialTitle: "Your day is set up.",
    trialSub: "IQXO is ready to help you manage your daily life.",
    btnContinue: "Continue",
    btnConnect: "Continue",
    btnAllow: "Allow Access",
    doneBtn: "Go to my schedule",
    event: "Event"
  }
};

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

function IQXOIcon({ color = "#5BC0DE", className = "w-7 h-7" }: { color?: string, className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6"/>
      <path d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12Z" stroke={color} strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="2" fill={color}/>
    </svg>
  );
}

export default function OnboardingPage({ onDone }: OnboardingPageProps) {
  const navigate = useNavigate();
  const { setLanguage, setOnboardingDone, setCalendarOnboardingDone, user } = useApp();
  
  const [step, setStep] = useState(3); // Start directly at Calendar step (3)
  const [lang, setLang] = useState<'fr' | 'en'>('en');
  // Default to true for new users (if undefined), false only if explicitly disabled
  const [syncLocal, setSyncLocal] = useState(user?.user_metadata?.sync_local_calendar !== false);
  const [integrations, setIntegrations] = useState<any[]>([]);

  const loadIntegrations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('calendar_integrations').select('*').eq('user_id', user.id);
    if (data) setIntegrations(data);
  }, [user]);

  const toggleIntegration = async (id: string, currentStatus: string) => {
    const newState = currentStatus === 'active' ? 'paused' : 'active';
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, sync_state: newState } : i));
    
    const { error } = await supabase.from('calendar_integrations').update({ sync_state: newState }).eq('id', id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      loadIntegrations();
    }
  };

  const removeIntegration = async (id: string, providerTitle: string, providerName: string) => {
    if (!window.confirm(`Are you sure you want to completely disconnect your ${providerTitle} calendar?`)) return;
    
    setIntegrations(prev => prev.filter(i => i.id !== id));
    
    const { error } = await supabase.from('calendar_integrations').delete().eq('id', id);
    if (error) {
      toast({ title: "Failed to disconnect", description: error.message, variant: "destructive" });
      loadIntegrations();
      return;
    } 
    
    if (user?.identities) {
      const identity = user.identities.find(ident => ident.provider === providerName);
      if (identity) {
        await supabase.auth.unlinkIdentity(identity);
      }
    }
    
    toast({ title: "Disconnected", description: `Your ${providerTitle} calendar has been disconnected.` });
  };

  const googleInt = integrations.find(i => i.provider === 'google');
  const outlookInt = integrations.find(i => i.provider === 'azure');

  useEffect(() => {
    if (user?.user_metadata?.sync_local_calendar !== undefined) {
      setSyncLocal(user.user_metadata.sync_local_calendar !== false);
    }
  }, [user]);

  useEffect(() => {
    loadIntegrations();

    // Check if returning from OAuth redirect with tokens in hash
    const checkOAuthReturn = async () => {
      if (typeof window === "undefined" || !user) return;
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;
      const params = new URLSearchParams(hash);
      const providerToken = params.get('provider_token');
      const providerRefreshToken = params.get('provider_refresh_token');
      const linkingProvider = localStorage.getItem('iqxo_linking_provider') || 'google';

      if (providerToken) {
        const payload: any = {
          user_id: user.id,
          provider: linkingProvider,
          access_token: providerToken,
          sync_state: 'active'
        };
        if (providerRefreshToken) payload.refresh_token = providerRefreshToken;
        const expiresIn = params.get('expires_in');
        if (expiresIn) payload.expires_at = new Date(Date.now() + parseInt(expiresIn, 10) * 1000).toISOString();

        await supabase.from('calendar_integrations').upsert(payload, { onConflict: 'user_id,provider' });
        localStorage.removeItem('iqxo_linking_provider');
        await loadIntegrations();
        toast({
          title: "Calendar Connected!",
          description: `Successfully linked your ${linkingProvider} calendar.`,
        });
      }
    };
    checkOAuthReturn();

    const handleIntegrationSaved = () => {
      loadIntegrations();
    };

    window.addEventListener('calendarIntegrationSaved', handleIntegrationSaved);
    return () => window.removeEventListener('calendarIntegrationSaved', handleIntegrationSaved);
  }, [user, loadIntegrations]);

  useEffect(() => {
    const browserLang = (
      navigator.language ||
      (navigator as Navigator & { userLanguage?: string }).userLanguage ||
      ""
    ).toLowerCase();
    const defaultLang = browserLang.startsWith("fr") ? "fr" : "en";
    setLang(defaultLang);
    setLanguage(defaultLang);
  }, [setLanguage]);

  const toggleLanguage = () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    setLang(newLang);
    setLanguage(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("iqxo-lang", newLang);
      localStorage.setItem("iqxo-pricing-lang", newLang);
    }
  };

  const handleNextStep = async () => {
    if (step < 8) {
      setStep(prev => prev + 1);
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem("iqxo-lang", lang);
        localStorage.setItem("iqxo_intro_dismissed", "1");
      }
      
      if (user) {
        await supabase.auth.updateUser({
          data: { 
            onboarding_done: true,
            calendar_onboarding_done: true,
            sync_local_calendar: syncLocal 
          },
        });
      }

      await setOnboardingDone(true);
      await setCalendarOnboardingDone(true);
      onDone?.();
      
      navigate("/home", { replace: true });
    }
  };

  const linkProvider = async (provider: 'google' | 'azure') => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem('iqxo_linking_provider', provider);
        localStorage.setItem('iqxo_return_url', '/onboarding');
      }
      
      const hasProvider = user?.identities?.some(id => id.provider === provider);
      
      // On native mobile app, redirect to iqxo:// deep link so the browser returns to the app
      const isNative = typeof window !== "undefined" && (window as any).__IQXO_IS_NATIVE;
      const redirectTo = isNative 
        ? 'iqxo://auth' 
        : window.location.origin + '/onboarding';
      
      const options = {
        redirectTo,
        scopes: provider === 'google' 
          ? 'https://www.googleapis.com/auth/calendar.events' 
          : 'email profile offline_access https://graph.microsoft.com/Calendars.ReadWrite',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent', // Forces the consent screen so we always get a refresh token
        },
      };

      if (!user || hasProvider) {
        const { error } = await supabase.auth.signInWithOAuth({ provider, options });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.linkIdentity({ provider, options });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: `Failed to link ${provider}`,
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const t = i18n[lang];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0C0C0E] text-[#E8E8E8] [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',Roboto,sans-serif]">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-in { animation: fadeIn 0.4s ${ease} forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      
      {/* Language Toggle */}
      <button 
        onClick={toggleLanguage}
        className="absolute top-12 right-6 z-50 px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-medium tracking-widest text-[#A0A0A8] hover:text-white hover:bg-white/5 transition-all"
      >
        {lang === 'fr' ? 'EN | FR' : 'FR | EN'}
      </button>

      <div className="relative w-full max-w-[340px] flex flex-col h-[700px] max-h-[90vh]">
        {/* Header Logo */}
        <div className="w-full flex items-center justify-start pt-6 z-10 pb-4">
          <div className="text-2xl font-semibold tracking-[-0.02em]">
            IQ<span className="text-[#5BC0DE]">X</span>O
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-center z-10 my-auto py-2 overflow-y-auto max-h-[660px] no-scrollbar fade-in" key={step}>
          
          {step === 3 && (
            <div className="space-y-3.5 text-left">
              <div className="space-y-1">
                <h2 className="text-xl font-normal text-[#E8E8E8]">{t.calendarTitle}</h2>
                <p className="text-[#6E6E78] text-xs">{t.calendarSub}</p>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-[#6E6E78] uppercase tracking-wider block">Local Calendar</span>
                <div className="p-3 rounded-2xl bg-[#161618] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex flex-col items-center justify-center overflow-hidden border border-white/10">
                      <span className="text-[8px] text-[#5BC0DE] font-bold uppercase leading-none">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-bold leading-none mt-0.5 text-[#E8E8E8]">
                        {new Date().getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-[#E8E8E8]">
                        {t.localCalendar} ({getDeviceName()})
                      </div>
                      <div className="text-[9px] text-[#6E6E78]">{t.localCalDesc}</div>
                    </div>
                  </div>
                  <Switch 
                    checked={syncLocal} 
                    onCheckedChange={async (val) => {
                      setSyncLocal(val);
                      if (user) {
                        await supabase.auth.updateUser({
                          data: { sync_local_calendar: val }
                        });
                      }
                      if (val && typeof window !== 'undefined') {
                        if ((window as any).__IQXO_postMessage) { 
                          (window as any).__IQXO_postMessage(JSON.stringify({ type: 'requestCalendarEvents' })); 
                        } else if ((window as any).ReactNativeWebView) { 
                          (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'requestCalendarEvents' })); 
                        }
                      }
                    }} 
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-[#6E6E78] uppercase tracking-wider block">Add Accounts</span>
                <div className="space-y-1.5">
                  {/* Google Calendar */}
                  <div 
                    onClick={() => { if (!googleInt) linkProvider('google'); }}
                    className={`p-2.5 rounded-xl bg-[#161618] border border-white/5 flex items-center justify-between text-xs transition-colors ${!googleInt ? 'cursor-pointer hover:border-white/10' : ''}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center p-0.5 shrink-0">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      </div>
                      <span className="text-gray-200">Google Calendar</span>
                    </div>
                    {googleInt ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch 
                          checked={googleInt.sync_state === 'active'}
                          onCheckedChange={() => toggleIntegration(googleInt.id, googleInt.sync_state)}
                        />
                        <button 
                          type="button" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            removeIntegration(googleInt.id, 'Google Calendar', 'google'); 
                          }} 
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Disconnect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => linkProvider('google')} 
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Outlook */}
                  <div 
                    onClick={() => { if (!outlookInt) linkProvider('azure'); }}
                    className={`p-2.5 rounded-xl bg-[#161618] border border-white/5 flex items-center justify-between text-xs transition-colors ${!outlookInt ? 'cursor-pointer hover:border-white/10' : ''}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[#0078D4] shrink-0">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
                          <path d="M2 3h20v18H2V3zm18 16V5H4v14h16zm-5-3h-6V8h6v8zm-4-2h2v-4h-2v4z" />
                        </svg>
                      </div>
                      <span className="text-gray-200">Outlook</span>
                    </div>
                    {outlookInt ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch 
                          checked={outlookInt.sync_state === 'active'}
                          onCheckedChange={() => toggleIntegration(outlookInt.id, outlookInt.sync_state)}
                        />
                        <button 
                          type="button" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            removeIntegration(outlookInt.id, 'Outlook', 'azure'); 
                          }} 
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Disconnect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => linkProvider('azure')} 
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Microsoft 365 */}
                  <div 
                    onClick={() => { if (!outlookInt) linkProvider('azure'); }}
                    className={`p-2.5 rounded-xl bg-[#161618] border border-white/5 flex items-center justify-between text-xs transition-colors ${!outlookInt ? 'cursor-pointer hover:border-white/10' : ''}`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-white border border-white/10 p-1 shrink-0">
                        <svg viewBox="0 0 23 23" className="w-full h-full">
                          <path fill="#f35325" d="M1 1h10v10H1z"/>
                          <path fill="#81bc06" d="M12 1h10v10H12z"/>
                          <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                          <path fill="#ffba08" d="M12 12h10v10H12z"/>
                        </svg>
                      </div>
                      <span className="text-gray-200">Microsoft 365</span>
                    </div>
                    {outlookInt ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Switch 
                          checked={outlookInt.sync_state === 'active'}
                          onCheckedChange={() => toggleIntegration(outlookInt.id, outlookInt.sync_state)}
                        />
                        <button 
                          type="button" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            removeIntegration(outlookInt.id, 'Microsoft 365', 'azure'); 
                          }} 
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Disconnect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => linkProvider('azure')} 
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 text-center px-2">
              <div className="w-14 h-14 rounded-2xl bg-[#161618] border border-white/5 flex items-center justify-center mx-auto text-[#5BC0DE]">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-normal text-[#E8E8E8]">{t.permissionCalTitle}</h2>
                <p className="text-[#A0A0A8] text-xs leading-relaxed">{t.permissionCalSub}</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5 text-center px-2">
              <div className="w-14 h-14 rounded-2xl bg-[#161618] border border-white/5 flex items-center justify-center mx-auto text-[#5BC0DE]">
                <Bell className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-normal text-[#E8E8E8]">{t.permissionNotifTitle}</h2>
                <p className="text-[#A0A0A8] text-xs leading-relaxed">{t.permissionNotifSub}</p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 text-center">
              <div className="space-y-1">
                <h2 className="text-xl font-normal text-[#E8E8E8]">{t.aiCaptureTitle}</h2>
                <p className="text-[#6E6E78] text-xs">{t.aiCaptureSub}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <button onClick={handleNextStep} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#161618] border border-white/5 hover:border-[#5BC0DE]/40 transition-all cursor-pointer space-y-2">
                  <Mic className="w-6 h-6 text-[#5BC0DE]" />
                  <span className="text-xs text-[#E8E8E8]">{t.speak}</span>
                </button>
                <button onClick={handleNextStep} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#161618] border border-white/5 hover:border-[#5BC0DE]/40 transition-all cursor-pointer space-y-2">
                  <Camera className="w-6 h-6 text-[#5BC0DE]" />
                  <span className="text-xs text-[#E8E8E8]">{t.scan}</span>
                </button>
                <button onClick={handleNextStep} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#161618] border border-white/5 hover:border-[#5BC0DE]/40 transition-all cursor-pointer space-y-2">
                  <PenTool className="w-6 h-6 text-[#5BC0DE]" />
                  <span className="text-xs text-[#E8E8E8]">{t.type}</span>
                </button>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4 text-left">
              <div className="flex items-center space-x-2 text-[#5BC0DE]">
                <CheckCircle className="w-5 h-5" />
                <h2 className="text-base font-normal text-white">{t.confirmTitle}</h2>
              </div>
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-4 space-y-3">
                <div>
                  <span className="text-[10px] text-[#6E6E78] uppercase">{t.event}</span>
                  <div className="text-sm font-medium text-white pt-0.5">Doctor Appointment</div>
                </div>
                <div className="bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-xl p-2.5 space-y-1">
                  <span className="text-[10px] text-[#D4A853] font-medium block">{t.uncertainPrompt}</span>
                  <p className="text-[11px] text-gray-300">{t.uncertainText}</p>
                </div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#5BC0DE]/10 border border-[#5BC0DE]/30 flex items-center justify-center mx-auto">
                <IQXOIcon color="#5BC0DE" className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-normal text-[#E8E8E8]">{t.trialTitle}</h2>
              <p className="text-xs text-[#A0A0A8]">{t.trialSub}</p>
            </div>
          )}
        </div>

        {/* Footer Action Button */}
        <div className="w-full pt-2 z-10 opacity-100">
          <button 
            type="button" 
            onClick={handleNextStep}
            className="w-full h-[52px] bg-[#5BC0DE]/10 hover:bg-[#5BC0DE]/20 border border-[#5BC0DE]/20 text-[#5BC0DE] font-medium rounded-full flex items-center justify-center space-x-2 active:scale-[0.98] transition-all py-3.5 cursor-pointer"
          >
            <span className="text-sm">
              {step === 4 || step === 5 ? t.btnAllow :
               step === 7 || step === 8 ? t.doneBtn :
               t.btnContinue}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
