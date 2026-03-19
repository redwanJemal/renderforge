import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Niche = {
  id: string;
  slug: string;
  name: string;
  projectId: string | null;
  defaultTemplateId: string;
  voiceId: string;
  languages: string[];
  config: Record<string, unknown>;
};

type NichesResponse = {
  items: Niche[];
  total: number;
  page: number;
  totalPages: number;
};

export function useNiches() {
  return useQuery({
    queryKey: ["niches"],
    queryFn: () => api.get<NichesResponse>("/api/niches"),
  });
}
