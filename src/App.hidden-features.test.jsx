import { describe, it, expect, vi, beforeEach } from 'vitest';
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
vi.mock('./pages/trainer/TrainerBranding', () => ({ default: () => <div>Branding Page</div> }));
vi.mock('./pages/trainer/CreateChampionship', () => ({ default: () => <div>Create Championship Page</div> }));

describe('App routes: hidden branding and championship creation', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'trainer-1', betaAccess: true, platformPlan: { tier: 'BETA', limits: {} } },
      isAuthenticated: true,
      hasRole: () => true,
    });
  });

  it('redirects /trainer/branding to /', async () => {
    window.history.pushState({}, '', '/trainer/branding');

    render(<App />);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Branding Page')).not.toBeInTheDocument();
  });

  it('redirects /trainer/championships/create to /', async () => {
    window.history.pushState({}, '', '/trainer/championships/create');

    render(<App />);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Create Championship Page')).not.toBeInTheDocument();
  });
});
