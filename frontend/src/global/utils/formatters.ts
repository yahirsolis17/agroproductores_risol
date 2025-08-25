export function formatCurrency(value: number): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value ?? 0);
  } catch {
    return `$${(value ?? 0).toFixed(2)}`;
  }
}

export function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(value ?? 0);
  } catch {
    return String(Math.round(value ?? 0));
  }
}

/** ROI con 1 decimal (consistente con PDF/Excel) */
export function formatPercent1(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toFixed(1)}%`;
}

/** ➕ Formato FULL para tooltip (sin notación compacta) */
export const formatCurrencyFull = (
  value: number | string,
  {
    locale = 'es-MX',
    currency = 'MXN',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  }: {
    locale?: string;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
) => {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(safe);
};
