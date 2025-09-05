/**
 * Utilidades de fecha en español (MX)
 *
 * - parseLocalDateStrict: parsea YYYY, YYYY-MM, YYYY-MM-DD y variantes ISO con tiempo
 *   en zona local, sin desplazar el día (evita problemas de UTC/zonas).
 * - formatDateDisplay: formato compacto 'dd MMM yy' (para ejes/etiquetas cortas)
 * - formatDateLongEs: formato largo '1 de enero del 2025' (para tablas y cabeceras)
 */

/**
 * Parsea fechas en formato local SIN desplazar día ni convertir a UTC.
 * Acepta:
 *  - 'YYYY'
 *  - 'YYYY-MM'
 *  - 'YYYY-MM-DD'
 *  - 'YYYY-MM-DDTHH:mm:ss[.sss][Z]'
 * Para 'YYYY' y 'YYYY-MM' se asume día 1.
 */
export function parseLocalDateStrict(input?: string | Date): Date {
  if (!input) return new Date(NaN);
  if (input instanceof Date) return input;
  const s = String(input).trim();
  // Si viene como ISO con tiempo, nos quedamos con la porción de fecha
  const core = s.includes('T') ? s.split('T', 1)[0] : s;
  const m = core.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!m) return new Date(NaN);
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) - 1 : 0; // Jan=0
  const day = m[3] ? Number(m[3]) : 1; // día 1 por defecto
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return new Date(NaN);
  return new Date(year, month, day);
}

/** Devuelve fecha legible 'dd MMM yy' o '-' si inválida */
export function formatDateDisplay(date?: string | Date): string {
  const d = parseLocalDateStrict(date as any);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }).format(d);
}

/** Devuelve fecha larga en español: '1 de enero del 2025' */
export function formatDateLongEs(date?: string | Date): string {
  const d = parseLocalDateStrict(date as any);
  if (isNaN(d.getTime())) return '-';
  const day = new Intl.NumberFormat('es-MX', { useGrouping: false }).format(d.getDate());
  const month = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(d);
  const year = d.getFullYear();
  return `${day} de ${month} del ${year}`;
}

