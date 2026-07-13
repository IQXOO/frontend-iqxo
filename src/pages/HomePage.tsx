"use client";

import { Suspense, useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, Mic, Plus } from "lucide-react";
import { StatsCard } from "../components/dashboard/stats-card";
import { UrgentCards } from "../components/dashboard/attention-cards";
import { EventList } from "../components/dashboard/event-list";
import { BottomNav, type NavTab } from "../components/dashboard/bottom-nav";
import { useApp, computePriority } from "../lib/store";
import { shouldAutoOpenBillingRoute } from "../lib/billing-utils";
import { type ParsedEvent } from "../lib/parse-voice-input";
import { useEventNotifications } from "../hooks/use-event-notifications";
import type { IQXOEvent } from "../lib/types";
import { useVoiceInput } from "../hooks/use-voice-input";
import { useEventEditor } from "../lib/event-editor-context";
import { lazyNamed } from "../lib/lazy";
import { InfiniteScroll } from "../components/dashboard/infinite-scroll";
import { HomePageSkeleton } from "../components/dashboard/skeleton";

const UploadButton = lazyNamed(() => import("../components/dashboard/upload-button"), "UploadButton");
const VoiceButton = lazyNamed(() => import("../components/dashboard/voice-button"), "VoiceButton");
const EventConfirmationModal = lazyNamed(() => import("../components/dashboard/event-confirmation-modal"), "EventConfirmationModal");
const SettingsView = lazyNamed(() => import("../components/dashboard/settings-view"), "SettingsView");
const HistoryView = lazyNamed(() => import("../components/dashboard/history-view"), "HistoryView");
const TomorrowChainModal = lazyNamed(() => import("../components/dashboard/tomorrow-chain-modal"), "TomorrowChainModal");
const _TomorrowView = lazyNamed(() => import("../components/dashboard/tomorrow-view"), "TomorrowView");
const _FutureExplorerView = lazyNamed(() => import("../components/dashboard/future-explorer-view"), "FutureExplorerView");
const _ArchiveVault = lazyNamed(() => import("../components/dashboard/archive-vault"), "ArchiveVault");
const _WorkScheduleView = lazyNamed(() => import("../components/dashboard/work-schedule-view"), "WorkScheduleView");

function LazySectionFallback() {
  return <div className="h-40 rounded-[24px] border border-white/5 bg-white/5 animate-pulse" />;
}

function LazyModalFallback() {
  return <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />;
}

