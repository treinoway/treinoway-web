import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithRouter, screen } from '../test/test-utils';
import Layout from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { useAiChat } from '../contexts/AiChatContext';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/AiChatContext', () => ({
  useAiChat: vi.fn(),
}));

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const ORIGINAL_URL = window.location.href;
const CHALLENGES_LINK = { name: 'Campeonatos' };
const RANKING_LINK = { name: 'Ranking de Constância' };

// Mocks an authenticated user with the given roles (hasRole is case-insensitive like the real one)
const mockRoles = (roles) => {
  useAuth.mockReturnValue({
    user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', roles },
    logout: vi.fn(),
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DEV', false);
  useAiChat.mockReturnValue({ loading: false, hasNewResponse: false });
  useToast.mockReturnValue({ showToast: vi.fn() });
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
});

describe('Layout', () => {
  it('CAMP-48 shows Campeonatos next to Ranking de Constância', () => {
    mockRoles(['TRAINER']);

    renderWithRouter(<Layout><span>Content</span></Layout>);

    const challengesLink = screen.getByRole('link', CHALLENGES_LINK);
    const rankingLink = screen.getByRole('link', RANKING_LINK);
    expect(challengesLink).toHaveAttribute('href', '/trainer/challenges');
    expect(rankingLink.nextElementSibling).toBe(challengesLink);
  });

  it('CAMP-48 marks Campeonatos active on the championships screens', () => {
    mockRoles(['TRAINER']);

    renderWithRouter(<Layout><span>Content</span></Layout>, { route: '/trainer/challenges/c1' });

    expect(screen.getByRole('link', CHALLENGES_LINK)).toHaveClass('sidebar-link--active');
    expect(screen.getByRole('link', RANKING_LINK)).not.toHaveClass('sidebar-link--active');
  });

  it('CAMP-69 keeps Campeonatos in the menu of a non-admin trainer in production', () => {
    mockRoles(['TRAINER']);
    globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/' });

    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(screen.getByRole('link', CHALLENGES_LINK)).toHaveAttribute('href', '/trainer/challenges');
    expect(screen.queryByRole('link', RANKING_LINK)).not.toBeInTheDocument();
  });
});
