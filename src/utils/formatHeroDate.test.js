import { describe, it, expect } from 'vitest';
import formatHeroDateLabel from './formatHeroDate';

describe('formatHeroDateLabel', () => {
  it('formats a known date as "WEEKDAY, D DE MONTH" uppercase', () => {
    // 2026-07-14 is a Tuesday.
    const date = new Date(2026, 6, 14);
    expect(formatHeroDateLabel(date)).toBe('TERÇA, 14 DE JULHO');
  });

  it('formats a Monday correctly', () => {
    const date = new Date(2026, 6, 13);
    expect(formatHeroDateLabel(date)).toBe('SEGUNDA, 13 DE JULHO');
  });

  it('does not zero-pad the day of month', () => {
    const date = new Date(2026, 0, 5);
    expect(formatHeroDateLabel(date)).toContain('5 DE JANEIRO');
  });

  it('returns null for an invalid date', () => {
    expect(formatHeroDateLabel(new Date('not-a-date'))).toBeNull();
  });

  it('returns null when given a non-Date value', () => {
    expect(formatHeroDateLabel('2026-07-14')).toBeNull();
    expect(formatHeroDateLabel(null)).toBeNull();
    expect(formatHeroDateLabel(undefined)).not.toBeNull(); // defaults to "now"
  });

  it('defaults to the current date when called without arguments', () => {
    const result = formatHeroDateLabel();
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[A-ZÇÁÉÍÓÚÂÊÔÃÕ]+, \d{1,2} DE [A-ZÇÁÉÍÓÚÂÊÔÃÕ]+$/);
  });
});
