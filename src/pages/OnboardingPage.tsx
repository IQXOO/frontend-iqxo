"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { 
  ArrowRight, Chrome, Calendar, Bell, Mic, Camera, PenTool, 
  CheckCircle, Plus, Building2 
} from "lucide-react";
import { toast } from "../components/ui/use-toast";

interface OnboardingPageProps {
  onDone?: () => void;
}

const i18n = {
  fr: {
    calendarTitle: "Rassemblez vos agendas.",
    calendarSub: "Liez vos calendriers pour que tout soit au même endroit.",
    localCalendar: "Calendrier local (iPhone)",
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
    btnConnect: "Lier les agendas",
    btnAllow: "Autoriser l'accès",
    doneBtn: "Accéder à mon agenda",
    event: "Événement"
  },
  en: {
    calendarTitle: "Let's bring your schedule together.",
    calendarSub: "Connect your calendars so IQXO can keep everything in one place.",
    localCalendar: "Local Calendar (iPhone)",
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
    btnConnect: "Connect calendars",
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
  const [syncLocal, setSyncLocal] = useState(true);

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
      }
      
      const hasProvider = user?.identities?.some(id => id.provider === provider);
      
      const options = {
        redirectTo: window.location.origin + '/onboarding',
        scopes: provider === 'google' 
          ? 'https://www.googleapis.com/auth/calendar' 
          : 'Calendars.ReadWrite',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      };

      if (hasProvider) {
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
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-medium text-xs text-[#E8E8E8]">22</div>
                    <div>
                      <div className="text-xs font-medium text-[#E8E8E8]">{t.localCalendar}</div>
                      <div className="text-[9px] text-[#6E6E78]">{t.localCalDesc}</div>
                    </div>
                  </div>
                  <input type="checkbox" checked={syncLocal} onChange={(e) => setSyncLocal(e.target.checked)} className="w-4 h-4 accent-[#5BC0DE] cursor-pointer" />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-[#6E6E78] uppercase tracking-wider block">Add Accounts</span>
                <div className="space-y-1.5">
                  <div onClick={() => linkProvider('google')} className="p-2.5 rounded-xl bg-[#161618] border border-white/5 flex items-center justify-between text-xs cursor-pointer hover:border-white/10 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <Chrome className="w-4 h-4 text-[#5BC0DE]" />
                      <span className="text-gray-200">Google Calendar</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  
                  {/* Outlook */}
                  <div onClick={() => linkProvider('azure')} className="p-2.5 rounded-xl bg-[#161618] border border-white/5 flex items-center justify-between text-xs cursor-pointer hover:border-white/10 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-4 h-4 flex items-center justify-center rounded-sm bg-[#0078D4]">
                        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white">
                          <path d="M2 3h20v18H2V3zm18 16V5H4v14h16zm-5-3h-6V8h6v8zm-4-2h2v-4h-2v4z" />
                        </svg>
                      </div>
                      <span className="text-gray-200">Outlook</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-gray-500" />
                  </div>

                  {/* Microsoft 365 */}
                  <div onClick={() => linkProvider('azure')} className="p-2.5 rounded-xl bg-[#161618] border border-white/5 flex items-center justify-between text-xs cursor-pointer hover:border-white/10 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-4 h-4 flex items-center justify-center rounded-sm bg-white p-[1px]">
                        <svg viewBox="0 0 23 23" className="w-full h-full">
                          <path fill="#f35325" d="M1 1h10v10H1z"/>
                          <path fill="#81bc06" d="M12 1h10v10H12z"/>
                          <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                          <path fill="#ffba08" d="M12 12h10v10H12z"/>
                        </svg>
                      </div>
                      <span className="text-gray-200">Microsoft 365</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-gray-500" />
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
              {step === 3 ? t.btnConnect :
               step === 4 || step === 5 ? t.btnAllow :
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
