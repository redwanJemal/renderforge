import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type BgmTrack = {
  id: string;
  name: string;
  fileUrl: string;
  durationSeconds: string;
  category: string | null;
  nicheId: string | null;
  createdAt: string;
};

export type { BgmTrack };

export function useBgmTracks(nicheId?: string) {
  const params = nicheId ? `?nicheId=${nicheId}` : "";
  return useQuery({
    queryKey: ["bgm", nicheId],
    queryFn: () => api.get<BgmTrack[]>(`/api/bgm${params}`),
  });
}
