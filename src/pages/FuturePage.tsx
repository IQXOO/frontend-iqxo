import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";
import { useEventEditor } from "../lib/event-editor-context";

const FutureExplorerView = lazyNamed(() => import("../components/dashboard/future-explorer-view"), "FutureExplorerView");

export default function FuturePage() {
  const { openEventDetail } = useEventEditor();

  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="px-4">
        <FutureExplorerView onEventClick={openEventDetail} />
      </div>
    </Suspense>
  );
}
