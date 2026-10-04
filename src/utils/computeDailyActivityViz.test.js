import { describe, it, expect } from 'vitest';
import { computeVolumeTimeline, computeHeatmapWeeks } from './computeDailyActivityViz';

const makeDay = (date, overrides = {}) => ({
  date,
  status: 'completed',
  volumeKg: 1000,
  sessionId: 's-1',
  trainingId: 't-1',
  trainingName: 'Treino A',
  completedSets: 4,
  totalSets: 4,
  ...overrides,
});

// Fixed "today" injected into all tests: 2026-04-30 (Thursday)
const NOW = new Date('2026-04-30T12:00:00');

// 2026-04-24 → 2026-04-30: a 7-day period in local day keys.
const WEEK = { from: '2026-04-24', to: '2026-04-30' };

const sessionOn = (days, date) => days.find((day) => day.date === date)?.session;

describe('computeVolumeTimeline', () => {
  it('returns no days for null or empty input', () => {
    expect(computeVolumeTimeline(null, WEEK)).toEqual({ days: [], maxVolumeKg: 0 });
    expect(computeVolumeTimeline([], WEEK)).toEqual({ days: [], maxVolumeKg: 0 });
  });

  it('creates one slot per calendar day of the period, including rest days', () => {
    const { days } = computeVolumeTimeline([makeDay('2026-04-26'), makeDay('2026-04-29')], WEEK);
    expect(days.map((day) => day.date)).toEqual([
      '2026-04-24', '2026-04-25', '2026-04-26', '2026-04-27', '2026-04-28', '2026-04-29', '2026-04-30',
    ]);
    expect(days.filter((day) => day.session).map((day) => day.date)).toEqual(['2026-04-26', '2026-04-29']);
    expect(days[0].session).toBeNull();
  });

  it('accepts ISO timestamps as period bounds (preset periods)', () => {
    const period = { from: new Date(2026, 3, 1, 9).toISOString(), to: new Date(2026, 3, 30, 21).toISOString() };
    const { days } = computeVolumeTimeline([makeDay('2026-04-10')], period);
    expect(days).toHaveLength(30);
    expect(days[0].date).toBe('2026-04-01');
    expect(days.at(-1).date).toBe('2026-04-30');
  });

  it('crosses month boundaries', () => {
    const { days } = computeVolumeTimeline([makeDay('2026-10-01')], { from: '2026-09-29', to: '2026-10-02' });
    expect(days.map((day) => day.date)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
  });

  it('falls back to the data range when the period has no bounds', () => {
    const { days } = computeVolumeTimeline([makeDay('2026-04-27'), makeDay('2026-04-29')], {});
    expect(days.map((day) => day.date)).toEqual(['2026-04-27', '2026-04-28', '2026-04-29']);
  });

  it('ignores rows outside the period', () => {
    const { days, maxVolumeKg } = computeVolumeTimeline(
      [makeDay('2026-04-20', { volumeKg: 9000 }), makeDay('2026-04-25', { volumeKg: 500 })],
      WEEK,
    );
    expect(days).toHaveLength(7);
    expect(maxVolumeKg).toBe(500);
  });

  it('computes pct relative to the max volume with a visible minimum', () => {
    const { days, maxVolumeKg } = computeVolumeTimeline([
      makeDay('2026-04-24', { volumeKg: 500 }),
      makeDay('2026-04-25', { volumeKg: 1000 }),
      makeDay('2026-04-26', { volumeKg: 1 }),
    ], WEEK);
    expect(maxVolumeKg).toBe(1000);
    expect(sessionOn(days, '2026-04-24').pct).toBe(50);
    expect(sessionOn(days, '2026-04-25').pct).toBe(100);
    expect(sessionOn(days, '2026-04-26').pct).toBe(4);
  });

  it('flags sessions without load (zero or null volume)', () => {
    const { days } = computeVolumeTimeline([
      makeDay('2026-04-24', { volumeKg: 0 }),
      makeDay('2026-04-25', { volumeKg: null }),
    ], WEEK);
    expect(sessionOn(days, '2026-04-24')).toMatchObject({ hasLoad: false, volumeKg: null, pct: 0 });
    expect(sessionOn(days, '2026-04-25')).toMatchObject({ hasLoad: false, volumeKg: null, pct: 0 });
  });

  it('keeps the day aggregate: status, sets and session count', () => {
    const { days } = computeVolumeTimeline([
      makeDay('2026-04-24', { status: 'abandoned', sessionCount: 2, completedSets: 3, totalSets: 8 }),
      makeDay('2026-04-25', { status: 'partial' }),
    ], WEEK);
    expect(sessionOn(days, '2026-04-24')).toMatchObject({ status: 'abandoned', sessionCount: 2, completedSets: 3, totalSets: 8 });
    expect(sessionOn(days, '2026-04-25')).toMatchObject({ status: 'partial', sessionCount: 1 });
  });

  it('treats rows with status "empty" as rest days', () => {
    const { days } = computeVolumeTimeline([makeDay('2026-04-24', { status: 'empty', volumeKg: null })], WEEK);
    expect(days).toEqual([]);
  });
});

describe('backward-compatibility — volumeKg / totalVolumeKg / status coercion', () => {
  it('derives volume from legacy totalVolumeKg', () => {
    const { days, maxVolumeKg } = computeVolumeTimeline([
      { date: '2026-04-28', status: 'completed', totalVolumeKg: 500, completedSets: 4, totalSets: 4 },
      { date: '2026-04-29', status: 'completed', totalVolumeKg: 1000, completedSets: 4, totalSets: 4 },
    ], WEEK);
    expect(maxVolumeKg).toBe(1000);
    expect(sessionOn(days, '2026-04-28')).toMatchObject({ volumeKg: 500, pct: 50 });
  });

  it('coerces legacy status "done" to "completed" in the timeline', () => {
    const { days } = computeVolumeTimeline([makeDay('2026-04-28', { status: 'done' })], WEEK);
    expect(sessionOn(days, '2026-04-28').status).toBe('completed');
  });

  it('coerces legacy status "done" to "completed" in heatmap cells', () => {
    const days = [makeDay('2026-04-28', { status: 'done' })];
    const { weeks } = computeHeatmapWeeks(days, NOW);
    const cell = weeks.flatMap((w) => w.days).find((d) => d.date === '2026-04-28');
    expect(cell?.status).toBe('completed');
  });

  it('derives heatmap maxVolumeKg from totalVolumeKg when volumeKg absent', () => {
    const days = [
      { date: '2026-04-28', status: 'completed', totalVolumeKg: 800, trainingName: 'A', completedSets: 4, totalSets: 4 },
      { date: '2026-04-29', status: 'completed', totalVolumeKg: 1200, trainingName: 'A', completedSets: 4, totalSets: 4 },
    ];
    const { maxVolumeKg, weeks } = computeHeatmapWeeks(days, NOW);
    expect(maxVolumeKg).toBe(1200);
    const cell = weeks.flatMap((w) => w.days).find((d) => d.date === '2026-04-28');
    expect(cell?.volumeKg).toBe(800);
  });
});

describe('computeHeatmapWeeks', () => {
  it('returns empty weeks for null input', () => {
    const { weeks } = computeHeatmapWeeks(null, NOW);
    expect(weeks).toEqual([]);
  });

  it('returns empty weeks for empty array', () => {
    const { weeks } = computeHeatmapWeeks([], NOW);
    expect(weeks).toEqual([]);
  });

  it('groups days into Mon-Sun rows', () => {
    // 2026-04-27 is a Monday, 2026-05-03 is a Sunday → 1 full week
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date('2026-04-27T00:00:00');
      date.setDate(date.getDate() + i);
      return makeDay(date.toISOString().slice(0, 10));
    });
    const { weeks } = computeHeatmapWeeks(days, NOW);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].days).toHaveLength(7);
    expect(weeks[0].days[0].date).toBe('2026-04-27'); // Monday
    expect(weeks[0].days[6].date).toBe('2026-05-03'); // Sunday
  });

  it('marks today cell with isToday=true', () => {
    const days = [
      makeDay('2026-04-30'), // today per NOW
    ];
    const { weeks } = computeHeatmapWeeks(days, NOW);
    const todayCell = weeks.flatMap((w) => w.days).find((d) => d.date === '2026-04-30');
    expect(todayCell?.isToday).toBe(true);
  });

  it('marks first-row cells with isFirstRow=true', () => {
    const days = [
      makeDay('2026-04-20'),
      makeDay('2026-04-27'),
    ];
    const { weeks } = computeHeatmapWeeks(days, NOW);
    expect(weeks[0].days[0].isFirstRow).toBe(true);
    if (weeks.length > 1) {
      expect(weeks[1].days[0].isFirstRow).toBe(false);
    }
  });

  it('marks out-of-period cells with inPeriod=false', () => {
    // Only one day given; the week padding cells should be inPeriod=false
    const days = [makeDay('2026-04-30')]; // Thursday
    const { weeks } = computeHeatmapWeeks(days, NOW);
    const allDays = weeks.flatMap((w) => w.days);
    const outOfPeriod = allDays.filter((d) => !d.inPeriod);
    expect(outOfPeriod.length).toBeGreaterThan(0);
  });

  it('returns maxVolumeKg as max of all valid volumes', () => {
    const days = [
      makeDay('2026-04-28', { volumeKg: 500 }),
      makeDay('2026-04-29', { volumeKg: 2000 }),
      makeDay('2026-04-30', { volumeKg: null }),
    ];
    const { maxVolumeKg } = computeHeatmapWeeks(days, NOW);
    expect(maxVolumeKg).toBe(2000);
  });

  it('returns dowLabels with 7 entries', () => {
    const days = [makeDay('2026-04-30')];
    const { dowLabels } = computeHeatmapWeeks(days, NOW);
    expect(dowLabels).toHaveLength(7);
  });
});
