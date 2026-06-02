import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";

const TomorrowView = lazyNamed(() => import("../components/dashboard/tomorrow-view"), "TomorrowView");

export default function TomorrowPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="px-4">
        <TomorrowView />
      </div>
    </Suspense>
  );
}
