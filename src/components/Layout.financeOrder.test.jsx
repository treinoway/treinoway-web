import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithRouter, screen, within } from '../test/test-utils';
import Layout from './Layout';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import { DUAL_ROLE, TRAINER_ONLY } from '../test/financeFixtures';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Test helper: signs in a professional with iArnold access and the given roles.
const signInWithAi = (roles) => {
  useAuth.mockReturnValue({
    user: { id: 1, firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', platformPlan: { limits: { aiActionsPerStudent: 3 } } },
    logout: vi.fn(),
    hasRole: (role) => roles.includes(role),
  });
};

// Test helper: true when `second` comes after `first` in the document.
const follows = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Layout — Financeiro position in the sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
    api.get.mockResolvedValue({ data: { overdueCount: 0, overdueAmount: '0.00' } });
  });

  it.each([
    ['trainer-only', TRAINER_ONLY],
    ['dual-role', DUAL_ROLE],
  ])('renders Financeiro between iArnold and Biblioteca for a %s user', (_label, roles) => {
    signInWithAi(roles);
    renderWithRouter(<Layout><span>Content</span></Layout>);
    const sidebar = screen.getByRole('complementary');

    const financeiro = within(sidebar).getByRole('link', { name: 'Financeiro' });
    const iArnold = within(sidebar).getByRole('link', { name: 'iArnold' });
    const biblioteca = within(sidebar).getByRole('button', { name: 'Biblioteca' });
    expect(financeiro).toHaveAttribute('href', '/financeiro');
    expect(follows(iArnold, financeiro)).toBe(true);
    expect(follows(financeiro, biblioteca)).toBe(true);
  });
});
