import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DashboardHeader } from "../components/dashboard/header";
import { BottomNav } from "../components/dashboard/bottom-nav";
import { useApp } from "../lib/store";
import { navigateToPath } from "../lib/navigation";
import { CommandPalette } from "../components/dashboard/command-palette";
import { exportEventsToPDF } from "../lib/export-pdf";
import { EventEditorProvider, useEventEditor } from "../lib/event-editor-context";

function AppLayoutContent() {
  const { events, signOut, toggleTheme, user } = useApp();
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const { openEventDetail, openAddEvent } = useEventEditor();

  // Map pathname to BottomNav active tab (simple)
  const path = location.pathname;
  const active = path.startsWith("/archive")
    ? "history"
    : path.startsWith("/profile")
    ? "settings"
    : "home";

  const openCommandPalette = () => setCommandOpen(true);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-background text-foreground relative">
      <DashboardHeader
        onProfileClick={() => navigateToPath("/profile")}
        onSettingsClick={() => navigateToPath("/profile")}
        onSearchClick={openCommandPalette}
        activeTab={active as any}
      />

      <main className="pb-28">
        <Outlet />
      </main>

      <BottomNav active={active as any} />

      <CommandPalette
        isOpen={commandOpen}
        onOpenChange={setCommandOpen}
        onAddEvent={() => {
          setCommandOpen(false);
          navigateToPath("/home");
          window.setTimeout(() => openAddEvent(), 0);
        }}
        onToggleDarkMode={() => {
          toggleTheme();
        }}
        onExportPDF={() => {
          exportEventsToPDF(events, user?.email || "user@example.com");
        }}
        onLogout={async () => {
          await signOut();
        }}
        onEventSelect={(event) => {
          setCommandOpen(false);
          navigateToPath("/home");
          window.setTimeout(() => openEventDetail(event), 0);
        }}
      />
    </div>
  );
}

export default function AppLayout() {
  return (
    <EventEditorProvider>
      <AppLayoutContent />
    </EventEditorProvider>
  );
}
