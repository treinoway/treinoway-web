import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLocation, useParams } from 'react-router-dom';
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
vi.mock('./hooks/useBetaGate', () => ({ default: () => false }));
vi.mock('./components/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('./components/Layout', () => ({ default: ({ children }) => children }));
vi.mock('./pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));

// Stub of the Financeiro page that prints where it was mounted.
const FinancePageStub = () => {
  const location = useLocation();
  return <div>{`Finance Page ${location.pathname}`}</div>;
};

// Stub of the history page that prints the person id it received.
const HistoryPageStub = () => {
  const { studentId } = useParams();
  const location = useLocation();
  return <div>{`History Page ${studentId} ${location.pathname}`}</div>;
};

vi.mock('./pages/trainer/Financeiro', () => ({ default: () => <FinancePageStub /> }));
vi.mock('./pages/trainer/SubscriptionHistory', () => ({ default: () => <HistoryPageStub /> }));

// Test helper: sets the signed-in user roles.
const setRoles = (roles) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u1', betaAccess: true, platformPlan: { tier: 'BETA', limits: {} } },
    isAuthenticated: true,
    hasRole: (role) => roles.includes(role),
  });
};

// Test helper: renders the app at a path.
const renderAt = (path) => {
  window.history.pushState({}, '', path);
  render(<App />);
};

describe('App routes: Financeiro for any professional', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['trainer-only', ['TRAINER']],
    ['nutritionist-only', ['NUTRITIONIST']],
    ['dual-role', ['TRAINER', 'NUTRITIONIST']],
  ])('renders /financeiro for a %s user', (_label, roles) => {
    setRoles(roles);
    renderAt('/financeiro');
    expect(screen.getByText('Finance Page /financeiro')).toBeInTheDocument();
  });

  it('redirects a user with neither role away from /financeiro', () => {
    setRoles([]);
    renderAt('/financeiro');
    expect(screen.queryByText(/^Finance Page/)).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it.each([['TRAINER'], ['NUTRITIONIST']])('redirects /trainer/financeiro to /financeiro (%s)', (role) => {
    setRoles([role]);
    renderAt('/trainer/financeiro');
    expect(screen.getByText('Finance Page /financeiro')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/financeiro');
  });

  it('keeps the query string when redirecting /trainer/financeiro?status=overdue', () => {
    setRoles(['TRAINER']);
    renderAt('/trainer/financeiro?status=overdue');
    expect(window.location.pathname).toBe('/financeiro');
    expect(window.location.search).toBe('?status=overdue');
  });

  it('renders the person history at /financeiro/alunos/:studentId for a nutritionist', () => {
    setRoles(['NUTRITIONIST']);
    renderAt('/financeiro/alunos/patient-1');
    expect(screen.getByText('History Page patient-1 /financeiro/alunos/patient-1')).toBeInTheDocument();
  });

  it('redirects the old trainer history path to /financeiro/alunos/:studentId', () => {
    setRoles(['TRAINER']);
    renderAt('/trainer/students/s1/subscription-history');
    expect(screen.getByText('History Page s1 /financeiro/alunos/s1')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/financeiro/alunos/s1');
  });

  it('redirects a user with neither role away from the history', () => {
    setRoles([]);
    renderAt('/financeiro/alunos/s1');
    expect(screen.queryByText(/^History Page/)).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
