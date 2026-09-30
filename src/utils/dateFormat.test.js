import { formatDateForDisplay, formatDateTimeForDisplay } from './dateFormat';

describe('formatDateForDisplay', () => {
  it('formats date-only strings without any timezone shift', () => {
    expect(formatDateForDisplay('2026-09-30')).toBe('30/09/2026');
  });

  it('keeps formatting timestamps in UTC', () => {
    expect(formatDateForDisplay('2026-09-30T01:30:00.000Z')).toBe('30/09/2026');
  });

  it('falls back to "-" for empty or invalid values', () => {
    expect(formatDateForDisplay(null)).toBe('-');
    expect(formatDateForDisplay('not-a-date')).toBe('-');
  });
});

describe('formatDateTimeForDisplay', () => {
  const originalTimezone = process.env.TZ;

  afterEach(() => {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  });

  it('renders the day in the viewer timezone (America/Sao_Paulo)', () => {
    process.env.TZ = 'America/Sao_Paulo';
    // 01:30 UTC is still the previous evening in UTC-3.
    expect(formatDateTimeForDisplay('2026-09-30T01:30:00.000Z')).toBe('29/09/2026');
    expect(formatDateTimeForDisplay('2026-09-30T12:00:00.000Z')).toBe('30/09/2026');
  });

  it('follows the timezone of the runtime', () => {
    process.env.TZ = 'UTC';
    expect(formatDateTimeForDisplay('2026-09-30T01:30:00.000Z')).toBe('30/09/2026');
  });

  it('accepts Date instances', () => {
    const date = new Date('2026-09-30T12:00:00.000Z');
    expect(formatDateTimeForDisplay(date)).toBe(date.toLocaleDateString('pt-BR'));
  });

  it('falls back to "-" for null, empty and invalid values, never "Invalid Date"', () => {
    expect(formatDateTimeForDisplay(null)).toBe('-');
    expect(formatDateTimeForDisplay(undefined)).toBe('-');
    expect(formatDateTimeForDisplay('')).toBe('-');
    expect(formatDateTimeForDisplay('not-a-date')).toBe('-');
  });
});
