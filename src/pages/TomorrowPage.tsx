import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";
import { useEventEditor } from "../lib/event-editor-context";

const TomorrowView = lazyNamed(() => import("../components/dashboard/tomorrow-view"), "TomorrowView");

export default function TomorrowPage() {
  const { openEventDetail } = useEventEditor();

  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="px-4">
        <TomorrowView onEventClick={openEventDetail} />
      </div>
    </Suspense>
  );
}
