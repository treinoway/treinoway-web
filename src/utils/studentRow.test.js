import {
  formatAdherence,
  formatLastWorkout,
  getAdherenceTone,
  getLastWorkoutTone,
  getStudentDisplayName,
  resolveAdherence,
} from './studentRow';

const NOW = new Date('2026-10-10T12:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

describe('getStudentDisplayName', () => {
  it('joins first and last name', () => {
    expect(getStudentDisplayName({ firstName: 'Ana', lastName: 'Silva', email: 'a@x.com' })).toBe('Ana Silva');
  });

  it('falls back to email', () => {
    expect(getStudentDisplayName({ email: 'a@x.com' })).toBe('a@x.com');
  });
});

describe('formatLastWorkout', () => {
  it('returns null for missing or invalid dates', () => {
    expect(formatLastWorkout(null, NOW)).toBeNull();
    expect(formatLastWorkout('nope', NOW)).toBeNull();
  });

  it('formats today, yesterday, days and months', () => {
    expect(formatLastWorkout(daysAgo(0), NOW)).toBe('Hoje');
    expect(formatLastWorkout(daysAgo(1), NOW)).toBe('Ontem');
    expect(formatLastWorkout(daysAgo(2), NOW)).toBe('Há 2 dias');
    expect(formatLastWorkout(daysAgo(35), NOW)).toBe('Há 1 mês');
    expect(formatLastWorkout(daysAgo(95), NOW)).toBe('Há 3 meses');
  });
});

describe('formatAdherence', () => {
  it('rounds the percentage and handles null', () => {
    expect(formatAdherence(74.6)).toBe('75%');
    expect(formatAdherence(null)).toBeNull();
  });
});

describe('getAdherenceTone', () => {
  it.each([
    [100, 'success'],
    [80, 'success'],
    [79, 'warning'],
    [60, 'warning'],
    [59, 'error'],
    [0, 'error'],
  ])('maps %i%% to %s', (value, tone) => {
    expect(getAdherenceTone(value)).toBe(tone);
  });

  it('has no tone without data', () => {
    expect(getAdherenceTone(null)).toBeNull();
    expect(getAdherenceTone(undefined)).toBeNull();
  });
});

describe('resolveAdherence', () => {
  it('prefers the backend value, treats 0 expected as no data (null), otherwise null', () => {
    expect(resolveAdherence({ adherence: 50, adherenceExpected: 4 })).toBe(50);
    expect(resolveAdherence({ adherence: 0, adherenceExpected: 4 })).toBe(0);
    expect(resolveAdherence({ adherence: null, adherenceExpected: 0 })).toBeNull();
    expect(resolveAdherence({ adherence: 0, adherenceExpected: 0 })).toBeNull();
    expect(resolveAdherence({ adherence: null, adherenceExpected: null })).toBeNull();
    expect(resolveAdherence({})).toBeNull();
  });
});

describe('getLastWorkoutTone', () => {
  it.each([
    [0, 'success'],
    [1, null],
    [6, null],
    [7, 'warning'],
    [13, 'warning'],
    [14, 'error'],
    [60, 'error'],
  ])('maps %i days ago to %s', (days, tone) => {
    expect(getLastWorkoutTone(daysAgo(days), NOW)).toBe(tone);
  });

  it('is error when the student never trained or the date is invalid', () => {
    expect(getLastWorkoutTone(null, NOW)).toBe('error');
    expect(getLastWorkoutTone('nope', NOW)).toBe('error');
  });
});
