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
vi.mock('./pages/trainer/AiAssistant', () => ({ default: () => <div>iArnold Page</div> }));

// Mocks the authenticated user with the given AI quota and roles.
const mockUser = ({ aiActionsPerStudent, roles = ['TRAINER'] }) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'trainer-1', platformPlan: { tier: 'X', limits: { aiActionsPerStudent } } },
    isAuthenticated: true,
    hasRole: (role) => roles.includes(role),
  });
};

describe('App routes: /trainer/ai-assistant', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/trainer/ai-assistant');
  });

  it('redirects a FREE trainer to the dashboard (the route is wrapped by AiRouteGuard)', () => {
    mockUser({ aiActionsPerStudent: 0 });

    render(<App />);

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('iArnold Page')).not.toBeInTheDocument();
  });

  it('redirects a non-trainer to the dashboard', () => {
    mockUser({ aiActionsPerStudent: 3, roles: ['STUDENT'] });

    render(<App />);

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders the assistant for a trainer whose plan allows AI', () => {
    mockUser({ aiActionsPerStudent: 3 });

    render(<App />);

    expect(screen.getByText('iArnold Page')).toBeInTheDocument();
  });
});