export default function Page() {
  const {
    events,
    t,
    theme,
    loading,
    planStatus,
    planResolved,
    trialEndsAt,
    language,
    activeLoading,
    activeHasMore,
    loadMoreActiveEvents,
  } = useApp();
  const shouldBlockAI = shouldAutoOpenBillingRoute(planResolved, planStatus, trialEndsAt);

  // Initialize browser notifications
  useEventNotifications(events, language);

  const [activeTab, setActiveTab] = useState<NavTab>("home");
  // legacy in-page navigation removed; Home shows today's dashboard content
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, _setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadAutoOpenPicker, setUploadAutoOpenPicker] = useState(true);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, _setConfirmData] = useState<ParsedEvent | null>(null);
  const [confirmSource, _setConfirmSource] = useState<"voice" | "photo">(
    "voice",
  );
  const [confirmImageUrl, _setConfirmImageUrl] = useState<string | undefined>(
    undefined,
  );
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [tomorrowModalOpen, setTomorrowModalOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [fabVisible, setFabVisible] = useState(true);
  const isOnHome = activeTab === "home";
  const isDarkTheme =
    theme === "dark" ||
    (theme === "system" &&
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));
  const { isListening: _isListening } = useVoiceInput();
  const { openEventDetail, openEventForm } = useEventEditor();

  // Filter events by search and exclude work schedule events
  const filteredEvents = useMemo(() => {
    const base = events.filter(
      (e) => e.source !== "work_schedule" && e.source !== "work_schedule_virtual"
    );
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
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

  const handleEventClick = useCallback(
    (event: IQXOEvent) => {
      openEventDetail(event);
    },
    [openEventDetail],
  );

  const handleManualAdd = useCallback(() => {
    openEventForm(null);
  }, [openEventForm]);

  const handleVoiceResult = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: any) => {
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
      openEventForm(null, { prefillData: parsed });
    },
    [openEventForm],
  );

  const handlePhotoExtracted = useCallback(
    (data: ParsedEvent, imageUrl?: string) => {
      openEventForm(null, { prefillData: data, prefillImageUrl: imageUrl });
    },
    [openEventForm],
  );

  useEffect(() => {
    if (!uploadOpen) {
      setPendingUploadFile(null);
    }
  }, [uploadOpen]);

  useEffect(() => {
    let lastY = 0;
    if (typeof window !== "undefined") {
      lastY = window.scrollY;
    }

    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 8) {
        setFabVisible(false);
      } else if (y < lastY - 8) {
        setFabVisible(true);
      }
      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
            {loading ? (
              <HomePageSkeleton />
            ) : (
              <>
            <StatsCard />

            {/* Today View (always shown on Home). Legacy in-page tabs removed. */}
            {!hasAnyActiveEvents ? (
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
                <InfiniteScroll
                  hasMore={activeHasMore}
                  isLoading={activeLoading}
                  onLoadMore={loadMoreActiveEvents}
                />
              </>
            )}
              </>
            )}
          </>
        )}

        {activeTab === "history" && (
          <Suspense fallback={<LazySectionFallback />}>
            <HistoryView onEventClick={handleEventClick} />
          </Suspense>
        )}

        {activeTab === "settings" && (
          <Suspense fallback={<LazySectionFallback />}>
            <SettingsView />
          </Suspense>
        )}
      </main>

      {/* Settings modal overlay */}
      <AnimatePresence>
        {showSettings && (
          <Suspense fallback={<LazyModalFallback />}>
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
          </Suspense>
        )}
      </AnimatePresence>

      {/* Voice modal (triggered by action hub mic button) */}
      {voiceModalOpen && (
        <Suspense fallback={null}>
          <VoiceButton
            externalOpen={voiceModalOpen}
            onClose={() => setVoiceModalOpen(false)}
            onTranscript={handleVoiceResult}
          />
        </Suspense>
      )}

      {/* Upload modal (triggered by FabHub) */}
      {uploadOpen && (
        <Suspense fallback={null}>
          <UploadButton
            externalOpen={uploadOpen}
            onExternalOpenChange={setUploadOpen}
            autoOpenPicker={uploadAutoOpenPicker}
            incomingFile={pendingUploadFile}
            onExtractedData={handlePhotoExtracted}
          />
        </Suspense>
      )}

      {/* Confirmation modal for voice and photo extracted events */}
      {confirmOpen && (
        <Suspense fallback={null}>
          <EventConfirmationModal
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            extractedData={confirmData}
            source={confirmSource}
            imageUrl={confirmImageUrl}
          />
        </Suspense>
      )}

      {isOnHome && (
        <motion.div
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+80px)] z-40 pointer-events-none"
          animate={fabVisible ? { y: 0, opacity: 1 } : { y: 48, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto flex w-full max-w-md justify-end overflow-visible px-4 md:px-6">
            <motion.div
              className="pointer-events-auto flex flex-col items-end gap-[12px]"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <motion.button
                onClick={() => {
                  if (shouldBlockAI) {
                    window.dispatchEvent(new CustomEvent("trigger-paywall"));
                  } else {
                    setVoiceModalOpen(true);
                  }
                }}
                aria-label="Start voice input"
                className={`flex h-14 w-14 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition-all duration-200 ${
                  isDarkTheme
                    ? "bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-[0_8px_28px_rgba(99,102,241,0.45),0_2px_10px_rgba(0,0,0,0.3)]"
                    : "bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-[0_8px_24px_rgba(99,102,241,0.32),0_2px_8px_rgba(0,0,0,0.1)]"
                }`}
                whileHover={{ y: -2, scale: 1.06 }}
                whileTap={{ scale: 0.93 }}
              >
                <Mic className="h-[22px] w-[22px]" />
              </motion.button>

              {/* ── + Add button ── */}
              <motion.button
                onClick={() => setComposerOpen(true)}
                aria-label="Add item"
                className={`flex h-14 w-14 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all duration-200 ${
                  isDarkTheme
                    ? "bg-blue-500 text-white shadow-[0_0_0_1px_rgba(99,179,237,0.2),0_8px_28px_rgba(59,130,246,0.45),0_2px_10px_rgba(0,0,0,0.3)]"
                    : "bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.32),0_2px_8px_rgba(0,0,0,0.1)]"
                }`}
                whileHover={{ y: -2, scale: 1.06 }}
                whileTap={{ scale: 0.93 }}
              >
                <Plus className="h-6 w-6" strokeWidth={2.8} />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Minimalist Action Hub - The Power Trio — only visible on home */}
      <BottomNav
        active={activeTab}
        onTabChange={setActiveTab}
        onUploadClick={({ autoOpenPicker = true, file = null } = {}) => {
          if (shouldBlockAI) {
            window.dispatchEvent(new CustomEvent("trigger-paywall"));
          } else {
            setUploadAutoOpenPicker(autoOpenPicker);
            setPendingUploadFile(file);
            setUploadOpen(true);
          }
        }}
        onManualAdd={handleManualAdd}
        composerOpen={composerOpen}
        onComposerOpenChange={setComposerOpen}
      />

      {/* Tomorrow's Chain Modal */}
      {tomorrowModalOpen && (
        <Suspense fallback={null}>
          <TomorrowChainModal
            open={tomorrowModalOpen}
            onClose={() => setTomorrowModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
