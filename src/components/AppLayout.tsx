import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DashboardHeader } from "../components/dashboard/header";
import { BottomNav } from "../components/dashboard/bottom-nav";
import { useApp } from "../lib/store";
import { navigateToPath } from "../lib/navigation";

export default function AppLayout() {
  const { theme } = useApp();
  const location = useLocation();

  // Map pathname to BottomNav active tab (simple)
  const path = location.pathname;
  const active = path.startsWith("/archive")
    ? "history"
    : path.startsWith("/profile")
    ? "settings"
    : "home";

  return (
    <div className="min-h-screen max-w-md mx-auto bg-background text-foreground relative">
      <DashboardHeader
        onProfileClick={() => navigateToPath("/profile")}
        onSettingsClick={() => navigateToPath("/profile")}
        onHomeClick={() => navigateToPath("/home")}
        activeTab={active as any}
      />

      <main className="pb-28">
        <Outlet />
      </main>

      <BottomNav active={active as any} />
    </div>
  );
}
