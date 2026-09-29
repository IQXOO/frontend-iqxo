import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../lib/store";
import { supabase } from "../lib/supabase";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { toast } from "../components/ui/use-toast";

export default function ConnectCalendarsPage({ onNext }: { onNext?: () => void }) {
  const navigate = useNavigate();
  const { user, setCalendarOnboardingDone } = useApp();
  const [syncLocal, setSyncLocal] = useState(user?.user_metadata?.sync_local_calendar === true);
  const [loading, setLoading] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);

  const loadIntegrations = async () => {
    if (!user) return;
    const { data } = await supabase.from('calendar_integrations').select('*').eq('user_id', user.id);
    if (data) setIntegrations(data);
  };

  useEffect(() => {
    loadIntegrations();

    const handleIntegrationSaved = (e: any) => {
      const provider = e.detail?.provider;
      toast({
        title: "Calendar Connected!",
        description: `Successfully linked your ${provider} calendar.`,
      });
      loadIntegrations();
    };

    window.addEventListener('calendarIntegrationSaved', handleIntegrationSaved);
    return () => window.removeEventListener('calendarIntegrationSaved', handleIntegrationSaved);
  }, [user]);

  const handleNext = async () => {
    setLoading(true);
    try {
      if (user) {
        // Save preferences to user metadata
        await supabase.auth.updateUser({
          data: { 
            calendar_onboarding_done: true,
            sync_local_calendar: syncLocal 
          },
        });
        await setCalendarOnboardingDone(true);
      }
      if (onNext) {
        onNext();
      } else {
        navigate("/home", { replace: true });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const linkProvider = async (provider: 'google' | 'azure') => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem('iqxo_linking_provider', provider);
      }
      
      const hasProvider = user?.identities?.some(id => id.provider === provider);
      
      // On native mobile app, redirect to iqxo:// deep link so the browser returns to the app
      const isNative = typeof window !== "undefined" && (window as any).__IQXO_IS_NATIVE;
      const redirectTo = isNative 
        ? 'iqxo://auth' 
        : window.location.origin + '/connect-calendars';
      
      const options = {
        redirectTo,
        scopes: provider === 'google' 
          ? 'https://www.googleapis.com/auth/calendar' 
          : 'Calendars.ReadWrite',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent', // Forces the consent screen so we always get a refresh token
        },
      };

      if (hasProvider) {
        // If they already signed in with Google/Microsoft, we re-authenticate them to grant calendar scopes
        const { error } = await supabase.auth.signInWithOAuth({ provider, options });
        if (error) throw error;
      } else {
        // If it's a new provider for this account, link it
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

  const toggleIntegration = async (id: string, currentStatus: string) => {
    const newState = currentStatus === 'active' ? 'paused' : 'active';
    // Optimistic update
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, sync_state: newState } : i));
    
    const { error } = await supabase.from('calendar_integrations').update({ sync_state: newState }).eq('id', id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      loadIntegrations(); // Revert on failure
    }
  };

  const googleInt = integrations.find(i => i.provider === 'google');
  const outlookInt = integrations.find(i => i.provider === 'azure');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pt-12 pb-12 px-6 relative">
      
      {/* Top Navigation / Close Button - Only show if NOT in onboarding */}
      {!onNext && (
        <div className="absolute top-6 right-6 z-10">
          <button 
            onClick={handleNext}
            disabled={loading}
            className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>
      )}

      <div className="flex-1 max-w-md w-full mx-auto flex flex-col items-center mt-6">
        {/* App Icon (mocked) */}
        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
          <Calendar className="w-6 h-6 text-primary" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Connect your calendars</h1>
        <p className="text-muted-foreground text-center mb-8">
          All of your calendars together in one place
        </p>

        <div className="w-full space-y-6">
          {/* Local Calendar Section */}
          <section>
            <h2 className="text-sm text-muted-foreground mb-3 px-1">Local Calendar</h2>
            <div className="flex items-center justify-between bg-card p-4 rounded-2xl border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex flex-col items-center justify-center overflow-hidden border border-border/50">
                  <span className="text-[9px] text-destructive font-semibold uppercase leading-none mt-1">
                    Tue
                  </span>
                  <span className="text-lg font-bold leading-none mb-1">
                    22
                  </span>
                </div>
                <span className="font-medium text-card-foreground">Calendars from iPhone</span>
              </div>
              <Switch 
                checked={syncLocal} 
                onCheckedChange={setSyncLocal} 
              />
            </div>
          </section>

          {/* Cloud Calendars Section */}
          <section>
            <h2 className="text-sm text-muted-foreground mb-3 px-1">Add more</h2>
            <div className="bg-card rounded-2xl border overflow-hidden flex flex-col divide-y">
              {/* Google */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <span className="font-medium text-card-foreground">Google</span>
                </div>
                {googleInt ? (
                  <Switch 
                    checked={googleInt.sync_state === 'active'}
                    onCheckedChange={() => toggleIntegration(googleInt.id, googleInt.sync_state)}
                  />
                ) : (
                  <button onClick={() => linkProvider('google')} className="p-1">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Outlook */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0078D4] flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                      <path d="M2 3h20v18H2V3zm18 16V5H4v14h16zm-5-3h-6V8h6v8zm-4-2h2v-4h-2v4z" />
                    </svg>
                  </div>
                  <span className="font-medium text-card-foreground">Outlook</span>
                </div>
                {outlookInt ? (
                  <Switch 
                    checked={outlookInt.sync_state === 'active'}
                    onCheckedChange={() => toggleIntegration(outlookInt.id, outlookInt.sync_state)}
                  />
                ) : (
                  <button onClick={() => linkProvider('azure')} className="p-1">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Microsoft 365 */}
              <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center p-1.5">
                    <svg viewBox="0 0 23 23" className="w-full h-full">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                  </div>
                  <span className="font-medium text-card-foreground">Microsoft 365</span>
                </div>
                {outlookInt ? (
                  <Switch 
                    checked={outlookInt.sync_state === 'active'}
                    onCheckedChange={() => toggleIntegration(outlookInt.id, outlookInt.sync_state)}
                  />
                ) : (
                  <button onClick={() => linkProvider('azure')} className="p-1">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Sticky Button - Only show if IN onboarding */}
      {onNext && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <Button 
              className="w-full h-14 rounded-2xl text-lg font-semibold shadow-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white" 
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? "Saving..." : "Next"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
