import { describe, it, expect } from 'vitest';
import { formatCurrencyBRL, parseCurrencyBRL, formatAmountBRL, formatCurrencyCompactBRL } from './currencyFormat';

describe('formatCurrencyBRL', () => {
  it('formats a numeric string as BRL currency', () => {
    expect(formatCurrencyBRL('270.00')).toMatch(/R\$\s?270,00/);
  });

  it('formats a number as BRL currency', () => {
    expect(formatCurrencyBRL(1234.5)).toMatch(/R\$\s?1\.234,50/);
  });

  it('returns a dash for empty or invalid input', () => {
    expect(formatCurrencyBRL(null)).toBe('-');
    expect(formatCurrencyBRL(undefined)).toBe('-');
    expect(formatCurrencyBRL('')).toBe('-');
    expect(formatCurrencyBRL('not-a-number')).toBe('-');
  });
});

describe('formatAmountBRL', () => {
  it('formats numbers without currency symbol', () => {
    expect(formatAmountBRL(270)).toBe('270,00');
  });

  it('returns empty string for invalid input', () => {
    expect(formatAmountBRL('')).toBe('');
    expect(formatAmountBRL('abc')).toBe('');
  });
});

describe('formatCurrencyCompactBRL', () => {
  it('formats sub-million values exactly like formatCurrencyBRL', () => {
    expect(formatCurrencyCompactBRL(2500)).toMatch(/R\$\s?2\.500,00/);
  });

  it('abbreviates values at or above one million as "R$ X,X mi"', () => {
    expect(formatCurrencyCompactBRL(1200000)).toBe('R$ 1,2 mi');
    expect(formatCurrencyCompactBRL(1000000)).toBe('R$ 1,0 mi');
  });

  it('returns a dash for empty or invalid input', () => {
    expect(formatCurrencyCompactBRL(null)).toBe('-');
    expect(formatCurrencyCompactBRL(undefined)).toBe('-');
    expect(formatCurrencyCompactBRL('not-a-number')).toBe('-');
  });
});

describe('parseCurrencyBRL', () => {
  it('parses brazilian formatted strings', () => {
    expect(parseCurrencyBRL('1.234,56')).toBe(1234.56);
    expect(parseCurrencyBRL('270,00')).toBe(270);
    expect(parseCurrencyBRL('100')).toBe(100);
  });

  it('returns null for invalid input', () => {
    expect(parseCurrencyBRL('')).toBe(null);
    expect(parseCurrencyBRL('abc')).toBe(null);
    expect(parseCurrencyBRL(null)).toBe(null);
  });
});
