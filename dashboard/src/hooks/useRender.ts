import { useState, useRef, useCallback } from 'react';
import { submitRender, getRenderStatus, getDownloadUrl } from '../api';
import { RenderJob, Format } from '../types';

export function useRender() {
  const [job, setJob] = useState<RenderJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startRender = useCallback(async (params: {
    templateId: string;
    props: Record<string, any>;
    theme: string;
    format: Format;
    outputFormat?: 'mp4' | 'webm' | 'gif';
  }) => {
    stopPolling();
    setError(null);
    setSubmitting(true);
    setJob(null);

    try {
      const { jobId } = await submitRender(params);

      // Start polling
      const poll = async () => {
        try {
          const status = await getRenderStatus(jobId);
          setJob(status);

          if (status.status === 'complete' || status.status === 'failed') {
            stopPolling();
            if (status.status === 'failed') {
              setError(status.error || 'Render failed');
            }
          }
        } catch (e) {
          // polling error, keep trying
        }
      };

      // Initial poll
      await poll();

      pollRef.current = window.setInterval(poll, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit render');
    } finally {
      setSubmitting(false);
    }
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
    setError(null);
    setSubmitting(false);
  }, [stopPolling]);

  const downloadUrl = job?.status === 'complete' ? getDownloadUrl(job.id) : null;

  return { job, submitting, error, startRender, reset, downloadUrl };
}
