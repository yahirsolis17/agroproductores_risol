import { describe, expect, it } from 'vitest';

import {
  formatWithThousands,
  normalizeNumericInput,
  parseDecimalInput,
  parseIntegerInput,
  stripThousandsSeparators,
} from '../numericInput';

describe('numericInput utils', () => {
  it('stripThousandsSeparators remueve comas y espacios', () => {
    expect(stripThousandsSeparators(' 12,345.50 ')).toBe('12345.50');
  });

  it('normalizeNumericInput soporta decimales y precision maxima', () => {
    expect(normalizeNumericInput('0012.3456', { allowDecimal: true, maxDecimals: 2 })).toBe('12.34');
  });

  it('normalizeNumericInput soporta negativos cuando se permiten', () => {
    expect(normalizeNumericInput('-0012', { allowDecimal: false, allowNegative: true })).toBe('-12');
  });

  it('formatWithThousands agrupa miles sin perder decimales', () => {
    expect(formatWithThousands('12345.6', { allowDecimal: true })).toBe('12,345.6');
  });

  it('parseIntegerInput trunca a entero', () => {
    expect(parseIntegerInput('12,345.99')).toBe(12345);
  });

  it('parseDecimalInput interpreta texto con separadores', () => {
    expect(parseDecimalInput('12,345.50')).toBe(12345.5);
  });
});
