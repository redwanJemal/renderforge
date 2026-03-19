import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────

export type QuranTheme = {
  name: string;
  accent: string;
  secondary: string;
  highlight: string;
  bg: string[];
};

export type Reciter = { id: number; name: string };
export type Translation = { id: number; name: string; language: string };

export type QuranMeta = {
  themes: QuranTheme[];
  reciters: Reciter[];
  translations: Translation[];
};

export type Surah = {
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  revelation_place: string;
};

export type QuranPreviewPart = {
  title: string;
  ayahRange: string;
  ayahCount: number;
  durationMs: number;
  audioStartMs: number;
  sceneCount: number;
};

export type QuranPreview = {
  surahName: string;
  surahNameArabic: string;
  surahNumber: number;
  totalAyahs: number;
  totalDurationMs: number;
  audioUrl: string;
  reciterName: string;
  theme: QuranTheme;
  parts: QuranPreviewPart[];
};

export type QuranCreateParams = {
  surahNumber: number;
  reciterId: number;
  ayahStart?: number;
  ayahEnd?: number;
  translationId: number;
  themeIndex: number;
  projectId: string;
  nicheId: string;
  format: string;
  brandName?: string;
  socialHandle?: string;
  ctaText?: string;
};

export type QuranCreateResult = {
  created: number;
  posts: Array<{
    id: string;
    title: string;
    ayahRange: string;
    ayahCount: number;
    durationMs: number;
  }>;
};

// ── Hooks ────────────────────────────────────────────────────────────────

export function useQuranMeta() {
  return useQuery({
    queryKey: ["quran", "meta"],
    queryFn: () => api.get<QuranMeta>("/api/quran/meta"),
    staleTime: Infinity, // never changes
  });
}

export function useQuranSurahs() {
  return useQuery({
    queryKey: ["quran", "surahs"],
    queryFn: () => api.get<Surah[]>("/api/quran/surahs"),
    staleTime: Infinity,
  });
}

export function useQuranPreview() {
  return useMutation({
    mutationFn: (params: {
      surahNumber: number;
      reciterId: number;
      ayahStart?: number;
      ayahEnd?: number;
      translationId: number;
      themeIndex: number;
    }) => api.post<QuranPreview>("/api/quran/preview", params),
  });
}

export function useQuranCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: QuranCreateParams) =>
      api.post<QuranCreateResult>("/api/quran/create", params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
