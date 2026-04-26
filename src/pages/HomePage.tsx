"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus } from "lucide-react";
import { DashboardHeader } from "../components/dashboard/header";
import { SearchBar } from "../components/dashboard/search-bar";
import { StatsCard } from "../components/dashboard/stats-card";
import { UrgentCards } from "../components/dashboard/attention-cards";
import { EventList } from "../components/dashboard/event-list";
import { EventFormModal } from "../components/dashboard/event-form-modal";
import { EventDetailModal } from "../components/dashboard/event-detail-modal";
import { UploadButton } from "../components/dashboard/upload-button";
import { VoiceButton } from "../components/dashboard/voice-button";
import { EventConfirmationModal } from "../components/dashboard/event-confirmation-modal";
import { BottomNav, type NavTab } from "../components/dashboard/bottom-nav";
import { SettingsView } from "../components/dashboard/settings-view";
import { HistoryView } from "../components/dashboard/history-view";
import { TomorrowChainModal } from "../components/dashboard/tomorrow-chain-modal";
import {
  NavigationTabs,
  type NavigationTab,
} from "../components/dashboard/navigation-tabs";
import { TomorrowView } from "../components/dashboard/tomorrow-view";
import { FutureExplorerView } from "../components/dashboard/future-explorer-view";
import { ArchiveVault } from "../components/dashboard/archive-vault";
import { WorkScheduleView } from "../components/dashboard/work-schedule-view";
import { CommandPalette } from "../components/dashboard/command-palette";
import { useApp, computePriority } from "../lib/store";
import { StripePricingPage } from "../components/dashboard/stripe-pricing-page";
import { parseVoiceInput, type ParsedEvent } from "../lib/parse-voice-input";
import { useNotifications } from "../hooks/use-notifications";
import { exportEventsToPDF } from "../lib/export-pdf";
import type { IQXOEvent } from "../lib/types";
import { useVoiceInput } from "../hooks/use-voice-input";

