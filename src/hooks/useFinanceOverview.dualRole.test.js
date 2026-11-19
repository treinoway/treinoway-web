import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '../test/test-utils';
import useFinanceOverview from './useFinanceOverview';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { DUAL_ROLE, TRAINER_ONLY, authAs, makeKpis } from '../test/financeFixtures';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const DASHBOARD_CACHE_KEY = 'treinoway.trainerDashboardData:1';
const OVERDUE_EVENT = 'treinoway:finance-overdue-changed';

// Test helper: a valid cached trainer dashboard payload with the given overdue numbers.
const seedDashboardCache = (overdueCount, overdueAmount) => {
  localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
    plans: { expiredCount: 0, renewingSoonCount: 0 },
    routines: { expiredCount: 0, expiringSoonCount: 0 },
    finance: { monthReceived: '0.00', totalReceived: '0.00', overdueCount, overdueAmount },
    engagement: { inactiveStudentsCount: 0, adherenceMonthPct: '0', adherenceDeltaPp: null, weekPrCount: 0 },
    generatedAt: '2026-10-06T12:00:00.000Z',
  }));
};

// Test helper: the finance block of the cached trainer dashboard.
const cachedFinance = () => JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY)).finance;

describe('useFinanceOverview — overdue broadcast by role', () => {
  let events;
  const recordEvent = (event) => events.push(event.detail);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    events = [];
    window.addEventListener(OVERDUE_EVENT, recordEvent);
    seedDashboardCache(1, '10.00');
    api.get.mockResolvedValue({
      data: { month: '2026-10', overdueGraceDays: 3, kpis: makeKpis({ overdueCount: 5, overdueAmount: '500.00' }), payments: [] },
    });
  });

  afterEach(() => window.removeEventListener(OVERDUE_EVENT, recordEvent));

  it('does not write the combined overdue count into the trainer dashboard cache for a dual-role user', async () => {
    useAuth.mockReturnValue(authAs(DUAL_ROLE));
    const { result } = renderHook(() => useFinanceOverview('2026-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data.kpis.overdueCount).toBe(5);
    expect(cachedFinance()).toEqual(expect.objectContaining({ overdueCount: 1, overdueAmount: '10.00' }));
  });

  it('still broadcasts the combined count to the sidebar badge for a dual-role user', async () => {
    useAuth.mockReturnValue(authAs(DUAL_ROLE));
    const { result } = renderHook(() => useFinanceOverview('2026-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(events).toContainEqual({ overdueCount: 5, overdueAmount: '500.00' });
  });

  it('keeps patching the trainer dashboard cache for a trainer-only user', async () => {
    useAuth.mockReturnValue(authAs(TRAINER_ONLY));
    const { result } = renderHook(() => useFinanceOverview('2026-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(cachedFinance()).toEqual(expect.objectContaining({ overdueCount: 5, overdueAmount: '500.00' }));
    expect(events).toContainEqual({ overdueCount: 5, overdueAmount: '500.00' });
  });
});
