import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { LoginPage } from "@/features/auth/login-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { PostListPage } from "@/features/posts/post-list-page";
import { PostDetailPage } from "@/features/posts/post-detail-page";
import { RenderListPage } from "@/features/renders/render-list-page";
import { NicheListPage } from "@/features/niches/niche-list-page";
import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { SocialPage } from "@/features/social/social-page";
import { CalendarPage } from "@/features/calendar/calendar-page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />

                <Route path="content" element={<PostListPage />} />
                <Route path="content/:id" element={<PostDetailPage />} />
                <Route path="renders" element={<RenderListPage />} />
                <Route path="social" element={<SocialPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="niches" element={<NicheListPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
