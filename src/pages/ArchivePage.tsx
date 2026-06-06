import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";
import { useEventEditor } from "../lib/event-editor-context";

const ArchiveVault = lazyNamed(() => import("../components/dashboard/archive-vault"), "ArchiveVault");

export default function ArchivePage() {
  const { openEventDetail } = useEventEditor();

  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="px-4">
        <ArchiveVault onEventClick={openEventDetail} />
      </div>
    </Suspense>
  );
}
