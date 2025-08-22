// frontend/src/global/utils/formatters.ts
export const formatCurrency = (v: number, currency = 'MXN', locale = 'es-MX') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v || 0);

export const formatNumber = (v: number, locale = 'es-MX') =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v || 0);

export const formatPercentage = (v: number, locale = 'es-MX') =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v || 0)}%`;
