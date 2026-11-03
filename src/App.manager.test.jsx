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
vi.mock('./manager/api', () => ({
  listUsers: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'u1',
        firstName: 'Zeca',
        lastName: 'Manager',
        email: 'zeca@example.com',
        roles: ['admin'],
        isTrainer: false,
        isStudent: false,
        status: 'ACTIVE',
        createdAt: '2026-10-01T12:00:00.000Z',
        deletedAt: null,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  }),
}));

// Mocks the authenticated user holding the given roles.
const mockRoles = (roles) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u-1', platformPlan: { tier: 'X', limits: {} } },
    isAuthenticated: true,
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

describe('App routes: /manager', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/manager');
  });

  it('lazily renders the manager users list for an admin', async () => {
    mockRoles(['ADMIN']);

    render(<App />);

    expect(await screen.findByText('Zeca Manager', {}, { timeout: 5000 })).toBeInTheDocument();
  });

  it('redirects a non-admin to the dashboard', async () => {
    mockRoles(['TRAINER']);

    render(<App />);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Zeca Manager')).not.toBeInTheDocument();
  });
});
