import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ImageLibraryItem = {
  id: string;
  filename: string;
  s3Key: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  tags: string[] | null;
  category: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  url: string; // presigned URL
};

export type ImagesResponse = {
  items: ImageLibraryItem[];
  total: number;
  page: number;
  totalPages: number;
};

export function useImages(filters?: { category?: string; tags?: string; search?: string; page?: number; perPage?: number }) {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.tags) params.set("tags", filters.tags);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.perPage) params.set("perPage", String(filters.perPage));
  const qs = params.toString();

  return useQuery({
    queryKey: ["images", filters],
    queryFn: () => api.get<ImagesResponse>(`/api/images${qs ? `?${qs}` : ""}`),
  });
}

export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("rf_token");
      const res = await fetch("/api/images", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      return res.json() as Promise<ImageLibraryItem>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["images"] }),
  });
}

export function useUpdateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; tags?: string[]; category?: string; description?: string }) => {
      return api.put<ImageLibraryItem>(`/api/images/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["images"] }),
  });
}

export function useDeleteImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<{ success: boolean }>(`/api/images/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["images"] }),
  });
}
