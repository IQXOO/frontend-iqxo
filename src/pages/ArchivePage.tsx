import React, { Suspense } from "react";
import { lazyNamed } from "../lib/lazy";

const ArchiveVault = lazyNamed(() => import("../components/dashboard/archive-vault"), "ArchiveVault");

export default function ArchivePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <div className="px-4">
        <ArchiveVault />
      </div>
    </Suspense>
  );
}
