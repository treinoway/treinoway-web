import { describe, it, expect } from 'vitest';
import { formatCurrencyBRL, parseCurrencyBRL, formatAmountBRL } from './currencyFormat';

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
