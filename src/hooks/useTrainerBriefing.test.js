import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useTrainerBriefing from './useTrainerBriefing';
import * as trainerBriefingApi from '../api/trainerBriefing';

vi.mock('../api/trainerBriefing', () => ({
  getTrainerBriefing: vi.fn(),
}));

const mockBriefing = {
  activeStudents: 24,
  returningThisWeek: 2,
  stagnantProgress: 3,
  inactiveStudents: 2,
  overallAdherence: '87.00',
  adherenceDeltaPp: '4.00',
  computedAt: '2026-05-15T22:00:00.000Z',
};

describe('useTrainerBriefing', () => {
  beforeEach(() => {
    vi.mocked(trainerBriefingApi.getTrainerBriefing).mockReset();
  });

  it('starts in loading state with no data and no error', () => {
    vi.mocked(trainerBriefingApi.getTrainerBriefing).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrainerBriefing());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('resolves to data on success', async () => {
    vi.mocked(trainerBriefingApi.getTrainerBriefing).mockResolvedValue(mockBriefing);

    const { result } = renderHook(() => useTrainerBriefing());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(mockBriefing);
    expect(result.current.error).toBeNull();
  });

  it('calls getTrainerBriefing exactly once on mount', async () => {
    vi.mocked(trainerBriefingApi.getTrainerBriefing).mockResolvedValue(mockBriefing);

    renderHook(() => useTrainerBriefing());

    await waitFor(() =>
      expect(trainerBriefingApi.getTrainerBriefing).toHaveBeenCalledTimes(1)
    );
  });

  it('sets error from userMessage when fetch fails', async () => {
    const apiError = { userMessage: 'Não foi possível carregar o briefing' };
    vi.mocked(trainerBriefingApi.getTrainerBriefing).mockRejectedValue(apiError);

    const { result } = renderHook(() => useTrainerBriefing());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Não foi possível carregar o briefing');
    expect(result.current.data).toBeNull();
  });

  it('falls back to translateError when userMessage is absent', async () => {
    const apiError = { response: { status: 500, data: {} } };
    vi.mocked(trainerBriefingApi.getTrainerBriefing).mockRejectedValue(apiError);

    const { result } = renderHook(() => useTrainerBriefing());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(typeof result.current.error).toBe('string');
    expect(result.current.data).toBeNull();
  });

  it('clears loading and error on success after prior failure', async () => {
    vi.mocked(trainerBriefingApi.getTrainerBriefing).mockResolvedValue(mockBriefing);

    const { result } = renderHook(() => useTrainerBriefing());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockBriefing);
  });
});
