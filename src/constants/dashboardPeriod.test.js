import { describe, it, expect } from 'vitest';
import {
  DASHBOARD_PERIOD_PRESETS,
  DASHBOARD_PERIOD_PRESET_LIST,
  DEFAULT_DASHBOARD_PERIOD_KEY,
  buildPeriod,
  computePresetWindow,
  computePreviousPeriod,
  getPeriodPresetLabel,
  getPeriodCacheKey,
} from './dashboardPeriod';

describe('preset list & default', () => {
  it('exposes presets in the documented order', () => {
    expect(DASHBOARD_PERIOD_PRESET_LIST).toEqual([
      DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
      DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS,
      DASHBOARD_PERIOD_PRESETS.LAST_6_MONTHS,
      DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR,
      DASHBOARD_PERIOD_PRESETS.CUSTOM,
    ]);
  });

  it('defaults to last 30 days per refined design', () => {
    expect(DEFAULT_DASHBOARD_PERIOD_KEY).toBe(DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS);
  });
});

describe('getPeriodPresetLabel', () => {
  it('returns Portuguese labels for each preset', () => {
    expect(getPeriodPresetLabel(DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS)).toBe('Últimos 30 dias');
    expect(getPeriodPresetLabel(DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS)).toBe('Últimos 90 dias');
    expect(getPeriodPresetLabel(DASHBOARD_PERIOD_PRESETS.LAST_6_MONTHS)).toBe('Últimos 6 meses');
    expect(getPeriodPresetLabel(DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR)).toBe('Último 1 ano');
    expect(getPeriodPresetLabel(DASHBOARD_PERIOD_PRESETS.CUSTOM)).toBe('Personalizar');
  });

  it('falls back to default label for unknown keys', () => {
    expect(getPeriodPresetLabel('unknown')).toBe('Últimos 30 dias');
  });
});

describe('computePresetWindow', () => {
  const now = new Date('2026-05-02T12:00:00Z');

  it('computes 30-day window from "now"', () => {
    const window = computePresetWindow(DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS, now);
    expect(window.to).toBe(now.toISOString());
    expect(new Date(window.from).getUTCDate()).toBe(2);
    expect(new Date(window.from).getUTCMonth()).toBe(3); // April (0-indexed)
  });

  it('computes 365-day window for 1-year preset', () => {
    const window = computePresetWindow(DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR, now);
    expect(new Date(window.to).getUTCFullYear()).toBe(2026);
    expect(new Date(window.from).getUTCFullYear()).toBe(2025);
  });

  it('falls back to default for unknown preset', () => {
    const window = computePresetWindow('unknown', now);
    expect(new Date(window.to).getTime() - new Date(window.from).getTime())
      .toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe('buildPeriod', () => {
  it('returns explicit from/to for custom preset', () => {
    const period = buildPeriod({
      presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM,
      customFrom: '2026-04-01T00:00:00Z',
      customTo: '2026-04-30T00:00:00Z',
    });
    expect(period).toEqual({
      presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM,
      from: '2026-04-01T00:00:00Z',
      to: '2026-04-30T00:00:00Z',
    });
  });

  it('returns null from/to for incomplete custom period', () => {
    const period = buildPeriod({ presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM });
    expect(period.from).toBe(null);
    expect(period.to).toBe(null);
  });

  it('computes window for fixed presets', () => {
    const now = new Date('2026-05-02T12:00:00Z');
    const period = buildPeriod({ presetKey: DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS, now });
    expect(period.presetKey).toBe(DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS);
    expect(period.to).toBe(now.toISOString());
  });
});

describe('computePreviousPeriod', () => {
  it('returns null when input is incomplete', () => {
    expect(computePreviousPeriod(null)).toBe(null);
    expect(computePreviousPeriod({ from: null, to: null })).toBe(null);
  });

  it('returns null when from > to', () => {
    expect(computePreviousPeriod({
      from: '2026-05-10T00:00:00Z',
      to: '2026-05-01T00:00:00Z',
    })).toBe(null);
  });

  it('produces a previous window of equal length ending just before "from"', () => {
    const period = {
      from: '2026-04-02T00:00:00Z',
      to: '2026-05-02T00:00:00Z',
    };
    const previous = computePreviousPeriod(period);
    expect(previous).toBeTruthy();
    expect(previous.to).toBe(new Date(new Date(period.from).getTime() - 1).toISOString());
    const lengthMs = new Date(period.to).getTime() - new Date(period.from).getTime();
    expect(new Date(previous.to).getTime() - new Date(previous.from).getTime()).toBe(lengthMs);
  });
});

describe('getPeriodCacheKey', () => {
  it('produces a stable string for the same period', () => {
    const period = {
      presetKey: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
      from: '2026-04-02T00:00:00Z',
      to: '2026-05-02T00:00:00Z',
    };
    expect(getPeriodCacheKey(period)).toBe(
      'last-30-days|2026-04-02T00:00:00Z|2026-05-02T00:00:00Z',
    );
  });
});
