export const unwrapReportePayload = (json: unknown): unknown => {
  const payload = json as Record<string, unknown> | null;
  if (!payload || typeof payload !== 'object') return json;

  const data = payload.data as Record<string, unknown> | undefined;
  if (data?.reporte) return data.reporte;
  if (payload.reporte) return payload.reporte;
  if (payload.data) return payload.data;
  return payload;
};

export const isJsonContent = (contentType?: string): boolean =>
  Boolean(contentType && (contentType.includes('application/json') || contentType.includes('text/json')));

export const blobToJson = async (blob: Blob): Promise<Record<string, unknown>> => {
  const text = await blob.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
};

export const downloadFile = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getFilename = (contentDisposition?: string, fallback = 'reporte'): string => {
  if (!contentDisposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(contentDisposition);
  return match ? decodeURIComponent(match[1].replace(/"/g, '')) : fallback;
};
