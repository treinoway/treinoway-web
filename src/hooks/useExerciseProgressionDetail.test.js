import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import api from '../api/axios';
import useExerciseProgressionDetail from './useExerciseProgressionDetail';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const period = {
  presetKey: 'custom',
  from: '2026-04-02T00:00:00.000Z',
  to: '2026-05-02T00:00:00.000Z',
};

describe('useExerciseProgressionDetail', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('does not fetch when studentId/exerciseId/period are missing', () => {
    renderHook(() => useExerciseProgressionDetail(null, null, null));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches /dashboard/exercise-progression/:exerciseId with the period range', async () => {
    api.get.mockResolvedValue({
      data: {
        exercise: { id: 'ex-1', name: 'Agachamento', hasLoad: true },
        window: period,
        sessions: [],
      },
    });

    const { result } = renderHook(() => useExerciseProgressionDetail('s-1', 'ex-1', period));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith(
      '/trainer/students/s-1/dashboard/exercise-progression/ex-1',
      expect.objectContaining({
        params: expect.objectContaining({ dateFrom: period.from, dateTo: period.to, sessionLimit: 10 }),
      }),
    );
    expect(result.current.data.exercise.id).toBe('ex-1');
  });

  it('exposes the error when the request fails', async () => {
    api.get.mockRejectedValue({ response: { status: 500 } });

    const { result } = renderHook(() => useExerciseProgressionDetail('s-1', 'ex-1', period));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it('refetch triggers another GET', async () => {
    api.get.mockResolvedValue({ data: { exercise: {}, sessions: [] } });
    const { result } = renderHook(() => useExerciseProgressionDetail('s-1', 'ex-1', period));

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = api.get.mock.calls.length;
    result.current.refetch();
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
