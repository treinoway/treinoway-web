import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './test/test-utils';
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
vi.mock('./pages/admin/FeedbackList', () => ({ default: () => <div>Feedback List Page</div> }));
vi.mock('./manager/api', () => ({
  getPending: vi.fn().mockResolvedValue({ pendingInvites: 0, newFeedbacks: 0 }),
  getOverview: vi.fn(() => new Promise(() => {})),
}));

// Mocks the authenticated user holding the given roles.
const mockRoles = (roles) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u-1', platformPlan: { tier: 'X', limits: {} } },
    isAuthenticated: true,
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

describe('App routes: /admin/feedbacks', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/admin/feedbacks');
  });

  it('redirects an admin to /manager/feedbacks and renders the feedback list inside the manager layout', async () => {
    mockRoles(['ADMIN']);
    render(<App />);
    expect(await screen.findByText('Feedback List Page', {}, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/manager/feedbacks'));
    expect(screen.getByText('Teufit Manager')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Feedbacks/ })).toHaveAttribute('aria-current', 'page');
  });

  it('redirects a non-admin to the dashboard', async () => {
    mockRoles(['TRAINER']);
    render(<App />);
    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Feedback List Page')).not.toBeInTheDocument();
  });
});
