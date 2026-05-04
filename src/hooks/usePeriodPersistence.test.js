import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePeriodPersistence from './usePeriodPersistence';
import { DASHBOARD_PERIOD_PRESETS } from '../constants/dashboardPeriod';

const STORAGE_KEY = 'treinoway.studentDashboard.period.trainer-1';

describe('usePeriodPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default 30-day preset when nothing is stored', () => {
    const { result } = renderHook(() => usePeriodPersistence('trainer-1'));
    expect(result.current[0].presetKey).toBe(DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS);
    expect(result.current[0].from).toBeTruthy();
    expect(result.current[0].to).toBeTruthy();
  });

  it('seeds from initialOverride when provided (URL params take precedence)', () => {
    const override = {
      presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM,
      from: '2026-01-01T00:00:00Z',
      to: '2026-02-01T00:00:00Z',
    };
    const { result } = renderHook(() => usePeriodPersistence('trainer-1', { initialOverride: override }));
    expect(result.current[0]).toEqual(override);
  });

  it('reads stored custom range from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM,
      from: '2026-01-01T00:00:00Z',
      to: '2026-02-01T00:00:00Z',
    }));
    const { result } = renderHook(() => usePeriodPersistence('trainer-1'));
    expect(result.current[0].presetKey).toBe(DASHBOARD_PERIOD_PRESETS.CUSTOM);
    expect(result.current[0].from).toBe('2026-01-01T00:00:00Z');
  });

  it('recomputes window for stored fixed presets relative to "now"', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      presetKey: DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS,
      from: null,
      to: null,
    }));
    const now = new Date('2026-05-02T12:00:00Z');
    const { result } = renderHook(() => usePeriodPersistence('trainer-1', { now }));
    expect(result.current[0].presetKey).toBe(DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS);
    expect(result.current[0].to).toBe(now.toISOString());
  });

  it('persists preset selection to localStorage', () => {
    const { result } = renderHook(() => usePeriodPersistence('trainer-1'));
    act(() => {
      result.current[1]({
        presetKey: DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR,
        from: '2025-05-02T12:00:00.000Z',
        to: '2026-05-02T12:00:00.000Z',
      });
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.presetKey).toBe(DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR);
    // Fixed presets only persist the key, NOT the dates (those are recomputed).
    expect(stored.from).toBe(null);
    expect(stored.to).toBe(null);
  });

  it('persists explicit from/to for custom preset', () => {
    const { result } = renderHook(() => usePeriodPersistence('trainer-1'));
    act(() => {
      result.current[1]({
        presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM,
        from: '2026-01-01T00:00:00Z',
        to: '2026-02-01T00:00:00Z',
      });
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.from).toBe('2026-01-01T00:00:00Z');
    expect(stored.to).toBe('2026-02-01T00:00:00Z');
  });

  it('falls back to default for malformed stored data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const { result } = renderHook(() => usePeriodPersistence('trainer-1'));
    expect(result.current[0].presetKey).toBe(DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS);
  });

  it('falls back when stored preset is unknown', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ presetKey: 'unknown' }));
    const { result } = renderHook(() => usePeriodPersistence('trainer-1'));
    expect(result.current[0].presetKey).toBe(DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS);
  });

  it('scopes the storage key to the trainer id', () => {
    const { result } = renderHook(() => usePeriodPersistence('trainer-2'));
    act(() => {
      result.current[1]({
        presetKey: DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR,
        from: 'a', to: 'b',
      });
    });
    expect(localStorage.getItem('treinoway.studentDashboard.period.trainer-2')).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null);
  });
});
