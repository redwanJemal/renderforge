import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated" | "needs-setup"
  >("loading");

  useEffect(() => {
    // First check if setup is needed (no users in DB)
    fetch("/api/setup/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.needsSetup) {
          setStatus("needs-setup");
          return;
        }

        // Setup done — check auth
        const token = localStorage.getItem("rf_token");
        const userStr = localStorage.getItem("rf_user");

        if (!token || !userStr) {
          setStatus("unauthenticated");
          return;
        }

        try {
          const user = JSON.parse(userStr);
          useAuthStore.getState().setAuth(token, user);

          useAuthStore
            .getState()
            .fetchMe()
            .then(() => {
              setStatus("authenticated");
            })
            .catch(() => {
              useAuthStore.getState().logout();
              setStatus("unauthenticated");
            });
        } catch {
          localStorage.removeItem("rf_token");
          localStorage.removeItem("rf_user");
          setStatus("unauthenticated");
        }
      })
      .catch(() => {
        // API unreachable — fall back to auth check
        const token = localStorage.getItem("rf_token");
        if (!token) {
          setStatus("unauthenticated");
        } else {
          setStatus("authenticated");
        }
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "needs-setup") {
    return <Navigate to="/setup" replace />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
