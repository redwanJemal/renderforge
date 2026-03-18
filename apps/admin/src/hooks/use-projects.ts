import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  socialHandles: Record<string, string>;
  colorPalette: Record<string, string>;
  defaultVoiceId: string | null;
  enableIntro: boolean;
  enableOutro: boolean;
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  postCount?: number;
  scheduleCount?: number;
};

export type ProjectSchedule = {
  id: string;
  projectId: string;
  templateId: string;
  format: string;
  theme: string | null;
  postsPerDay: number;
  daysOfWeek: number[];
  autoRender: boolean;
  enabled: boolean;
  createdAt: string;
};

export type ProjectDetail = Project & {
  schedules: ProjectSchedule[];
  linkedSocialAccounts: Array<{
    id: string;
    socialAccountId: string;
    provider: string;
    accountName: string | null;
  }>;
  nicheCount: number;
};

type ProjectsResponse = {
  items: Project[];
  total: number;
  page: number;
  totalPages: number;
};

type CalendarData = {
  schedules: ProjectSchedule[];
  postsByDay: Record<number, Array<{
    id: string;
    title: string;
    status: string;
    templateId: string | null;
    format: string | null;
    createdAt: string;
  }>>;
  expectedByDay: Record<number, Array<{
    templateId: string;
    format: string;
    count: number;
  }>>;
  fillRate: {
    totalExpected: number;
    totalActual: number;
    daysInMonth: number;
  };
};

export function useProjects(filters: { status?: string; page?: number; perPage?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("perPage", String(filters.perPage));

  return useQuery({
    queryKey: ["projects", filters],
    queryFn: () => api.get<ProjectsResponse>(`/api/projects?${params}`),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.get<ProjectDetail>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => api.post<Project>("/api/projects", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Project>) =>
      api.put<Project>(`/api/projects/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// Schedule hooks
export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...data }: { projectId: string } & Partial<ProjectSchedule>) =>
      api.post<ProjectSchedule>(`/api/projects/${projectId}/schedules`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, id, ...data }: { projectId: string; id: string } & Partial<ProjectSchedule>) =>
      api.put<ProjectSchedule>(`/api/projects/${projectId}/schedules/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, id }: { projectId: string; id: string }) =>
      api.delete(`/api/projects/${projectId}/schedules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// Social account link hooks
export function useLinkSocialAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, socialAccountId }: { projectId: string; socialAccountId: string }) =>
      api.post(`/api/projects/${projectId}/social-accounts`, { socialAccountId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUnlinkSocialAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, socialAccountId }: { projectId: string; socialAccountId: string }) =>
      api.delete(`/api/projects/${projectId}/social-accounts/${socialAccountId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

// Calendar
export function useProjectCalendar(projectId: string, month: number, year: number) {
  return useQuery({
    queryKey: ["projects", projectId, "calendar", month, year],
    queryFn: () => api.get<CalendarData>(`/api/projects/${projectId}/calendar?month=${month}&year=${year}`),
    enabled: !!projectId,
  });
}

// Run schedule
export function useRunSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      api.post<{ success: boolean; rendersCreated: number }>(`/api/projects/${projectId}/run-schedule`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renders"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
