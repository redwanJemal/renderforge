import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Template = {
  id: string;
  name: string;
  category: string;
  formats: string[];
};

type TemplatesResponse = {
  items: Template[];
  total: number;
};

export type { Template };

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => api.get<TemplatesResponse>("/api/templates"),
  });
}

type Theme = {
  id: string;
  name: string;
};

export type { Theme };

export function useThemes() {
  return useQuery({
    queryKey: ["themes"],
    queryFn: () => api.get<{ items: Theme[]; total: number }>("/api/templates/themes"),
  });
}
