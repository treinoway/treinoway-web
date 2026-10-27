import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useAdvancedTechniqueSearch from './useAdvancedTechniqueSearch';
import { listAdvancedTechniques } from '../api/advancedTechniques';
import { DROP_SET } from '../test/advancedTechniqueFixtures';

vi.mock('../api/advancedTechniques');

describe('useAdvancedTechniqueSearch', () => {
  beforeEach(() => {
    vi.mocked(listAdvancedTechniques).mockReset();
    vi.mocked(listAdvancedTechniques).mockResolvedValue({ data: [DROP_SET] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fetch until activated, then loads with an empty query', async () => {
    const { result } = renderHook(() => useAdvancedTechniqueSearch());
    expect(result.current.status).toBe('idle');
    expect(listAdvancedTechniques).not.toHaveBeenCalled();

    act(() => result.current.activate());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(listAdvancedTechniques).toHaveBeenCalledWith({ q: '', limit: 50 });
    expect(result.current.results).toEqual([DROP_SET]);
  });

  it('debounces typed queries into a single request with the trimmed term', async () => {
    const { result } = renderHook(() => useAdvancedTechniqueSearch());
    act(() => result.current.activate());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    listAdvancedTechniques.mockClear();
    vi.useFakeTimers();

    act(() => result.current.setQuery('dr'));
    act(() => result.current.setQuery(' drop '));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(listAdvancedTechniques).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(listAdvancedTechniques).toHaveBeenCalledTimes(1);
    expect(listAdvancedTechniques).toHaveBeenCalledWith({ q: 'drop', limit: 50 });
  });

  it('exposes the error message and clears results when the request fails', async () => {
    listAdvancedTechniques.mockRejectedValue({ userMessage: 'Falhou ao buscar' });
    const { result } = renderHook(() => useAdvancedTechniqueSearch());
    act(() => result.current.activate());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Falhou ao buscar');
    expect(result.current.results).toEqual([]);
  });
});
