import { describe, it, expect, afterEach } from 'vitest';
import { formatDayMonthForDisplay } from './dateFormat';

describe('formatDayMonthForDisplay', () => {
  const originalTimezone = process.env.TZ;

  afterEach(() => {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  });

  it('renders dd/mm without the year', () => {
    process.env.TZ = 'UTC';
    expect(formatDayMonthForDisplay('2026-11-26T12:00:00.000Z')).toBe('26/11');
  });

  it('pads the day and the month to two digits', () => {
    process.env.TZ = 'UTC';
    expect(formatDayMonthForDisplay('2026-03-05T12:00:00.000Z')).toBe('05/03');
  });

  it('renders the day in the viewer timezone (America/Sao_Paulo)', () => {
    process.env.TZ = 'America/Sao_Paulo';
    // why: 01:30 UTC is still the previous evening in UTC-3
    expect(formatDayMonthForDisplay('2026-12-01T01:30:00.000Z')).toBe('30/11');
    expect(formatDayMonthForDisplay('2026-12-01T12:00:00.000Z')).toBe('01/12');
  });

  it('follows the timezone of the runtime', () => {
    process.env.TZ = 'UTC';
    expect(formatDayMonthForDisplay('2026-12-01T01:30:00.000Z')).toBe('01/12');
  });

  it('accepts Date instances', () => {
    process.env.TZ = 'UTC';
    expect(formatDayMonthForDisplay(new Date('2026-09-30T09:05:00.000Z'))).toBe('30/09');
  });

  it('falls back to "-" for missing values', () => {
    expect(formatDayMonthForDisplay(null)).toBe('-');
    expect(formatDayMonthForDisplay(undefined)).toBe('-');
    expect(formatDayMonthForDisplay('')).toBe('-');
  });

  it('falls back to "-" for invalid values, never "Invalid Date"', () => {
    expect(formatDayMonthForDisplay('not-a-date')).toBe('-');
    expect(formatDayMonthForDisplay('2026-13-45T00:00:00.000Z')).toBe('-');
    expect(formatDayMonthForDisplay(new Date('not-a-date'))).toBe('-');
  });
});
