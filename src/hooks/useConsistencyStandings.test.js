import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

import api from '../api/axios';
import useConsistencyStandings from './useConsistencyStandings';

const STANDINGS_URL = '/trainer/consistency-ranking/standings';
const HISTORY_URL = '/trainer/consistency-ranking/history';
const SEASONS_URL = '/trainer/consistency-ranking/seasons';

// Standings response with the given rows
const standings = (rows = []) => ({
  data: { season: { number: 3 }, summary: {}, counts: { all: rows.length }, rows, entering: [] },
});

// Query params of the latest request
const lastParams = () => api.get.mock.lastCall[1].params;

describe('useConsistencyStandings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(standings([{ studentId: 's1' }]));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads the standings with no filter and no search, starting in loading', async () => {
    const { result } = renderHook(() => useConsistencyStandings());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith(STANDINGS_URL, expect.anything());
    expect(lastParams()).toMatchObject({ filter: 'all', q: '' });
    expect(result.current.data.rows).toEqual([{ studentId: 's1' }]);
    expect(result.current.error).toBeNull();
  });

  it('exposes the API error message and retries with reload', async () => {
    api.get.mockRejectedValueOnce({ userMessage: 'Falha ao carregar' });
    const { result } = renderHook(() => useConsistencyStandings());

    await waitFor(() => expect(result.current.error).toBe('Falha ao carregar'));
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data.rows).toHaveLength(1);
  });

  it('PAN-12 asks the service for the selected filter', async () => {
    const { result } = renderHook(() => useConsistencyStandings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilter('risk'));

    await waitFor(() => expect(lastParams()).toMatchObject({ filter: 'risk' }));
    expect(result.current.filter).toBe('risk');
  });

  it('PAN-15 sends the search only after 300 ms without typing', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useConsistencyStandings());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const callsBefore = api.get.mock.calls.length;

    act(() => result.current.setQuery('jo'));
    act(() => result.current.setQuery('joão'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(api.get).toHaveBeenCalledTimes(callsBefore);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(api.get).toHaveBeenCalledTimes(callsBefore + 1);
    expect(lastParams()).toMatchObject({ q: 'joão' });
  });

  it('loads the general history and the previous seasons from their tabs', async () => {
    const { result } = renderHook(() => useConsistencyStandings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setTab('history'));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith(HISTORY_URL, expect.anything()));

    act(() => result.current.setTab('seasons'));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith(SEASONS_URL, expect.anything()));
  });

  it('asks for the frozen standings of the chosen previous season', async () => {
    const { result } = renderHook(() => useConsistencyStandings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSeasonNumber(2));

    await waitFor(() => expect(lastParams()).toMatchObject({ season: 2 }));
  });

  it('PAN-11 refreshes every 60 seconds', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useConsistencyStandings());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.data.rows).toHaveLength(1);
  });

  it('PAN-11 keeps the rows on screen when a refresh fails', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useConsistencyStandings());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    api.get.mockRejectedValueOnce({ userMessage: 'Falhou' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    expect(result.current.data.rows).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('PAN-11 skips the refresh while the tab is in the background', async () => {
    vi.useFakeTimers();
    renderHook(() => useConsistencyStandings());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000);
    });

    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
