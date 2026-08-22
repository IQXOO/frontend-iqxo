import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";
import { useEventEditor } from "../lib/event-editor-context";

const MonthlyCalendarView = lazyNamed(() => import("../components/dashboard/monthly-calendar-view"), "MonthlyCalendarView");

export default function FuturePage() {
  const { openEventDetail } = useEventEditor();

  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="px-4 h-full overflow-y-auto">
        <MonthlyCalendarView onEventClick={openEventDetail} />
      </div>
    </Suspense>
  );
}
