// frontend/src/modules/gestion_huerta/utils/reportesPayload.ts

export const unwrapReportePayload = (json: any) => {
  if (!json) return json;
  if (json.data?.reporte) return json.data.reporte;
  if (json.reporte) return json.reporte;
  if (json.data) return json.data;
  return json;
};

export const isJsonContent = (ct?: string) =>
  !!ct && (ct.includes('application/json') || ct.includes('text/json'));

export const blobToJson = async (blob: Blob) => {
  const text = await blob.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getFilename = (cd?: string, fallback?: string) => {
  if (!cd) return fallback;
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  return m ? decodeURIComponent(m[1].replace(/"/g, '')) : fallback;
};
