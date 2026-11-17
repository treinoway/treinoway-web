import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderWithRouter, screen } from '../test/test-utils';
import Layout from './Layout';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import { DUAL_ROLE, NUTRITIONIST_ONLY, TRAINER_ONLY, authAs } from '../test/financeFixtures';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const SUMMARY_URL = '/professional/finance/summary';
const DASHBOARD_CACHE_KEY = 'treinoway.trainerDashboardData:1';

// Test helper: mounts one Layout, as a page navigation does.
const mountLayout = () => renderWithRouter(<Layout><span>Content</span></Layout>);

// Test helper: query options for the sidebar Financeiro link announcing the given overdue count.
const overdueLink = (count) => ({ name: `Financeiro, ${count} cobranças em atraso` });

// Test helper: dispatches the overdue count the finance overview broadcasts after loading.
const broadcast = (overdueCount) => act(() => {
  window.dispatchEvent(new CustomEvent('treinoway:finance-overdue-changed', { detail: { overdueCount, overdueAmount: `${overdueCount}0.00` } }));
});

// Test helper: writes a valid trainer dashboard cache entry for user 1 holding the given overdue count.
const seedDashboard = (overdueCount) => {
  localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
    plans: { expiredCount: 0, renewingSoonCount: 0 },
    routines: { expiredCount: 0, expiringSoonCount: 0 },
    finance: { monthReceived: '0.00', totalReceived: '0.00', overdueCount, overdueAmount: `${overdueCount}0.00` },
    engagement: { inactiveStudentsCount: 0, adherenceMonthPct: '0', adherenceDeltaPp: null, weekPrCount: 0 },
    generatedAt: new Date().toISOString(),
  }));
};

// Test helper: signs in a fresh user object with the given roles and serves the given summary count.
const setup = (roles, summaryCount) => {
  useAuth.mockReturnValue(authAs(roles));
  api.get.mockImplementation((url) => (url === SUMMARY_URL
    ? Promise.resolve({ data: { overdueCount: summaryCount, overdueAmount: `${summaryCount}0.00` } })
    : Promise.resolve({ data: {} })));
};

describe('Layout — finance overview broadcast vs trainer dashboard cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
  });

  it('trainer-only: a broadcast updates the mounted badge, but the next mount shows the dashboard cache count', async () => {
    setup(TRAINER_ONLY, 4);
    seedDashboard(2);

    const first = mountLayout();
    expect(await screen.findByRole('link', overdueLink(2))).toBeInTheDocument();
    broadcast(3);
    expect(screen.getByRole('link', overdueLink(3))).toBeInTheDocument();
    first.unmount();

    mountLayout();
    await act(async () => {});
    expect(screen.getByRole('link', overdueLink(2))).toBeInTheDocument();
    expect(screen.queryByRole('link', overdueLink(3))).not.toBeInTheDocument();
  });

  it('trainer-only: a dashboard cache refreshed after the broadcast wins on the next mount', async () => {
    setup(TRAINER_ONLY, 4);
    seedDashboard(5);

    const first = mountLayout();
    await screen.findByRole('link', overdueLink(5));
    broadcast(3);
    expect(screen.getByRole('link', overdueLink(3))).toBeInTheDocument();
    first.unmount();

    seedDashboard(2);
    mountLayout();
    await act(async () => {});
    expect(screen.getByRole('link', overdueLink(2))).toBeInTheDocument();
    expect(screen.queryByRole('link', overdueLink(3))).not.toBeInTheDocument();
  });

  it.each([
    ['nutritionist-only', NUTRITIONIST_ONLY],
    ['dual-role', DUAL_ROLE],
  ])('%s: the broadcast count still carries over to the next mount', async (_label, roles) => {
    setup(roles, 9);
    seedDashboard(2);

    const first = mountLayout();
    await screen.findByRole('link', overdueLink(9));
    broadcast(7);
    expect(screen.getByRole('link', overdueLink(7))).toBeInTheDocument();
    first.unmount();

    mountLayout();
    await act(async () => {});
    expect(screen.getByRole('link', overdueLink(7))).toBeInTheDocument();
  });
});
