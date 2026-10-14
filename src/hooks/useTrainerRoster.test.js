import { renderHook, waitFor, act } from '@testing-library/react';
import api from '../api/axios';
import useTrainerRoster, { TRAINER_ROSTER_CACHE_KEY as CACHE_KEY } from './useTrainerRoster';

const LEGACY_CACHE_KEY = 'treinoway.trainerRosterCounts';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const students = [
  { id: 1, billingStatus: 'ok' },
  { id: 2, billingStatus: 'ok' },
  { id: 3, billingStatus: 'due_soon' },
  { id: 4, billingStatus: 'overdue' },
];

describe('useTrainerRoster', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useTrainerRoster(false));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('starts with counts=null and hasCounts=false when there is no cache', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTrainerRoster(true));

    expect(result.current.counts).toBeNull();
    expect(result.current.hasCounts).toBe(false);
    expect(result.current.loading).toBe(true);
  });

  it('reads cached counts synchronously before the network call resolves', () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ total: 4, ativo: 2, pendente: 1, vencido: 1 }));
    api.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrainerRoster(true));

    expect(result.current.counts).toEqual({ total: 4, ativo: 2, pendente: 1, vencido: 1 });
    expect(result.current.hasCounts).toBe(true);
  });

  it('fetches and derives counts from /trainer/students on mount when enabled', async () => {
    api.get.mockResolvedValue({ data: students });

    const { result } = renderHook(() => useTrainerRoster(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/trainer/students');
    expect(result.current.counts).toEqual({ total: 4, ativo: 2, pendente: 1, vencido: 1 });
    expect(result.current.isEmpty).toBe(false);
  });

  it('writes the fetched counts to localStorage', async () => {
    api.get.mockResolvedValue({ data: students });

    const { result } = renderHook(() => useTrainerRoster(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(JSON.parse(localStorage.getItem(CACHE_KEY))).toEqual({
      total: 4, ativo: 2, pendente: 1, vencido: 1,
    });
  });

  it('reports isEmpty=true when the roster has no students', async () => {
    api.get.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useTrainerRoster(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.counts).toEqual({ total: 0, ativo: 0, pendente: 0, vencido: 0 });
    expect(result.current.isEmpty).toBe(true);
  });

  it('sets error and keeps counts=null on failure with no prior cache', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro de conexão' });

    const { result } = renderHook(() => useTrainerRoster(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(true);
    expect(result.current.counts).toBeNull();
  });

  it('keeps last cached counts silently when a background refresh fails', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ total: 4, ativo: 2, pendente: 1, vencido: 1 }));
    api.get.mockRejectedValue({ userMessage: 'Erro de conexão' });

    const { result } = renderHook(() => useTrainerRoster(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(true);
    expect(result.current.counts).toEqual({ total: 4, ativo: 2, pendente: 1, vencido: 1 });
  });

  it('refetches when enabled flips from false to true', async () => {
    api.get.mockResolvedValue({ data: students });
    const { result, rerender } = renderHook(
      ({ enabled }) => useTrainerRoster(enabled),
      { initialProps: { enabled: false } }
    );

    expect(api.get).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.hasCounts).toBe(true));
  });

  it('refetch() triggers a new request on demand', async () => {
    api.get.mockResolvedValue({ data: students });
    const { result } = renderHook(() => useTrainerRoster(true));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('ignores malformed cache entries', () => {
    localStorage.setItem(CACHE_KEY, 'not-json');
    api.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrainerRoster(true));

    expect(result.current.counts).toBeNull();
    expect(result.current.hasCounts).toBe(false);
  });

  it('derives counts from billingStatus (overdue → vencido, due_soon → pendente, ok/none/missing → ativo)', async () => {
    api.get.mockResolvedValue({
      data: [
        ...Array.from({ length: 5 }, (_, i) => ({ id: `o${i}`, billingStatus: 'overdue' })),
        { id: 'd1', billingStatus: 'due_soon' },
        { id: 'k1', billingStatus: 'ok' },
        { id: 'n1', billingStatus: 'none' },
        { id: 'm1' },
      ],
    });

    const { result } = renderHook(() => useTrainerRoster(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.counts).toEqual({ total: 9, ativo: 3, pendente: 1, vencido: 5 });
  });

  it('ignores the legacy unversioned cache (stale all-zero counts)', () => {
    localStorage.setItem(LEGACY_CACHE_KEY, JSON.stringify({ total: 5, ativo: 0, pendente: 0, vencido: 0 }));
    api.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrainerRoster(true));

    expect(CACHE_KEY).not.toBe(LEGACY_CACHE_KEY);
    expect(result.current.counts).toBeNull();
    expect(result.current.hasCounts).toBe(false);
  });
});
