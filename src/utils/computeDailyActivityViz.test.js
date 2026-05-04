import { describe, it, expect } from 'vitest';
import { computeWaveformBars, computeHeatmapWeeks } from './computeDailyActivityViz';

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

describe('computeWaveformBars', () => {
  it('returns empty bars for null input', () => {
    const { bars } = computeWaveformBars(null, NOW);
    expect(bars).toEqual([]);
  });

  it('returns empty bars for empty array', () => {
    const { bars, maxVolumeKg } = computeWaveformBars([], NOW);
    expect(bars).toEqual([]);
    expect(maxVolumeKg).toBe(0);
  });

  it('slices to last 30 bars when more than 30 days given', () => {
    const days = Array.from({ length: 45 }, (_, i) => {
      const date = new Date('2026-03-17T00:00:00');
      date.setDate(date.getDate() + i);
      const d = date.toISOString().slice(0, 10);
      return makeDay(d, { volumeKg: 500 + i * 10 });
    });
    const { bars } = computeWaveformBars(days, NOW);
    expect(bars).toHaveLength(30);
  });

  it('marks today bar with isToday=true', () => {
    const days = [
      makeDay('2026-04-29', { volumeKg: 800 }),
      makeDay('2026-04-30', { volumeKg: 1000 }), // today
    ];
    const { bars } = computeWaveformBars(days, NOW);
    expect(bars.find((b) => b.date === '2026-04-30')?.isToday).toBe(true);
    expect(bars.find((b) => b.date === '2026-04-29')?.isToday).toBe(false);
  });

  it('computes pct relative to maxVolumeKg', () => {
    const days = [
      makeDay('2026-04-28', { volumeKg: 500 }),
      makeDay('2026-04-29', { volumeKg: 1000 }),
    ];
    const { bars, maxVolumeKg } = computeWaveformBars(days, NOW);
    expect(maxVolumeKg).toBe(1000);
    expect(bars[0].pct).toBe(50);
    expect(bars[1].pct).toBe(100);
  });

  it('clamps pct to minimum 5 for non-empty days with small volume', () => {
    const days = [
      makeDay('2026-04-28', { volumeKg: 1 }),
      makeDay('2026-04-29', { volumeKg: 10000 }),
    ];
    const { bars } = computeWaveformBars(days, NOW);
    expect(bars[0].pct).toBeGreaterThanOrEqual(5);
  });

  it('gives pct=0 for empty-status days', () => {
    const days = [
      makeDay('2026-04-28', { status: 'empty', volumeKg: null }),
    ];
    const { bars } = computeWaveformBars(days, NOW);
    expect(bars[0].pct).toBe(0);
  });

  it('preserves status on each bar', () => {
    const days = [
      makeDay('2026-04-28', { status: 'abandoned', volumeKg: 400 }),
      makeDay('2026-04-29', { status: 'partial', volumeKg: 700 }),
      makeDay('2026-04-30', { status: 'completed', volumeKg: 1000 }),
    ];
    const { bars } = computeWaveformBars(days, NOW);
    expect(bars[0].status).toBe('abandoned');
    expect(bars[1].status).toBe('partial');
    expect(bars[2].status).toBe('completed');
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
