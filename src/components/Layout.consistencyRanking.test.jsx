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
const RANKING_LINK = { name: 'Ranking de Constância' };

// Mocks an authenticated user with the given roles (hasRole is case-insensitive like the real one).
const mockRoles = (roles) => {
  useAuth.mockReturnValue({
    user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', roles },
    logout: vi.fn(),
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

// Points window.location at the production hostname through the jsdom instance.
const setProductionHostname = () => {
  globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/' });
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

describe('PAN-61 Layout: Ranking de Constância rollout gate', () => {
  it('PAN-61 hides the ranking link from a non-admin trainer on the production hostname', () => {
    mockRoles(['TRAINER']);
    setProductionHostname();

    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(screen.getAllByRole('link', { name: 'Meus Alunos' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', RANKING_LINK)).not.toBeInTheDocument();
  });

  it('PAN-61 shows the ranking link to an admin trainer on the production hostname', () => {
    mockRoles(['TRAINER', 'ADMIN']);
    setProductionHostname();

    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(screen.getByRole('link', RANKING_LINK)).toHaveAttribute('href', '/trainer/consistency-ranking');
  });

  it('PAN-61 shows the ranking link to a non-admin trainer on the default test hostname (localhost)', () => {
    mockRoles(['TRAINER']);

    renderWithRouter(<Layout><span>Content</span></Layout>);

    expect(screen.getByRole('link', RANKING_LINK)).toHaveAttribute('href', '/trainer/consistency-ranking');
  });
});
