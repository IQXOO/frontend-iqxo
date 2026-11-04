import React from "react";
import { ArchiveVault } from "../components/dashboard/archive-vault";
import { useEventEditor } from "../lib/event-editor-context";

export default function ArchivePage() {
  const { openEventDetail } = useEventEditor();

  return (
    <div className="min-h-screen">
      <ArchiveVault onEventClick={openEventDetail} />
    </div>
  );
}
