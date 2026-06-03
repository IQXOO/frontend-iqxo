import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";

const FutureExplorerView = lazyNamed(() => import("../components/dashboard/future-explorer-view"), "FutureExplorerView");

export default function FuturePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="px-4">
        <FutureExplorerView />
      </div>
    </Suspense>
  );
}
