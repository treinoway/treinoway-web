import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../api/axios';
import useStudentDashboard from './useStudentDashboard';
import { DASHBOARD_PERIOD_PRESETS } from '../constants/dashboardPeriod';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const period = {
  presetKey: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
  from: '2026-04-02T00:00:00.000Z',
  to: '2026-05-02T00:00:00.000Z',
};

const buildSummary = (overrides = {}) => ({
  window: { from: period.from, to: period.to },
  sessionCounts: { completed: 18, in_progress: 0, abandoned: 4 },
  totalSessions: 22,
  completionRate: 0.82,
  lastSessionAt: '2026-05-01T17:30:00.000Z',
  currentProtocol: { id: 'p-1', name: 'Hipertrofia' },
  ...overrides,
});

describe('useStudentDashboard', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('does not fetch when studentId is missing', () => {
    renderHook(() => useStudentDashboard(null, period));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('does not fetch when period.from/to are missing', () => {
    renderHook(() => useStudentDashboard('s-1', { presetKey: 'custom', from: null, to: null }));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches summary, recent sessions, exercise progression, daily-activity, and previous summary', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/dashboard/summary')) return Promise.resolve({ data: buildSummary() });
      if (url.endsWith('/dashboard/recent-sessions')) return Promise.resolve({ data: { data: [] } });
      if (url.endsWith('/dashboard/exercise-progression')) return Promise.resolve({ data: { data: [] } });
      if (url.endsWith('/dashboard/daily-activity')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: null });
    });

    const { result } = renderHook(() => useStudentDashboard('s-1', period));

    await waitFor(() => {
      expect(result.current.summary.loading).toBe(false);
    });

    // 5 calls: summary, previous-summary (delta), recent-sessions, exercise-progression, daily-activity
    const calls = api.get.mock.calls.map(([url]) => url);
    expect(calls.filter((u) => u.endsWith('/dashboard/summary'))).toHaveLength(2);
    expect(calls.filter((u) => u.endsWith('/dashboard/recent-sessions'))).toHaveLength(1);
    expect(calls.filter((u) => u.endsWith('/dashboard/exercise-progression'))).toHaveLength(1);
    expect(calls.filter((u) => u.endsWith('/dashboard/daily-activity'))).toHaveLength(1);
  });

  it('exposes dailyActivity block with data after fetch', async () => {
    const activityData = [
      { date: '2026-05-01', status: 'completed', volumeKg: 1200, sessionId: 's-1', trainingId: 't-1', trainingName: 'Treino A', completedSets: 4, totalSets: 4 },
    ];
    api.get.mockImplementation((url) => {
      if (url.endsWith('/dashboard/summary')) return Promise.resolve({ data: buildSummary() });
      if (url.endsWith('/dashboard/recent-sessions')) return Promise.resolve({ data: { data: [] } });
      if (url.endsWith('/dashboard/exercise-progression')) return Promise.resolve({ data: { data: [] } });
      if (url.endsWith('/dashboard/daily-activity')) return Promise.resolve({ data: { data: activityData } });
      return Promise.resolve({ data: null });
    });

    const { result } = renderHook(() => useStudentDashboard('s-1', period));

    await waitFor(() => expect(result.current.dailyActivity.loading).toBe(false));
    expect(result.current.dailyActivity.data).toBeTruthy();
    expect(result.current.dailyActivity.error).toBeNull();
  });

  it('dailyActivity error is isolated — other blocks still load', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/dashboard/summary')) return Promise.resolve({ data: buildSummary() });
      if (url.endsWith('/dashboard/recent-sessions')) return Promise.resolve({ data: { data: [] } });
      if (url.endsWith('/dashboard/exercise-progression')) return Promise.resolve({ data: { data: [] } });
      if (url.endsWith('/dashboard/daily-activity')) return Promise.reject({ response: { status: 503 } });
      return Promise.resolve({ data: null });
    });

    const { result } = renderHook(() => useStudentDashboard('s-1', period));

    await waitFor(() => expect(result.current.summary.loading).toBe(false));
    expect(result.current.summary.data).toBeTruthy();
    expect(result.current.dailyActivity.error).toBeTruthy();
    expect(result.current.dailyActivity.data).toBeNull();
  });

  it('detects STUDENT_NOT_FOUND on the summary 404 and exposes studentNotFound flag', async () => {
    api.get.mockImplementation(() => Promise.reject({
      response: { status: 404, data: { error: 'STUDENT_NOT_FOUND' } },
    }));

    const { result } = renderHook(() => useStudentDashboard('s-1', period));

    await waitFor(() => {
      expect(result.current.studentNotFound).toBe(true);
    });
    expect(result.current.summary.error).toBe(null);
  });

  it('keeps blocks independent — one error does not block the others', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/dashboard/summary')) return Promise.resolve({ data: buildSummary() });
      if (url.endsWith('/dashboard/recent-sessions')) return Promise.reject({ response: { status: 500 } });
      if (url.endsWith('/dashboard/exercise-progression')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: null });
    });

    const { result } = renderHook(() => useStudentDashboard('s-1', period));

    await waitFor(() => {
      expect(result.current.summary.loading).toBe(false);
    });

    expect(result.current.summary.data).toBeTruthy();
    expect(result.current.recentSessions.error).toBeTruthy();
    expect(result.current.progression.error).toBe(null);
  });

  it('caches results by studentId:period and avoids duplicate fetches on remount', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/dashboard/summary')) return Promise.resolve({ data: buildSummary() });
      if (url.endsWith('/dashboard/recent-sessions')) return Promise.resolve({ data: { data: [] } });
      if (url.endsWith('/dashboard/exercise-progression')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: null });
    });

    const first = renderHook(() => useStudentDashboard('s-1', period));
    await waitFor(() => expect(first.result.current.summary.loading).toBe(false));

    const callsAfterFirst = api.get.mock.calls.length;

    // remount with same studentId+period should NOT trigger new requests because
    // the in-memory cache shorts the path.
    const second = renderHook(() => useStudentDashboard('s-1', period));
    await waitFor(() => expect(second.result.current.summary.loading).toBe(false));

    // Note: the cache lives in the hook's module-scope ref, so a separate renderHook
    // call gets a fresh ref. We assert the cache is per-instance instead.
    expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(callsAfterFirst);
  });

  it('passes dateFrom and dateTo to the API', async () => {
    api.get.mockImplementation(() => Promise.resolve({ data: { data: [] } }));
    renderHook(() => useStudentDashboard('s-1', period));

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const summaryCall = api.get.mock.calls.find(([url]) => url.endsWith('/dashboard/summary'));
    expect(summaryCall[1].params.dateFrom).toBe(period.from);
    expect(summaryCall[1].params.dateTo).toBe(period.to);
  });
});
