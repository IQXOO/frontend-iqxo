"use client"

import React, { Suspense, createContext, useCallback, useContext, useMemo, useState } from "react";
import type { IQXOEvent } from "./types";
import type { ParsedEvent } from "./parse-voice-input";
import { useApp } from "./store";

import { EventFormModal } from "../components/dashboard/event-form-modal";
import { EventDetailModal } from "../components/dashboard/event-detail-modal";

interface EventEditorContextValue {
  openEventDetail: (event: IQXOEvent) => void;
  openEventForm: (
    event?: IQXOEvent | null,
    options?: { prefillData?: ParsedEvent | null; prefillImageUrl?: string },
  ) => void;
  openAddEvent: () => void;
}

const EventEditorContext = createContext<EventEditorContextValue | null>(null);

export function useEventEditor(): EventEditorContextValue {
  const context = useContext(EventEditorContext);
  if (!context) {
    throw new Error("useEventEditor must be used within an EventEditorProvider");
  }
  return context;
}

interface EventEditorProviderProps {
  children: React.ReactNode;
}

export function EventEditorProvider({ children }: EventEditorProviderProps) {
  const { events } = useApp();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [directEvent, setDirectEvent] = useState<IQXOEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<IQXOEvent | null>(null);
  const [voicePrefill, setVoicePrefill] = useState<ParsedEvent | null>(null);
  const [prefillImageUrl, setPrefillImageUrl] = useState<string | undefined>(undefined);

  // Live synchronization: always get the latest state from the store
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return directEvent;
    return events.find((e) => e.id === selectedEventId) || directEvent;
  }, [selectedEventId, events, directEvent]);

  const openEventDetail = useCallback((event: IQXOEvent) => {
    setSelectedEventId(event.id);
    setDirectEvent(event);
    setDetailOpen(true);
  }, []);

  const openEventForm = useCallback(
    (
      event: IQXOEvent | null = null,
      options: { prefillData?: ParsedEvent | null; prefillImageUrl?: string } = {},
    ) => {
      setEditEvent(event);
      setVoicePrefill(options.prefillData ?? null);
      setPrefillImageUrl(options.prefillImageUrl);
      setFormOpen(true);
    },
    [],
  );

  const openAddEvent = useCallback(() => {
    openEventForm(null, {});
  }, [openEventForm]);

  const handleFormClose = useCallback((open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditEvent(null);
      setVoicePrefill(null);
      setPrefillImageUrl(undefined);
    }
  }, []);

  const handleDetailClose = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setSelectedEventId(null);
      setDirectEvent(null);
    }
  }, []);

  const handleEditFromDetail = useCallback((event: IQXOEvent) => {
    // Close detail modal so it does not linger underneath holding stale state
    setDetailOpen(false);
    setEditEvent(event);
    setFormOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openEventDetail, openEventForm, openAddEvent }),
    [openEventDetail, openEventForm, openAddEvent],
  );

  return (
    <EventEditorContext.Provider value={value}>
      {children}
      {formOpen && (
        <Suspense fallback={null}>
          <EventFormModal
            open={formOpen}
            onOpenChange={handleFormClose}
            editEvent={editEvent}
            prefillData={voicePrefill}
            prefillImageUrl={prefillImageUrl}
          />
        </Suspense>
      )}
      {detailOpen && selectedEvent && (
        <Suspense fallback={null}>
          <EventDetailModal
            open={detailOpen}
            onOpenChange={handleDetailClose}
            event={selectedEvent}
            onEdit={handleEditFromDetail}
          />
        </Suspense>
      )}
    </EventEditorContext.Provider>
  );
}

export type {
  EventEditorContextValue,
};

