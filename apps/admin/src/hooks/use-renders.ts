import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Render = {
  id: string;
  postId: string;
  postTitle: string | null;
  format: string;
  status: string;
  progress: number;
  outputUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
  fileSize: number | null;
  error: string | null;
  jobId: string | null;
  bgmTrackId: string | null;
  createdAt: string;
};

type RendersResponse = {
  items: Render[];
  total: number;
  page: number;
  totalPages: number;
};

export type { Render, RendersResponse };

export function useRenders(
  filters: { postId?: string; projectId?: string; status?: string; page?: number; perPage?: number } = {},
) {
  const params = new URLSearchParams();
  if (filters.postId) params.set("postId", filters.postId);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("perPage", String(filters.perPage));

  return useQuery({
    queryKey: ["renders", filters],
    queryFn: () => api.get<RendersResponse>(`/api/renders?${params}`),
    refetchInterval: 5000,
  });
}

export function useRender(id: string) {
  return useQuery({
    queryKey: ["renders", id],
    queryFn: () => api.get<Render>(`/api/renders/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === "rendering" || data.status === "queued")) return 3000;
      return false;
    },
  });
}

export function useCreateRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { postId: string; format: string; bgmTrackId?: string }) =>
      api.post<Render>("/api/renders", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["renders"] }),
  });
}

export function useCreateBatchRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { postIds: string[]; formats: string[]; bgmTrackId?: string }) =>
      api.post("/api/renders/batch", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["renders"] }),
  });
}

export function useCancelRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/renders/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["renders"] }),
  });
}

export function useBulkCancelRenders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post("/api/renders/bulk-cancel", { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["renders"] }),
  });
}

export function useDrainQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/renders/drain"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["renders"] }),
  });
}

export function useDeleteRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/renders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["renders"] }),
  });
}

export function useBulkDeleteRenders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post("/api/renders/bulk-delete", { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["renders"] }),
  });
}

export function usePublishRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { renderId: string; socialAccountIds: string[] }) =>
      api.post(`/api/renders/${data.renderId}/publish`, { socialAccountIds: data.socialAccountIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["renders"] }),
  });
}
