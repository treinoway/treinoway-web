import { describe, it, expect } from 'vitest';
import { WEEK_COUNT_OPTIONS, challengeWeekLabel, currentMondayOf, startMondayOptions } from './challengeWeeks';

const SAO_PAULO = 'America/Sao_Paulo';

describe('challengeWeeks', () => {
  it('CAMP-03 offers the current Monday and the next ones, and 1 to 12 weeks', () => {
    const wednesday = new Date('2026-11-18T15:00:00Z');

    const options = startMondayOptions(wednesday, SAO_PAULO);

    expect(options[0]).toEqual({ value: '2026-11-16', label: 'Segunda, 16/11' });
    expect(options[1]).toEqual({ value: '2026-11-23', label: 'Segunda, 23/11' });
    expect(options.length).toBeGreaterThan(1);
    options.forEach((option) => expect(new Date(`${option.value}T00:00:00Z`).getUTCDay()).toBe(1));
    expect(options.map((option) => option.value)).not.toContain('2026-11-09');
    expect(WEEK_COUNT_OPTIONS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('CAMP-03 takes the Monday in the trainer time zone, not in UTC', () => {
    const sundayNightInSaoPaulo = new Date('2026-11-23T01:30:00Z');
    const mondayMidnightInSaoPaulo = new Date('2026-11-23T03:00:00Z');

    expect(currentMondayOf(sundayNightInSaoPaulo, SAO_PAULO)).toBe('2026-11-16');
    expect(currentMondayOf(mondayMidnightInSaoPaulo, SAO_PAULO)).toBe('2026-11-23');
    expect(startMondayOptions(mondayMidnightInSaoPaulo, SAO_PAULO)[0].value).toBe('2026-11-23');
  });

  it('CAMP-49 labels an active weekly championship Semana X de Y and a scheduled one Começa DD/MM', () => {
    expect(challengeWeekLabel({ format: 'weeks', status: 'active', currentWeek: 3, weeks: 8, startDate: '2026-11-02' })).toBe('Semana 3 de 8');
    expect(challengeWeekLabel({ format: 'weeks', status: 'scheduled', currentWeek: 0, weeks: 4, startDate: '2026-11-23' })).toBe('Começa 23/11');
  });

  it('CAMP-49 has no week label for dates championships or ended weekly ones', () => {
    expect(challengeWeekLabel({ format: 'dates', status: 'active', startDate: '2026-11-02' })).toBeNull();
    expect(challengeWeekLabel({ status: 'scheduled', startDate: '2026-11-23' })).toBeNull();
    expect(challengeWeekLabel({ format: 'weeks', status: 'completed', currentWeek: 4, weeks: 4 })).toBeNull();
  });
});
