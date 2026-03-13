import { useEffect, useRef, useState } from "react";

type SSEProgress = {
  renderId: string;
  progress: number;
  status: string;
  message: string;
};

export type { SSEProgress };

export function useRenderSSE(renderId?: string) {
  const [progress, setProgress] = useState<SSEProgress | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!renderId) return;

    const url =
      renderId === "all"
        ? "/api/sse/renders"
        : `/api/sse/renders/${renderId}`;

    const source = new EventSource(url);
    sourceRef.current = source;

    source.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress(data);
      } catch {
        // ignore parse errors
      }
    });

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [renderId]);

  return progress;
}

export function useAllRendersSSE() {
  const [progressMap, setProgressMap] = useState<
    Record<string, SSEProgress>
  >({});

  useEffect(() => {
    const source = new EventSource("/api/sse/renders");

    source.addEventListener("progress", (e) => {
      try {
        const data: SSEProgress = JSON.parse(e.data);
        setProgressMap((prev) => ({ ...prev, [data.renderId]: data }));
      } catch {
        // ignore parse errors
      }
    });

    source.onerror = () => source.close();

    return () => source.close();
  }, []);

  return progressMap;
}
