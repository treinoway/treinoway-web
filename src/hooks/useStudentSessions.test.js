import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import api from '../api/axios';
import useStudentSessions, { SESSIONS_LIST_LIMIT } from './useStudentSessions';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const period = { from: '2026-04-02T00:00:00.000Z', to: '2026-05-02T00:00:00.000Z' };
const sessionsFixture = [{ id: 's-1', trainingName: 'Treino A' }];

describe('useStudentSessions', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('starts in loading state', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useStudentSessions('st-1', period));
    expect(result.current.loading).toBe(true);
    expect(result.current.sessions).toEqual([]);
  });

  it('requests recent-sessions with the period and limit', async () => {
    api.get.mockResolvedValue({ data: { data: sessionsFixture } });
    const { result } = renderHook(() => useStudentSessions('st-1', period));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(SESSIONS_LIST_LIMIT).toBe(50);
    expect(api.get).toHaveBeenCalledTimes(1);
    const [url, config] = api.get.mock.calls[0];
    expect(url).toBe('/trainer/students/st-1/dashboard/recent-sessions');
    expect(config.params).toEqual({ dateFrom: period.from, dateTo: period.to, limit: 50 });
    expect(config.signal).toBeInstanceOf(AbortSignal);
  });

  it('exposes sessions on success', async () => {
    api.get.mockResolvedValue({ data: { data: sessionsFixture } });
    const { result } = renderHook(() => useStudentSessions('st-1', period));
    await waitFor(() => expect(result.current.sessions).toEqual(sessionsFixture));
    expect(result.current.error).toBeNull();
  });

  it('falls back to an empty list when the payload has no data', async () => {
    api.get.mockResolvedValue({ data: null });
    const { result } = renderHook(() => useStudentSessions('st-1', period));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sessions).toEqual([]);
  });

  it('exposes error.userMessage on failure', async () => {
    api.get.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Falha custom' }));
    const { result } = renderHook(() => useStudentSessions('st-1', period));
    await waitFor(() => expect(result.current.error).toBe('Falha custom'));
    expect(result.current.loading).toBe(false);
    expect(result.current.sessions).toEqual([]);
  });

  it('retry refetches and recovers', async () => {
    api.get.mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Falha' }));
    api.get.mockResolvedValueOnce({ data: { data: sessionsFixture } });
    const { result } = renderHook(() => useStudentSessions('st-1', period));
    await waitFor(() => expect(result.current.error).toBe('Falha'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.sessions).toEqual(sessionsFixture));
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it('refetches when the period changes', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    const { result, rerender } = renderHook(({ p }) => useStudentSessions('st-1', p), {
      initialProps: { p: period },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const next = { from: '2026-03-01T00:00:00.000Z', to: '2026-04-01T00:00:00.000Z' };
    rerender({ p: next });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(api.get.mock.calls[1][1].params).toMatchObject({ dateFrom: next.from, dateTo: next.to });
  });

  it('aborts the in-flight request on unmount', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderHook(() => useStudentSessions('st-1', period));
    const { signal } = api.get.mock.calls[0][1];
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('ignores cancelled requests without setting an error', async () => {
    let rejectFirst;
    api.get.mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject; }));
    api.get.mockResolvedValueOnce({ data: { data: sessionsFixture } });
    const { result, rerender } = renderHook(({ p }) => useStudentSessions('st-1', p), {
      initialProps: { p: period },
    });
    rerender({ p: { from: period.from, to: '2026-06-01T00:00:00.000Z' } });
    await waitFor(() => expect(result.current.sessions).toEqual(sessionsFixture));
    await act(async () => {
      rejectFirst(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' }));
    });
    expect(result.current.error).toBeNull();
    expect(result.current.sessions).toEqual(sessionsFixture);
  });
});
