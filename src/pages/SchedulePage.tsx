import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";

const WorkScheduleView = lazyNamed(() => import("../components/dashboard/work-schedule-view"), "WorkScheduleView");

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="px-4">
        <WorkScheduleView />
      </div>
    </Suspense>
  );
}
