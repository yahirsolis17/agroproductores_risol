// Utils de fecha para evitar UTC y formatear bonito en español

/** Devuelve YYYY-MM-DD en hora local */
export function getLocalISODate(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formatea largo en es-MX (p.ej. "22 de agosto de 2025") */
export function formatFechaLargaEs(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? parseLocalDateStrict(dateInput) : dateInput;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Parseo ESTRICTO local para strings tipo:
 * - 'YYYY-MM-DD'  (interpreta fecha local SIN desfase)
 * - 'YYYY-MM-DDTHH:mm:ss[Z|±hh:mm]'  (usa Date estándar)
 */
export function parseLocalDateStrict(input: string): Date {
  if (!input) return new Date(NaN);
  // Si trae hora/zona, dejar que Date lo maneje
  if (/[Tt]/.test(input)) {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date(NaN) : d;
  }
  // YYYY-MM-DD → construir como fecha LOCAL (año, mes-1, día)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    return new Date(y, mo, da);
  }
  // Fallback
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date(NaN) : d;
}

export function parseNumberSafe(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const cleaned = v.replace(/\./g, '').replace(/,/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export const mxMoney = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
