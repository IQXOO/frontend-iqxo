"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Trash2,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { useApp } from "../../lib/store";
import { toLocalDateStr, parseLocalDate } from "../../lib/store";
import type { IQXOEvent } from "../../lib/types";
import { InfiniteScroll } from "./infinite-scroll";
import { ArchiveSkeleton } from "./skeleton";
import { useEventEditor } from "../../lib/event-editor-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface ArchiveVaultProps {
  onEventClick: (event: IQXOEvent) => void;
}

interface MonthGroup {
  key: string; // e.g. "2026-07"
  year: number;
  month: number;
  label: string;
  events: IQXOEvent[];
}

const DOT_PALETTE = [
  "bg-purple-400",
  "bg-primary",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-rose-400",
];

export function ArchiveVault({ onEventClick }: ArchiveVaultProps) {
  const {
    events,
    deleteEvent,
    language,
    t,
    archiveLoading,
    archiveHasMore,
    fetchArchiveEvents,
    loadMoreArchiveEvents,
  } = useApp();
  const { openEventForm } = useEventEditor();

  const isRTL = language === "ar";
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<IQXOEvent | null>(null);;

  useEffect(() => {
    fetchArchiveEvents();
  }, [fetchArchiveEvents]);

  // Get past events (using LOCAL today, exclude virtual schedule events)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(today);

  const pastEvents = events
    .filter(
      (e) =>
        e.date < todayStr &&
        e.source !== "work_schedule_virtual" &&
        e.source !== "work_schedule",
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  // Group events by Month (Year-Month)
  const groupedMap: Record<
    string,
    { year: number; month: number; events: IQXOEvent[] }
  > = {};

  pastEvents.forEach((event) => {
    const d = parseLocalDate(event.date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;

    if (!groupedMap[key]) {
      groupedMap[key] = { year, month, events: [] };
    }
    groupedMap[key].events.push(event);
  });

  // Sort months descending (newest past month first, e.g. July 2026 before June 2026)
  const monthGroups: MonthGroup[] = Object.keys(groupedMap)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const { year, month, events } = groupedMap[key];
      const dateObj = new Date(year, month, 1);
      const label = dateObj.toLocaleDateString(
        language === "ar" ? "ar-EG" : language === "fr" ? "fr-FR" : "en-US",
        { month: "long", year: "numeric" },
      );
      return { key, year, month, label, events };
    });

  const isMonthOpen = (key: string, idx: number) => {
    if (openMonths[key] !== undefined) return openMonths[key];
    return idx === 0; // افتراضياً أحدث شهر في الأرشيف يكون مفتوحاً
  };

  const toggleMonth = (key: string, idx: number) => {
    const currentState = isMonthOpen(key, idx);
    setOpenMonths((prev) => ({ ...prev, [key]: !currentState }));
  };

  // عرض skeleton لما يكون في loading أولية
  if (archiveLoading && pastEvents.length === 0) {
    return <ArchiveSkeleton count={5} />;
  }

  if (pastEvents.length === 0) {
    return (
      <div className="px-5 py-12 flex flex-col items-center gap-4">
        <div className="h-20 w-20 rounded-3xl bg-secondary/60 flex items-center justify-center">
          <Archive className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-foreground">
            {language === "ar"
              ? "الأرشيف فارغ"
              : language === "fr"
                ? "L'archive est vide"
                : "Memory Vault is empty"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar"
              ? "الأحداث السابقة ستظهر هنا"
              : language === "fr"
                ? "Les événements passés apparaîtront ici"
                : "Past events will appear here"}
          </p>
        </div>
        {archiveLoading && (
          <div className="py-4 flex justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-4">
      {/* Header section title matching app style */}
      {/* <div
        className={`flex items-center justify-between px-1 mb-2.5 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        <h2 className="text-sm font-semibold text-foreground tracking-wide">
          {language === "ar"
            ? "أرشيف الأحداث (مقسمة شهرياً)"
            : language === "fr"
              ? "Archives mensuelles"
              : "Monthly Archived Events"}
        </h2>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          {pastEvents.length}{" "}
          {language === "ar"
            ? "ذكريات"
            : language === "fr"
              ? "souvenirs"
              : "memories"}
        </span>
      </div> */}

      {monthGroups.map((group, groupIdx) => {
        const isOpen = isMonthOpen(group.key, groupIdx);
        const displayedDots = group.events.slice(0, 5);

        return (
          <motion.div
            key={group.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIdx * 0.06, duration: 0.25 }}
            className="glass rounded-2xl border border-border/40 overflow-hidden shadow-lg transition-all duration-200 hover:border-primary/30"
          >
            {/* Category Header Bar (Matching screenshot design + IQXO app style) */}
            <button
              onClick={() => toggleMonth(group.key, groupIdx)}
              className={`w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-secondary/40 via-secondary/15 to-transparent hover:bg-secondary/60 transition-colors cursor-pointer group select-none ${
                isRTL ? "flex-row-reverse text-right" : "text-left"
              }`}
            >
              {/* Arrow + Month Title */}
              <div
                className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-all shrink-0">
                  <motion.div
                    animate={{ rotate: isOpen ? 90 : isRTL ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </div>
                <span className="text-sm font-semibold text-foreground tracking-tight capitalize">
                  {group.label}
                </span>
              </div>

              {/* Indicator Dots + Count Badge */}
              <div
                className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                {/* Dots */}
                <div className="flex items-center gap-1.5">
                  {displayedDots.map((_, dotIdx) => (
                    <span
                      key={dotIdx}
                      className={`w-2.5 h-2.5 rounded-full ${DOT_PALETTE[dotIdx % DOT_PALETTE.length]} shadow-sm`}
                    />
                  ))}
                </div>

                {/* Pill count badge */}
                <span className="rounded-full bg-primary/15 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {group.events.length}{" "}
                  {language === "ar"
                    ? "ذكريات"
                    : language === "fr"
                      ? "souvenirs"
                      : "items"}
                </span>
              </div>
            </button>

            {/* Collapsible Events List */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="p-3 space-y-2 border-t border-border/30 bg-background/30">
                    {group.events.map((event, idx) => {
                      const eventDate = parseLocalDate(event.date);
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`glass rounded-xl p-3 flex items-center gap-3 justify-between transition-all duration-200 hover:bg-secondary/60 border border-border/30 ${
                            isRTL ? "flex-row-reverse text-right" : "text-left"
                          }`}
                        >
                          {/* Date Block + Info (Clickable to view detail) */}
                          <div
                            onClick={() => onEventClick(event)}
                            className={`flex-1 flex items-center gap-3 min-w-0 cursor-pointer group/item ${
                              isRTL ? "flex-row-reverse" : ""
                            }`}
                          >
                            <div className="h-10 w-10 rounded-xl bg-secondary/80 flex flex-col items-center justify-center shrink-0 border border-border/40">
                              <span className="text-[9px] font-bold uppercase leading-none text-primary">
                                {dateObjToMonth(eventDate, language)}
                              </span>
                              <span className="text-sm font-bold text-foreground leading-none mt-0.5">
                                {eventDate.getDate()}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate group-hover/item:text-primary transition-colors">
                                {event.title}
                              </p>
                              <div
                                className={`flex items-center gap-3 mt-1 text-xs text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}
                              >
                                {event.time && (
                                  <span
                                    className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}
                                  >
                                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span>{event.time}</span>
                                  </span>
                                )}
                                {event.location && (
                                  <span
                                    className={`flex items-center gap-1 truncate max-w-[120px] ${isRTL ? "flex-row-reverse" : ""}`}
                                  >
                                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">
                                      {event.location}
                                    </span>
                                  </span>
                                )}
                              </div>
                              {event.notes && (
                                <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-1">
                                  {event.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons (Restore text button opening Edit Modal & Delete) */}
                          <div
                            className={`flex items-center gap-2 shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEventForm(event);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                              title={
                                language === "ar"
                                  ? "تعديل واستعادة الموعد"
                                  : language === "fr"
                                    ? "Modifier et restaurer"
                                    : "Edit and restore"
                              }
                            >
                              {language === "ar"
                                ? "استعادة"
                                : language === "fr"
                                  ? "Restaurer"
                                  : "Restore"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEventToDelete(event);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-all cursor-pointer active:scale-95"
                              title={
                                language === "ar"
                                  ? "حذف"
                                  : language === "fr"
                                    ? "Supprimer"
                                    : "Delete"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      <InfiniteScroll
        hasMore={archiveHasMore}
        isLoading={archiveLoading}
        onLoadMore={loadMoreArchiveEvents}
      />

      {/* ── DELETE CONFIRMATION ── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ar"
                ? "حذف الحدث"
                : language === "fr"
                  ? "Supprimer l'événement"
                  : "Delete Event"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ar"
                ? "هل أنت متأكد أنك تريد حذف هذا الحدث؟ لا يمكن التراجع عن هذا الإجراء."
                : language === "fr"
                  ? "Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible."
                  : "Are you sure you want to delete this event? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEventToDelete(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (eventToDelete) {
                  await deleteEvent(eventToDelete.id);
                  setEventToDelete(null);
                  setShowDeleteConfirm(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function dateObjToMonth(d: Date, lang: string): string {
  return d.toLocaleDateString(
    lang === "ar" ? "ar-EG" : lang === "fr" ? "fr-FR" : "en-US",
    { month: "short" },
  );
}
