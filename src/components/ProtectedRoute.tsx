import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useApp } from "../lib/store";

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#E8E8E8] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#5BC0DE] animate-spin" />
    </div>
  );
}

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, authLoading } = useApp();

  // If still loading auth, render dark branded spinner instead of null (prevents blank white screen)
  if (authLoading) return <RouteFallback />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
