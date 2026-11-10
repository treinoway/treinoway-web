import { describe, it, expect } from 'vitest';
import { formatScore, formatCountdown, weekLabel } from './consistencyFormat';

describe('formatScore', () => {
  it('PAN-06 rounds to a whole percent', () => {
    expect(formatScore(84.4)).toBe('84%');
    expect(formatScore(84.5)).toBe('85%');
    expect(formatScore(0)).toBe('0%');
  });

  it('PAN-06 never shows 100 before 100', () => {
    expect(formatScore(99.6)).toBe('99%');
    expect(formatScore(99.99)).toBe('99%');
    expect(formatScore(100)).toBe('100%');
  });

  it('PAN-06 shows a dash for a neutral week', () => {
    expect(formatScore(null)).toBe('—');
    expect(formatScore(undefined)).toBe('—');
  });
});

describe('formatCountdown', () => {
  const closesAt = '2026-11-08T21:00:00.000Z';

  it('PAN-02 shows days and hours until the close', () => {
    expect(formatCountdown(closesAt, new Date('2026-11-04T14:00:00.000Z'))).toBe('4d 7h');
  });

  it('PAN-02 shows hours and minutes within the last day', () => {
    expect(formatCountdown(closesAt, new Date('2026-11-08T13:40:00.000Z'))).toBe('7h 20min');
  });

  it('PAN-02 shows only minutes within the last hour', () => {
    expect(formatCountdown(closesAt, new Date('2026-11-08T20:15:00.000Z'))).toBe('45min');
  });

  it('PAN-02 shows zero once the close has passed', () => {
    expect(formatCountdown(closesAt, new Date('2026-11-09T00:00:00.000Z'))).toBe('0min');
  });
});

describe('weekLabel', () => {
  it('PAN-02 reads "Semana X de Y"', () => {
    expect(weekLabel(3, 4)).toBe('Semana 3 de 4');
  });
});
