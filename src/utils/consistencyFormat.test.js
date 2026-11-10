import { describe, it, expect } from 'vitest';
import { dayMonthOf, seasonEndDateOf, formatScore, formatCountdown, weekLabel, formatCloseLabel, formatCloseDateLabel, formatWeekdayTime, currentWeekStartOf, formatNotStartedMessage } from './consistencyFormat';

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

  it('PAN-07 never shows 70 before 70, so the label agrees with the warning color', () => {
    expect(formatScore(69.6)).toBe('69%');
    expect(formatScore(69.4)).toBe('69%');
    expect(formatScore(70)).toBe('70%');
    expect(formatScore(70.4)).toBe('70%');
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

describe('close labels', () => {
  const closesAt = '2026-11-09T00:00:00.000Z';

  it('PAN-27 names the weekday and hour of the close in the trainer time zone', () => {
    expect(formatCloseLabel(closesAt, 'America/Sao_Paulo')).toBe('domingo às 21h');
  });

  it('PAN-37 names the weekday, date and hour of the close', () => {
    expect(formatCloseDateLabel(closesAt, 'America/Sao_Paulo')).toBe('domingo, 08/11, às 21h');
  });

  it('PAN-37 keeps the minutes when the close is not on the hour', () => {
    expect(formatCloseLabel('2026-11-09T00:30:00.000Z', 'America/Sao_Paulo')).toBe('domingo às 21h30');
  });
});

describe('currentWeekStartOf', () => {
  it('PAN-30 returns the Monday of the running season week', () => {
    expect(currentWeekStartOf({ startWeek: '2026-10-19', currentWeek: 3 })).toBe('2026-11-02');
  });

  it('PAN-30 returns the season start in its first week', () => {
    expect(currentWeekStartOf({ startWeek: '2026-10-19', currentWeek: 1 })).toBe('2026-10-19');
  });
});

describe('season dates', () => {
  it('shifts a date key by days', () => {
    expect(dayMonthOf('2026-10-26')).toBe('26/10');
    expect(dayMonthOf('2026-10-26', 6)).toBe('01/11');
  });

  it('PAN-02 ends a season on the Sunday after the Monday of its last week, so list and header agree', () => {
    expect(seasonEndDateOf('2026-10-19')).toBe('25/10');
    expect(seasonEndDateOf('2026-12-28')).toBe('03/01');
  });
});

describe('formatWeekdayTime', () => {
  it('PAN-49 writes the weekday and time of an instant in the time zone', () => {
    expect(formatWeekdayTime('2026-11-08T23:48:00.000Z', 'America/Sao_Paulo')).toBe('domingo 20h48');
    expect(formatWeekdayTime('2026-11-09T00:00:00.000Z', 'America/Sao_Paulo')).toBe('domingo 21h');
  });
});

describe('formatNotStartedMessage', () => {
  it('PAN-60 announces the launch Monday of the ranking', () => {
    expect(formatNotStartedMessage({ reason: 'launchPending', startsOn: '2026-11-16' })).toBe('O Ranking de Constância começa na segunda, 16/11.');
  });

  it('PAN-60 says the ranking is not released for the account when the launch has no date', () => {
    expect(formatNotStartedMessage({ reason: 'launchPending', startsOn: null })).toBe('O Ranking de Constância ainda não foi liberado para a tua conta.');
  });

  it('PAN-60 asks for a student with an active plan', () => {
    expect(formatNotStartedMessage({ reason: 'noActiveStudent', startsOn: null })).toBe('Teu ranking aparece quando um aluno tiver plano ativo.');
  });

  it('PAN-60 announces the Monday of the next season', () => {
    expect(formatNotStartedMessage({ reason: 'betweenSeasons', startsOn: '2026-11-23' })).toBe('A próxima temporada começa na segunda, 23/11.');
  });

  it('PAN-60 falls back to the no-student message without a reason from an older API', () => {
    expect(formatNotStartedMessage(null)).toBe('Teu ranking aparece quando um aluno tiver plano ativo.');
    expect(formatNotStartedMessage(undefined)).toBe('Teu ranking aparece quando um aluno tiver plano ativo.');
  });

  it('PAN-60 keeps the day of a date-only start in a time zone behind UTC', () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = 'America/Sao_Paulo';
    try {
      expect(formatNotStartedMessage({ reason: 'betweenSeasons', startsOn: '2026-11-23' })).toBe('A próxima temporada começa na segunda, 23/11.');
    } finally {
      process.env.TZ = previousTimeZone;
    }
  });
});
