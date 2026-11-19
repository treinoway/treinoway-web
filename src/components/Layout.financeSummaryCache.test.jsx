import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderWithRouter, screen, waitFor } from '../test/test-utils';
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

// Test helper: number of GET /professional/finance/summary requests so far.
const summaryCalls = () => api.get.mock.calls.filter(([url]) => url === SUMMARY_URL).length;

// Test helper: mounts one Layout, as a page navigation does.
const mountLayout = () => renderWithRouter(<Layout><span>Content</span></Layout>);

// Test helper: query options for the sidebar Financeiro link announcing the given overdue count.
const overdueLink = (count) => ({ name: `Financeiro, ${count} cobranças em atraso` });

// Test helper: signs in a fresh user object (as the locked Layout tests do) and serves the given summary count.
const setup = (roles, overdueCount) => {
  useAuth.mockReturnValue(authAs(roles));
  api.get.mockImplementation((url) => (url === SUMMARY_URL
    ? Promise.resolve({ data: { overdueCount, overdueAmount: `${overdueCount}0.00` } })
    : Promise.resolve({ data: {} })));
};

describe('Layout — shared /professional/finance/summary cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
  });

  it.each([
    ['trainer-only', TRAINER_ONLY, 4],
    ['nutritionist-only', NUTRITIONIST_ONLY, 5],
    ['dual-role', DUAL_ROLE, 6],
  ])('requests the summary once across a re-mount and a second navigation (%s)', async (_label, roles, count) => {
    setup(roles, count);

    const first = mountLayout();
    await screen.findByRole('link', overdueLink(count));
    first.unmount();

    const second = mountLayout();
    expect(await screen.findByRole('link', overdueLink(count))).toBeInTheDocument();
    second.unmount();

    mountLayout();
    expect(await screen.findByRole('link', overdueLink(count))).toBeInTheDocument();
    expect(summaryCalls()).toBe(1);
  });

  it('requests the summary once when two Layouts mount at the same time', async () => {
    setup(NUTRITIONIST_ONLY, 8);

    mountLayout();
    mountLayout();
    await waitFor(() => expect(screen.getAllByRole('link', overdueLink(8))).toHaveLength(2));
    expect(summaryCalls()).toBe(1);
  });

  it('keeps the count the finance overview broadcast for the next mount, without a new request', async () => {
    setup(NUTRITIONIST_ONLY, 9);

    const first = mountLayout();
    await screen.findByRole('link', overdueLink(9));
    act(() => {
      window.dispatchEvent(new CustomEvent('treinoway:finance-overdue-changed', { detail: { overdueCount: 7, overdueAmount: '70.00' } }));
    });
    expect(screen.getByRole('link', overdueLink(7))).toBeInTheDocument();
    first.unmount();

    mountLayout();
    await act(async () => {});
    expect(screen.getByRole('link', overdueLink(7))).toBeInTheDocument();
    expect(screen.queryByRole('link', overdueLink(9))).not.toBeInTheDocument();
    expect(summaryCalls()).toBe(1);
  });
});
