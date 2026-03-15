import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { LoginPage } from "@/features/auth/login-page";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { PostDetailPage } from "@/features/posts/post-detail-page";
import { RenderDetailPage } from "@/features/renders/render-detail-page";
import { NicheListPage } from "@/features/niches/niche-list-page";
import { AnalyticsPage } from "@/features/analytics/analytics-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { ImageLibraryPage } from "@/features/images/image-library-page";
import { ProjectListPage } from "@/features/projects/project-list-page";
import { ProjectDetailPage } from "@/features/projects/project-detail-page";

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

                <Route path="projects" element={<ProjectListPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="content/:id" element={<PostDetailPage />} />
                <Route path="renders/:id" element={<RenderDetailPage />} />
                <Route path="images" element={<ImageLibraryPage />} />
                <Route path="niches" element={<NicheListPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />

                {/* Redirects for old routes */}
                <Route path="content" element={<Navigate to="/projects" replace />} />
                <Route path="renders" element={<Navigate to="/projects" replace />} />
                <Route path="social" element={<Navigate to="/projects" replace />} />
                <Route path="calendar" element={<Navigate to="/projects" replace />} />
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
