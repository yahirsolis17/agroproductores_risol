import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatDateLongEs,
  formatISODate,
  getTodayLocalISO,
  parseLocalDateStrict,
} from '../date';

describe('date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parseLocalDateStrict mantiene la fecha local sin desplazar el dia', () => {
    const parsed = parseLocalDateStrict('2026-03-27T23:59:59Z');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(27);
  });

  it('parseLocalDateStrict completa mes y dia faltantes', () => {
    const parsed = parseLocalDateStrict('2026-04');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(3);
    expect(parsed.getDate()).toBe(1);
  });

  it('getTodayLocalISO usa la fecha local actual', () => {
    vi.setSystemTime(new Date(2026, 2, 27, 10, 15, 0));

    expect(getTodayLocalISO()).toBe('2026-03-27');
  });

  it('formatISODate conserva solo la parte local de la fecha', () => {
    expect(formatISODate('2026-03-27T18:30:00Z')).toBe('2026-03-27');
  });

  it('formatDateLongEs devuelve un formato legible en espanol', () => {
    expect(formatDateLongEs('2026-01-05')).toBe('5 de enero del 2026');
  });
});
