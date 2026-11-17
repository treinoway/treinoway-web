import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

import api from '../api/axios';
import useChallengeConsistency from './useChallengeConsistency';

const URL = '/trainer/challenges/c1/consistency';

// Consistency response of a championship in the given status
const consistency = (status, rows = [{ studentId: 's1' }]) => ({
  data: { challenge: { id: 'c1' }, status, currentWeek: 2, closesAt: '2026-11-22T21:00:00Z', rows, entering: [] },
});

// Lets the pending promises and the first request settle under fake timers
const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

describe('useChallengeConsistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(consistency('active'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('CAMP-63 starts loading and then exposes the standings of the championship', async () => {
    const { result } = renderHook(() => useChallengeConsistency('c1'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith(URL);
    expect(result.current.data.rows).toEqual([{ studentId: 's1' }]);
    expect(result.current.error).toBeNull();
  });

  it('CAMP-64 exposes the API error message and retries with reload', async () => {
    api.get.mockRejectedValueOnce({ userMessage: 'Campeonato sem constância' });
    const { result } = renderHook(() => useChallengeConsistency('c1'));

    await waitFor(() => expect(result.current.error).toBe('Campeonato sem constância'));
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data.rows).toHaveLength(1);
  });

  it('does not ask for the standings while disabled', async () => {
    const { result } = renderHook(() => useChallengeConsistency('c1', { enabled: false }));

    await act(async () => {});

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('CAMP-57 refreshes every 60 seconds', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useChallengeConsistency('c1'));
    await flush();
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59000);
    });
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(api.get).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(api.get).toHaveBeenLastCalledWith(URL);
    expect(result.current.loading).toBe(false);
  });

  it('CAMP-57 does not refresh a scheduled or ended championship', async () => {
    vi.useFakeTimers();
    api.get.mockResolvedValue(consistency('completed'));
    renderHook(() => useChallengeConsistency('c1'));
    await flush();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180000);
    });

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('CAMP-57 keeps the rows on screen when a refresh fails', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useChallengeConsistency('c1'));
    await flush();
    api.get.mockRejectedValueOnce({ userMessage: 'Falhou' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    expect(result.current.data.rows).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });
});