export default function Page() {
  const { events, deleteEvent, t, signOut } = useApp();

  // Initialize browser notifications
  useNotifications(events);

  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [navigationTab, setNavigationTab] = useState<NavigationTab>("today");
  const [showSettings, setShowSettings] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<IQXOEvent | null>(null);
  const [editEvent, setEditEvent] = useState<IQXOEvent | null>(null);
  const [voicePrefill, setVoicePrefill] = useState<ParsedEvent | null>(null);
  const [prefillImageUrl, setPrefillImageUrl] = useState<string | undefined>(
    undefined,
  );
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<ParsedEvent | null>(null);
  const [confirmSource, setConfirmSource] = useState<"voice" | "photo">(
    "voice",
  );
  const [confirmImageUrl, setConfirmImageUrl] = useState<string | undefined>(
    undefined,
  );
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [tomorrowModalOpen, setTomorrowModalOpen] = useState(false);
  const isOnHome = activeTab === "home";
  const { isListening } = useVoiceInput();
  // Filter events by search
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  // Group by priority (exclude past from home view)
  const urgentEvents = useMemo(
    () =>
      filteredEvents
        .filter((e) => computePriority(e.date) === "urgent")
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.time || "00:00"}`).getTime() -
            new Date(`${b.date}T${b.time || "00:00"}`).getTime(),
        ),
    [filteredEvents],
  );
  const upcomingEvents = useMemo(
    () =>
      filteredEvents
        .filter((e) => computePriority(e.date) === "upcoming")
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.time || "00:00"}`).getTime() -
            new Date(`${b.date}T${b.time || "00:00"}`).getTime(),
        ),
    [filteredEvents],
  );
  const laterEvents = useMemo(
    () =>
      filteredEvents
        .filter((e) => computePriority(e.date) === "later")
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.time || "00:00"}`).getTime() -
            new Date(`${b.date}T${b.time || "00:00"}`).getTime(),
        ),
    [filteredEvents],
  );

  const handleEventClick = useCallback((event: IQXOEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  }, []);

  const handleEditFromDetail = useCallback((event: IQXOEvent) => {
    setEditEvent(event);
    setFormOpen(true);
  }, []);

  const handleManualAdd = useCallback(() => {
    setEditEvent(null);
    setVoicePrefill(null);
    setFormOpen(true);
  }, []);

  const handleVoiceResult = useCallback((data: any) => {
    // Build a ParsedEvent and open the edit form directly
    const parsed: ParsedEvent =
      typeof data === "string"
        ? { title: data }
        : {
            title: data.title || "",
            date: data.date || "",
            time: data.time || "",
            location: data.location || undefined,
            phone: data.phone || undefined,
          };
    setEditEvent(null);
    setVoicePrefill(parsed);
    setFormOpen(true);
  }, []);

  const handlePhotoExtracted = useCallback(
    (data: ParsedEvent, imageUrl?: string) => {
      setEditEvent(null);
      setVoicePrefill(data);
      setPrefillImageUrl(imageUrl); // carry photo into the form
      setFormOpen(true);
    },
    [],
  );

  const handleFormClose = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditEvent(null);
      setVoicePrefill(null);
      setPrefillImageUrl(undefined);
    }
  }, []);

  // Count non-past events for empty state
  const activeEvents = events.filter((e) => computePriority(e.date) !== "past");
  const hasAnyActiveEvents = activeEvents.length > 0;
  const hasSearchResults =
    filteredEvents.filter((e) => computePriority(e.date) !== "past").length > 0;

  return (
    <div className="relative min-h-screen max-w-md mx-auto bg-background overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full opacity-15 blur-[120px]"
        style={{ background: "var(--primary)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[600px] -right-20 h-[300px] w-[300px] rounded-full opacity-10 blur-[100px]"
        style={{ background: "var(--chart-3)" }}
        aria-hidden="true"
      />

      <main className="relative z-10 overflow-y-auto pb-36">
        {activeTab === "home" && (
          <>
            <DashboardHeader
              onProfileClick={() => setShowSettings(true)}
              onSettingsClick={() => setShowSettings(true)}
              onHomeClick={() => {
                setActiveTab("home");
                setNavigationTab("today");
              }}
              activeTab={activeTab}
            />
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <StatsCard />

            {/* Navigation Tabs Hub - Today/Tomorrow/Future/Archive */}
            <NavigationTabs
              active={navigationTab}
              onTabChange={setNavigationTab}
            />

            {/* Today View */}
            {navigationTab === "today" &&
              (!hasAnyActiveEvents ? (
                /* Empty state */
                <div className="px-5 py-12 flex flex-col items-center gap-4">
                  <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <CalendarPlus className="h-10 w-10 text-primary/50" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base font-semibold text-foreground">
                      {t("noEvents")}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("noEventsDesc")}
                    </p>
                  </div>
                  <button
                    onClick={handleManualAdd}
                    className="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                  >
                    {t("addEvent")}
                  </button>
                </div>
              ) : searchQuery && !hasSearchResults ? (
                /* No search results */
                <div className="px-5 py-12 flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    {t("noResults")}
                  </p>
                </div>
              ) : (
                <>
                  {urgentEvents.length > 0 && (
                    <UrgentCards onEventClick={handleEventClick} />
                  )}
                  <EventList
                    priority="upcoming"
                    events={upcomingEvents}
                    onEventClick={handleEventClick}
                  />
                  <EventList
                    priority="later"
                    events={laterEvents}
                    onEventClick={handleEventClick}
                  />
                </>
              ))}

            {/* Tomorrow View */}
            {navigationTab === "tomorrow" && (
              <TomorrowView onEventClick={handleEventClick} />
            )}

            {/* Future Explorer View */}
            {navigationTab === "future" && (
              <FutureExplorerView onEventClick={handleEventClick} />
            )}

            {/* Archive Vault View */}
            {navigationTab === "archive" && (
              <ArchiveVault onEventClick={handleEventClick} />
            )}

            {/* Work Schedule — inside nav tabs */}
            {navigationTab === "schedule" && <WorkScheduleView />}
          </>
        )}

        {activeTab === "history" && (
          <HistoryView onEventClick={handleEventClick} />
        )}

        {activeTab === "settings" && <SettingsView />}
      </main>

      {/* Settings modal overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              className="w-full max-w-lg mx-auto bg-background rounded-t-3xl border border-white/10 max-h-[80vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SettingsView onClose={() => setShowSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice modal (triggered by action hub mic button) */}
      <VoiceButton
        externalOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onTranscript={handleVoiceResult}
      />

      {/* Upload modal (triggered by FabHub) */}

      <UploadButton
        externalOpen={uploadOpen}
        onExternalOpenChange={setUploadOpen}
        onExtractedData={handlePhotoExtracted}
      />

      {/* Confirmation modal for voice and photo extracted events */}
      <EventConfirmationModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        extractedData={confirmData}
        source={confirmSource}
        imageUrl={confirmImageUrl}
      />

      {/* Minimalist Action Hub - The Power Trio — only visible on home */}
      <BottomNav
        active={activeTab}
        onTabChange={setActiveTab}
        onUploadClick={() => setUploadOpen(true)}
        onManualAdd={handleManualAdd}
        onMicClick={() => setVoiceModalOpen(true)}
        showFab={isOnHome && navigationTab === "today"}
      />

      {/* Tomorrow's Chain Modal */}
      <TomorrowChainModal
        open={tomorrowModalOpen}
        onClose={() => setTomorrowModalOpen(false)}
      />

      {/* Command Palette - Cmd+K */}
      <CommandPalette
        onAddEvent={handleManualAdd}
        onToggleDarkMode={() => {
          // Toggle dark mode via store or theme provider
          document.documentElement.classList.toggle("dark");
        }}
        onExportPDF={() => exportEventsToPDF(events, "user@example.com")}
        onLogout={async () => {
          await signOut();
        }}
        onEventSelect={(event) => {
          setSelectedEvent(event);
          setDetailOpen(true);
        }}
      />

      {/* Modals */}
      <EventFormModal
        open={formOpen}
        onOpenChange={handleFormClose}
        editEvent={editEvent}
        prefillData={voicePrefill}
        prefillImageUrl={prefillImageUrl}
      />
      <EventDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={selectedEvent}
        onEdit={handleEditFromDetail}
      />
      {/* Stripe Pricing Modal */}
      {/* <StripePricingPage
        open={showPricing}
        onClose={() => setShowPricing(false)}
      /> */}
    </div>
  );
}
