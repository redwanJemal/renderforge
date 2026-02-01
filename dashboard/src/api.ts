import { TemplateInfo, Theme, RenderJob, Format } from './types';

const BASE = '/api';

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getTemplates(): Promise<TemplateInfo[]> {
  const data = await fetchJSON<{ templates: TemplateInfo[] }>(`${BASE}/templates`);
  return data.templates;
}

export async function getTemplate(id: string): Promise<TemplateInfo> {
  return fetchJSON<TemplateInfo>(`${BASE}/templates/${id}`);
}

export async function getThemes(): Promise<Theme[]> {
  const data = await fetchJSON<{ themes: Theme[] }>(`${BASE}/themes`);
  return data.themes;
}

export async function submitRender(params: {
  templateId: string;
  props: Record<string, any>;
  theme: string;
  format: Format;
  outputFormat?: 'mp4' | 'webm' | 'gif';
}): Promise<{ jobId: string }> {
  return fetchJSON<{ jobId: string }>(`${BASE}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function getRenderStatus(jobId: string): Promise<RenderJob> {
  return fetchJSON<RenderJob>(`${BASE}/render/${jobId}`);
}

export function getDownloadUrl(jobId: string): string {
  return `${BASE}/render/${jobId}/download`;
}

export function getPreviewUrl(params: {
  template: string;
  format: Format;
  theme: string;
  props: Record<string, any>;
  frame?: number;
}): string {
  const qs = new URLSearchParams({
    template: params.template,
    format: params.format,
    theme: params.theme,
    props: JSON.stringify(params.props),
    frame: String(params.frame ?? 0),
  });
  return `${BASE}/preview?${qs}`;
}
