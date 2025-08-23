/** Parsea YYYY-MM-DD como fecha local SIN convertir a UTC ni desplazar día */
export function parseLocalDateStrict(input?: string | Date): Date {
  if (!input) return new Date(NaN);
  if (input instanceof Date) return input;
  // Espera 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm:ss'
  const s = String(input);
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7)) - 1;
  const d = Number(s.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(NaN);
  return new Date(y, m, d); // fecha local
}

/** Devuelve fecha legible 'dd MMM yy' o '-' si inválida */
export function formatDateDisplay(date?: string | Date): string {
  const d = parseLocalDateStrict(date as any);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }).format(d);
}
