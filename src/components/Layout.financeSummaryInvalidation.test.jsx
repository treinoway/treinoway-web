import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, renderWithRouter, screen } from '../test/test-utils';
import Layout from './Layout';
import usePaymentActions from '../hooks/usePaymentActions';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import { useToast } from '../contexts/ToastContext';
import {
  DUAL_ROLE,
  NUTRITIONIST_ONLY,
  apiError,
  authAs,
  overduePayment,
  paidPayment,
} from '../test/financeFixtures';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const SUMMARY_URL = '/professional/finance/summary';

let summaryCount = 0;

// Test helper: number of GET /professional/finance/summary requests so far.
const summaryCalls = () => api.get.mock.calls.filter(([url]) => url === SUMMARY_URL).length;

// Test helper: mounts one Layout, as a page navigation does.
const mountLayout = () => renderWithRouter(<Layout><span>Content</span></Layout>);

// Test helper: query options for the sidebar Financeiro link announcing the given overdue count.
const overdueLink = (count) => ({ name: `Financeiro, ${count} cobranças em atraso` });

// Test helper: signs in one user object for the whole test and serves the current `summaryCount`.
const setup = (roles, initialCount) => {
  summaryCount = initialCount;
  useAuth.mockReturnValue(authAs(roles));
  api.get.mockImplementation((url) => (url === SUMMARY_URL
    ? Promise.resolve({ data: { overdueCount: summaryCount, overdueAmount: `${summaryCount}0.00` } })
    : Promise.resolve({ data: {} })));
};

// Test helper: renders the payment actions hook as StudentDetail / SubscriptionHistory do (outside Financeiro).
const renderActions = () => renderHook(() => usePaymentActions({ onChanged: vi.fn(), isOverview: false }));

const ACTIONS = {
  'mark paid': async (result) => {
    await act(() => result.current.rowHandlers.onMarkPaid(overduePayment()));
  },
  'mark paid on a date': async (result) => {
    act(() => result.current.rowHandlers.onMarkPaidOnDate(overduePayment()));
    await act(() => result.current.layer.onSubmitMarkPaid('2026-10-05'));
  },
  'mark pending': async (result) => {
    act(() => result.current.rowHandlers.onRevert(paidPayment()));
    await act(() => result.current.layer.onConfirm());
  },
  void: async (result) => {
    act(() => result.current.rowHandlers.onVoid(overduePayment()));
    await act(() => result.current.layer.onConfirm());
  },
  edit: async (result) => {
    act(() => result.current.rowHandlers.onEdit(overduePayment()));
    await act(() => result.current.layer.onSubmitEdit({ amount: '120.00' }));
  },
};

// Test helper: runs one payment action through usePaymentActions.
const runAction = async (name) => {
  const { result, unmount } = renderActions();
  await ACTIONS[name](result);
  unmount();
};

const ROLES = [
  ['nutritionist-only', NUTRITIONIST_ONLY],
  ['dual-role', DUAL_ROLE],
];

// Every (role, payment action) pair.
const CASES = ROLES.flatMap(([label, roles]) => Object.keys(ACTIONS).map((action) => [label, action, roles]));

describe('Layout — finance summary cache invalidated by payment actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
    useToast.mockReturnValue({ showToast: vi.fn() });
    api.post.mockResolvedValue({ data: {} });
    api.patch.mockResolvedValue({ data: {} });
  });

  it.each(CASES)('%s: after a successful "%s" the next mount re-requests the summary and shows the new count', async (_label, action, roles) => {
    setup(roles, 5);
    const first = mountLayout();
    await screen.findByRole('link', overdueLink(5));

    summaryCount = 4;
    await runAction(action);
    expect(api.post.mock.calls.length + api.patch.mock.calls.length).toBe(1);
    first.unmount();

    mountLayout();
    expect(await screen.findByRole('link', overdueLink(4))).toBeInTheDocument();
    expect(summaryCalls()).toBe(2);
  });

  it.each(ROLES)('%s: a successful payment action also drops a count stored by an earlier Financeiro broadcast', async (_label, roles) => {
    setup(roles, 5);
    const first = mountLayout();
    await screen.findByRole('link', overdueLink(5));
    act(() => {
      window.dispatchEvent(new CustomEvent('treinoway:finance-overdue-changed', { detail: { overdueCount: 7, overdueAmount: '70.00' } }));
    });
    first.unmount();

    summaryCount = 4;
    await runAction('mark paid');

    mountLayout();
    expect(await screen.findByRole('link', overdueLink(4))).toBeInTheDocument();
    expect(screen.queryByRole('link', overdueLink(7))).not.toBeInTheDocument();
  });

  it.each(ROLES)('%s: a failed payment action keeps the cache (no new summary request)', async (_label, roles) => {
    setup(roles, 5);
    api.post.mockRejectedValue(apiError(500, 'INTERNAL_ERROR', 'server.error'));
    const first = mountLayout();
    await screen.findByRole('link', overdueLink(5));

    summaryCount = 4;
    await runAction('mark paid');
    await runAction('void');
    expect(api.post).toHaveBeenCalledTimes(2);
    first.unmount();

    mountLayout();
    await act(async () => {});
    expect(screen.getByRole('link', overdueLink(5))).toBeInTheDocument();
    expect(summaryCalls()).toBe(1);
  });
});
