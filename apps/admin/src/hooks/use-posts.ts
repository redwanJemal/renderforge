import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Post = {
  id: string;
  nicheId: string;
  title: string;
  status: string;
  theme: string;
  templateId: string;
  format: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  scenes?: Scene[];
};

type Scene = {
  id: string;
  postId: string;
  sortOrder: number;
  key: string;
  displayText: string;
  narrationText: string;
  audioUrl: string | null;
  durationSeconds: string | null;
  entrance: string;
  textSize: string;
};

type PostsResponse = {
  items: Post[];
  total: number;
  page: number;
  totalPages: number;
};

export type { Post, Scene, PostsResponse };

export function usePosts(
  filters: {
    nicheId?: string;
    status?: string;
    search?: string;
    page?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.nicheId) params.set("nicheId", filters.nicheId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));

  return useQuery({
    queryKey: ["posts", filters],
    queryFn: () => api.get<PostsResponse>(`/api/posts?${params}`),
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: ["posts", id],
    queryFn: () => api.get<Post>(`/api/posts/${id}`),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Partial<Post>, "scenes"> & { scenes?: Partial<Scene>[] }) =>
      api.post<Post>("/api/posts", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Post>) =>
      api.put<Post>(`/api/posts/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUpdatePostStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/posts/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUpsertScenes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      scenes,
    }: {
      postId: string;
      scenes: Partial<Scene>[];
    }) => api.put(`/api/posts/${postId}/scenes`, scenes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}
