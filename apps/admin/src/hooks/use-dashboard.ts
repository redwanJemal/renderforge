import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type DashboardStats = {
  totalPosts: number;
  totalRenders: number;
  pendingAudio: number;
  publishedThisWeek: number;
  rendersByStatus: Array<{ status: string; count: number }>;
  postsByNiche: Array<{ nicheId: string; nicheName: string; count: number }>;
};

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<DashboardStats>("/api/dashboard/stats"),
  });
}
