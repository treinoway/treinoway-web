import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from './test/test-utils';
import App from './App';
import { useAuth } from './contexts/AuthContext';

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}));
vi.mock('./contexts/AiChatContext', () => ({
  AiChatProvider: ({ children }) => children,
  useAiChat: () => ({ loading: false, hasNewResponse: false }),
}));
vi.mock('./contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('./components/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('./components/Layout', () => ({ default: ({ children }) => children }));
vi.mock('./pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('./pages/trainer/ConsistencyRanking', () => ({ default: () => <div>Consistency Ranking Page</div> }));
vi.mock('./pages/trainer/ConsistencyRankingSettings', () => ({
  default: () => <div>Consistency Ranking Settings Page</div>,
}));

const ORIGINAL_URL = window.location.href;

// Mocks an authenticated user with the given roles (hasRole is case-insensitive like the real one).
const mockRoles = (roles) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'trainer-1', roles, platformPlan: { tier: 'PRO', limits: {} } },
    isAuthenticated: true,
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

// Opens the given path on the given hostname through the jsdom instance.
const visit = (hostname, path) => {
  globalThis.jsdom.reconfigure({ url: `https://${hostname}${path}` });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DEV', false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
});

describe('PAN-61 App routes: Ranking de Constância rollout gate', () => {
  it('PAN-61 redirects a non-admin trainer on production from /trainer/consistency-ranking to the dashboard', () => {
    mockRoles(['TRAINER']);
    visit('app.teufit.com.br', '/trainer/consistency-ranking');

    render(<App />);

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Consistency Ranking Page')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('PAN-61 redirects a non-admin trainer on production from /trainer/consistency-ranking/settings to the dashboard', () => {
    mockRoles(['TRAINER']);
    visit('app.teufit.com.br', '/trainer/consistency-ranking/settings');

    render(<App />);

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Consistency Ranking Settings Page')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('PAN-61 renders the ranking page for an admin on production', () => {
    mockRoles(['TRAINER', 'ADMIN']);
    visit('app.teufit.com.br', '/trainer/consistency-ranking');

    render(<App />);

    expect(screen.getByText('Consistency Ranking Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('PAN-61 renders the settings page for an admin on production', () => {
    mockRoles(['TRAINER', 'ADMIN']);
    visit('app.teufit.com.br', '/trainer/consistency-ranking/settings');

    render(<App />);

    expect(screen.getByText('Consistency Ranking Settings Page')).toBeInTheDocument();
  });

  it('PAN-61 renders the ranking page for a non-admin trainer on staging', () => {
    mockRoles(['TRAINER']);
    visit('teufit-web-staging.up.railway.app', '/trainer/consistency-ranking');

    render(<App />);

    expect(screen.getByText('Consistency Ranking Page')).toBeInTheDocument();
  });
});
