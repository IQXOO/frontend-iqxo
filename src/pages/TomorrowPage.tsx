import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";
import { useEventEditor } from "../lib/event-editor-context";

const TomorrowView = lazyNamed(() => import("../components/dashboard/tomorrow-view"), "TomorrowView");

export default function TomorrowPage() {
  const { openEventDetail } = useEventEditor();

  return (
    <Suspense
      fallback={
        <div className="px-5 py-6 space-y-3 animate-pulse">
          <div className="h-6 w-32 rounded-lg bg-secondary/40" />
          <div className="h-24 rounded-2xl bg-secondary/30" />
          <div className="h-24 rounded-2xl bg-secondary/30" />
        </div>
      }
    >
      <div className="px-4">
        <TomorrowView onEventClick={openEventDetail} />
      </div>
    </Suspense>
  );
}
