import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";

const WorkScheduleView = lazyNamed(() => import("../components/dashboard/work-schedule-view"), "WorkScheduleView");

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 py-6 space-y-4 animate-pulse">
          <div className="h-8 w-40 rounded-xl bg-secondary/40" />
          <div className="h-48 rounded-2xl bg-secondary/30" />
        </div>
      }
    >
      <div className="px-4">
        <WorkScheduleView />
      </div>
    </Suspense>
  );
}
