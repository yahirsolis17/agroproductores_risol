export const emptyStringToNull = (value: unknown, originalValue: unknown) => {
  if (typeof originalValue === 'string' && originalValue.trim() === '') {
    return null;
  }
  return value;
};

export const parseNumber = (value: unknown, originalValue: unknown) => {
  if (typeof originalValue === 'string') {
    const cleaned = originalValue.replace(/,/g, '').trim();
    if (cleaned === '') return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return value;
};

export const trimString = (value: unknown, originalValue: unknown) => {
  if (typeof originalValue === 'string') {
    return originalValue.trim();
  }
  return value;
};
