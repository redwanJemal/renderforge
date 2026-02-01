import { useState, useEffect } from 'react';
import { getTemplates, getThemes } from '../api';
import { TemplateInfo, Theme } from '../types';

export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [tpls, thms] = await Promise.all([getTemplates(), getThemes()]);
        if (!cancelled) {
          setTemplates(tpls);
          setThemes(thms);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { templates, themes, loading, error };
}
