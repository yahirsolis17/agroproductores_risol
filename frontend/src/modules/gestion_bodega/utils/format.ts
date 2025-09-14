export function formatNumber(n?: number | string) {
  if (n === undefined || n === null) return '-';
  const num = typeof n === 'string' ? Number(n) : n;
  return new Intl.NumberFormat('es-MX').format(num);
}

export function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('es-MX');
}

