import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useApp } from "../lib/store";

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { user, authLoading } = useApp();

  // If still loading auth, render nothing (caller may show global loader)
  if (authLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
