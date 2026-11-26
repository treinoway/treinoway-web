import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatExpiresIn } from './studentFeedback';

// An instant of November 2026 in the local time of the machine, so the day boundaries of the tests are local ones
const local = (day, hour = 12, minute = 0) => new Date(2026, 10, day, hour, minute);

const NOW = local(24, 10);

describe('formatExpiresIn: deadline today', () => {
  it('says "Expira hoje" when the deadline is later on the same local day', () => {
    expect(formatExpiresIn(local(24, 18), NOW)).toBe('Expira hoje');
  });

  it('says "Expira hoje" up to the last minute of the day', () => {
    expect(formatExpiresIn(local(24, 23, 59), NOW)).toBe('Expira hoje');
  });

  it('says "Expira hoje" when only one minute is left', () => {
    expect(formatExpiresIn(local(24, 10, 1), NOW)).toBe('Expira hoje');
  });
});

describe('formatExpiresIn: deadline tomorrow', () => {
  it('says "Expira amanhã" when the deadline is on the next local day', () => {
    expect(formatExpiresIn(local(25, 10), NOW)).toBe('Expira amanhã');
  });

  it('counts calendar days, not 24h periods: two minutes across midnight is already tomorrow', () => {
    expect(formatExpiresIn(local(25, 0, 1), local(24, 23, 59))).toBe('Expira amanhã');
  });

  it('says "Expira amanhã" for a deadline at the end of the next day, almost 48h away', () => {
    expect(formatExpiresIn(local(25, 23, 59), local(24, 0, 1))).toBe('Expira amanhã');
  });
});

describe('formatExpiresIn: deadline in more days', () => {
  it.each([
    [2, 26],
    [3, 27],
    [6, 30],
  ])('says "Expira em %i dias"', (days, day) => {
    expect(formatExpiresIn(local(day, 10), NOW)).toBe(`Expira em ${days} dias`);
  });

  it('counts calendar days whatever the hours: late today to early in two days is 2 days', () => {
    expect(formatExpiresIn(local(26, 0, 1), local(24, 23, 59))).toBe('Expira em 2 dias');
  });

  it('counts across the end of the month', () => {
    expect(formatExpiresIn(new Date(2026, 11, 1, 9, 0), local(24, 10))).toBe('Expira em 7 dias');
    expect(formatExpiresIn(new Date(2026, 11, 2, 9, 0), local(30, 22))).toBe('Expira em 2 dias');
  });

  it('counts across the end of the year', () => {
    expect(formatExpiresIn(new Date(2027, 0, 2, 9, 0), new Date(2026, 11, 30, 9, 0))).toBe('Expira em 3 dias');
  });
});

describe('formatExpiresIn: input formats', () => {
  it('reads the ISO string the service sends', () => {
    expect(formatExpiresIn(local(27, 9).toISOString(), NOW)).toBe('Expira em 3 dias');
    expect(formatExpiresIn(local(24, 18).toISOString(), NOW)).toBe('Expira hoje');
  });

  it('compares with the current time when `now` is left out', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);

    expect(formatExpiresIn(local(25, 9).toISOString())).toBe('Expira amanhã');
    expect(formatExpiresIn(local(24, 9).toISOString())).toBeNull();
  });
});

describe('formatExpiresIn: nothing to say', () => {
  it('is null once the deadline has passed, even earlier on the same day', () => {
    expect(formatExpiresIn(local(24, 9, 59), NOW)).toBeNull();
    expect(formatExpiresIn(local(23, 18), NOW)).toBeNull();
    expect(formatExpiresIn(local(1), NOW)).toBeNull();
  });

  it('is null at the very instant of the deadline', () => {
    expect(formatExpiresIn(local(24, 10), NOW)).toBeNull();
    expect(formatExpiresIn(NOW.toISOString(), NOW)).toBeNull();
  });

  it.each([[null], [undefined], [''], ['not a date']])('is null when the deadline is %j', (expiresAt) => {
    expect(formatExpiresIn(expiresAt, NOW)).toBeNull();
  });
});

afterEach(() => {
  vi.useRealTimers();
});
