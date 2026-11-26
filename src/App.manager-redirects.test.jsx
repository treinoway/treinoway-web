import { describe, it, expect, vi } from 'vitest';
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
vi.mock('./components/Layout', () => ({ default: ({ children }) => <div>{children}<span>App Layout</span></div> }));
vi.mock('./pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('./pages/admin/InvitesList', () => ({ default: () => <div>Invites Page</div> }));
vi.mock('./pages/admin/FeedbackList', () => ({ default: () => <div>Feedbacks Page</div> }));
vi.mock('./pages/admin/TrainersList', () => ({ default: () => <div>Trainers Page</div> }));
vi.mock('./pages/admin/AiUsage', () => ({ default: () => <div>AiUsage Page</div> }));
vi.mock('./pages/admin/TutorialsList', () => ({ default: () => <div>Tutorials Page</div> }));
vi.mock('./manager/api', () => ({
  getPending: vi.fn(() => Promise.resolve({ pendingInvites: 0, newFeedbacks: 0 })),
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

describe('App routes: old /admin/* URLs move to /manager/*', () => {
  it.each([
    ['invites', 'Invites Page', 'Convites do beta'],
    ['feedbacks', 'Feedbacks Page', 'Feedbacks'],
    ['trainers', 'Trainers Page', 'Trainers e planos'],
    ['ai-usage', 'AiUsage Page', 'Uso do iArnold'],
    ['tutorials', 'Tutorials Page', 'Tutoriais'],
  ])('redirects an admin from /admin/%s to the manager page inside the manager layout', async (path, text, navName) => {
    window.history.pushState({}, '', `/admin/${path}`);
    mockRoles(['ADMIN']);

    render(<App />);

    expect(await screen.findByText(text, {}, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe(`/manager/${path}`));
    expect(screen.getByText('Teufit Manager')).toBeInTheDocument();
    expect(screen.queryByText('App Layout')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(`^${navName}`) })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the moved pages admin-only', async () => {
    window.history.pushState({}, '', '/admin/trainers');
    mockRoles(['TRAINER']);

    render(<App />);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Trainers Page')).not.toBeInTheDocument();
  });

  it('keeps the moved pages admin-only under /manager', async () => {
    window.history.pushState({}, '', '/manager/invites');
    mockRoles(['TRAINER']);

    render(<App />);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Invites Page')).not.toBeInTheDocument();
  });
});
