import { renderHook, waitFor, act } from '@testing-library/react';
import api from '../api/axios';
import useTrainerDashboard, { patchTrainerDashboardFinanceCache } from './useTrainerDashboard';

const CACHE_KEY = 'treinoway.trainerDashboardData:1';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 } }),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

const dashboardPayload = {
  plans: { expiredCount: 3, renewingSoonCount: 2 },
  routines: { expiredCount: 4, expiringSoonCount: 2 },
  finance: { monthReceived: '2500.00', totalReceived: '12000.00', overdueCount: 3, overdueAmount: '450.00' },
  engagement: { inactiveStudentsCount: 5, adherenceMonthPct: '78.50', adherenceDeltaPp: '-3.20', weekPrCount: 4 },
  generatedAt: '2026-07-14T12:00:00.000Z',
};

const legacyNumericPayload = {
  plans: { expiredCount: 3, renewingSoonCount: 2 },
  routines: { expiredCount: 4, expiringSoonCount: 2 },
  finance: { monthReceived: 2500, totalReceived: 12000, overdueCount: 3, overdueAmount: 450 },
  engagement: { inactiveStudentsCount: 5, adherenceMonthPct: 78.5, adherenceDeltaPp: 3.2, weekPrCount: 4 },
  generatedAt: '2026-07-14T12:00:00.000Z',
};

describe('useTrainerDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useTrainerDashboard(false));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('starts with data=null and hasData=false when there is no cache', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTrainerDashboard(true));

    expect(result.current.data).toBeNull();
    expect(result.current.hasData).toBe(false);
    expect(result.current.loading).toBe(true);
  });

  it('reads cached data synchronously before the network call resolves', () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dashboardPayload));
    api.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrainerDashboard(true));

    expect(result.current.data).toEqual(dashboardPayload);
    expect(result.current.hasData).toBe(true);
  });

  it('fetches from /trainer/dashboard on mount when enabled', async () => {
    api.get.mockResolvedValue({ data: dashboardPayload });

    const { result } = renderHook(() => useTrainerDashboard(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/trainer/dashboard');
    expect(result.current.data).toEqual(dashboardPayload);
  });

  it('writes the fetched data to localStorage', async () => {
    api.get.mockResolvedValue({ data: dashboardPayload });

    const { result } = renderHook(() => useTrainerDashboard(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(JSON.parse(localStorage.getItem(CACHE_KEY))).toEqual(dashboardPayload);
  });

  it('sets error to the userMessage and keeps data=null on failure with no prior cache', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro de conexão' });

    const { result } = renderHook(() => useTrainerDashboard(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Erro de conexão');
    expect(result.current.data).toBeNull();
  });

  it('falls back through translateError when the rejected error has no userMessage', async () => {
    api.get.mockRejectedValue({});

    const { result } = renderHook(() => useTrainerDashboard(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.error).toBe('string');
    expect(result.current.error.length).toBeGreaterThan(0);
  });

  it('keeps last cached data silently when a background refresh fails', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dashboardPayload));
    api.get.mockRejectedValue({ userMessage: 'Erro de conexão' });

    const { result } = renderHook(() => useTrainerDashboard(true));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Erro de conexão');
    expect(result.current.data).toEqual(dashboardPayload);
  });

  it('accepts an old-shape cache entry with raw numbers for finance/engagement fields (tolerant validator, no invalidation)', () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(legacyNumericPayload));
    api.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrainerDashboard(true));

    expect(result.current.data).toEqual(legacyNumericPayload);
    expect(result.current.hasData).toBe(true);
  });

  it('refetches when enabled flips from false to true', async () => {
    api.get.mockResolvedValue({ data: dashboardPayload });
    const { result, rerender } = renderHook(
      ({ enabled }) => useTrainerDashboard(enabled),
      { initialProps: { enabled: false } }
    );

    expect(api.get).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.hasData).toBe(true));
  });

  it('refetch() triggers a new request on demand', async () => {
    api.get.mockResolvedValue({ data: dashboardPayload });
    const { result } = renderHook(() => useTrainerDashboard(true));

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

    const { result } = renderHook(() => useTrainerDashboard(true));

    expect(result.current.data).toBeNull();
    expect(result.current.hasData).toBe(false);
  });

  it('ignores cache entries missing required fields (shape drift)', () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ plans: { expiredCount: 1 } }));
    api.get.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTrainerDashboard(true));

    expect(result.current.data).toBeNull();
    expect(result.current.hasData).toBe(false);
  });
});

describe('patchTrainerDashboardFinanceCache', () => {
  const validCache = {
    plans: { expiredCount: 0, renewingSoonCount: 0 },
    routines: { expiredCount: 0, expiringSoonCount: 0 },
    finance: { monthReceived: '10.00', totalReceived: '20.00', overdueCount: 5, overdueAmount: '50.00' },
    engagement: { inactiveStudentsCount: 0, adherenceMonthPct: '0', adherenceDeltaPp: null, weekPrCount: 0 },
    generatedAt: '2026-10-06T10:00:00.000Z',
  };

  afterEach(() => localStorage.removeItem(CACHE_KEY));

  it('patches only the overdue fields of a valid cache entry', () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCache));
    patchTrainerDashboardFinanceCache({ userId: 1, overdueCount: 2, overdueAmount: '19.98' });
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    expect(cached.finance).toEqual({ monthReceived: '10.00', totalReceived: '20.00', overdueCount: 2, overdueAmount: '19.98' });
  });

  it('never touches another user\'s cache entry', () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(validCache));
    patchTrainerDashboardFinanceCache({ userId: 2, overdueCount: 2, overdueAmount: '19.98' });
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)).finance.overdueCount).toBe(5);
    expect(localStorage.getItem('treinoway.trainerDashboardData:2')).toBeNull();
  });

  it('does nothing without a cache entry', () => {
    patchTrainerDashboardFinanceCache({ userId: 1, overdueCount: 2, overdueAmount: '1.00' });
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
  });
});
