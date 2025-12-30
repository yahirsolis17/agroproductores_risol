// UI-only transforms for presentation (no dataset/business filtering).
export const takeTopN = <T>(arr: T[], n: number): T[] => arr.slice(0, n);

export const sortForDisplay = <T>(arr: T[], comparator: (a: T, b: T) => number): T[] =>
  [...arr].sort(comparator);

export const filterForDisplay = <T>(arr: T[], predicate: (value: T) => boolean): T[] =>
  arr.filter(predicate);

export const joinDisplayParts = (parts: Array<string | null | undefined>, separator = ' '): string =>
  filterForDisplay(parts, (p): p is string => Boolean(p && String(p).trim()))
    .map((p) => String(p).trim())
    .join(separator);
