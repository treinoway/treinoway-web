import { describe, it, expect } from 'vitest';
import {
  formatLastSessionAt,
  formatPeriodRangeShort,
  formatDayMonthShort,
  dateInputToIso,
  isoToDateInput,
} from './formatDashboardDate';

describe('formatLastSessionAt', () => {
  it('returns "-" for null/undefined input', () => {
    expect(formatLastSessionAt(null)).toBe('-');
    expect(formatLastSessionAt(undefined)).toBe('-');
  });

  it('returns "-" for invalid date strings', () => {
    expect(formatLastSessionAt('not-a-date')).toBe('-');
  });

  it('returns "hoje, HH:mm" when the input is the same calendar day', () => {
    const now = new Date(2026, 4, 2, 9, 0, 0); // 2 May 2026 09:00
    const sessionAt = new Date(2026, 4, 2, 18, 25, 0);
    expect(formatLastSessionAt(sessionAt, now)).toBe('hoje, 18:25');
  });

  it('zero-pads the minutes', () => {
    const now = new Date(2026, 4, 2, 9, 0, 0);
    const sessionAt = new Date(2026, 4, 2, 7, 5, 0);
    expect(formatLastSessionAt(sessionAt, now)).toBe('hoje, 07:05');
  });

  it('returns "DD de mes" for older sessions', () => {
    const now = new Date(2026, 4, 2);
    const sessionAt = new Date(2026, 4, 1, 10, 0, 0);
    expect(formatLastSessionAt(sessionAt, now)).toBe('1 de mai');
  });

  it('uses Portuguese short month names', () => {
    const now = new Date(2026, 5, 1);
    expect(formatLastSessionAt(new Date(2026, 0, 15), now)).toBe('15 de jan');
    expect(formatLastSessionAt(new Date(2026, 4, 31), now)).toBe('31 de mai');
  });
});

describe('formatPeriodRangeShort', () => {
  it('returns "" for missing endpoints', () => {
    expect(formatPeriodRangeShort(null, null)).toBe('');
    expect(formatPeriodRangeShort('2026-01-01T00:00:00Z', null)).toBe('');
  });

  it('formats a window using local time', () => {
    // Build dates in local time so the test does not depend on the host TZ.
    const from = new Date(2026, 2, 1).toISOString();
    const to = new Date(2026, 2, 30).toISOString();
    expect(formatPeriodRangeShort(from, to)).toBe('1 de mar – 30 de mar');
  });

  it('handles cross-month windows', () => {
    const from = new Date(2026, 1, 15).toISOString();
    const to = new Date(2026, 3, 1).toISOString();
    expect(formatPeriodRangeShort(from, to)).toBe('15 de fev – 1 de abr');
  });
});

describe('formatDayMonthShort', () => {
  it('returns empty for null', () => {
    expect(formatDayMonthShort(null)).toBe('');
  });

  it('formats a date as "12 de mar"', () => {
    const date = new Date(2026, 2, 12); // local time
    expect(formatDayMonthShort(date)).toBe('12 de mar');
  });
});

describe('dateInputToIso / isoToDateInput', () => {
  it('round-trips YYYY-MM-DD <-> ISO at UTC midnight', () => {
    expect(dateInputToIso('2026-05-01')).toBe('2026-05-01T00:00:00.000Z');
    expect(isoToDateInput('2026-05-01T00:00:00.000Z')).toBe('2026-05-01');
  });

  it('returns null for empty input', () => {
    expect(dateInputToIso('')).toBe(null);
    expect(dateInputToIso(null)).toBe(null);
  });

  it('returns null for invalid format', () => {
    expect(dateInputToIso('05/01/2026')).toBe(null);
  });

  it('returns "" when input cannot be parsed', () => {
    expect(isoToDateInput('not-a-date')).toBe('');
    expect(isoToDateInput(null)).toBe('');
  });
});
