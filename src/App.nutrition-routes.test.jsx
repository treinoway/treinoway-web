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
vi.mock('./pages/nutritionist/Patients', () => ({ default: () => <div>Patients Page</div> }));
vi.mock('./pages/nutritionist/PlanSummary', () => ({ default: () => <div>Summary Page</div> }));
vi.mock('./pages/nutritionist/PrescriptionGoals', () => ({ default: () => <div>Goals Page</div> }));
vi.mock('./pages/nutritionist/PrescriptionMenu', () => ({ default: () => <div>Menu Page</div> }));
vi.mock('./pages/nutritionist/PrescriptionGuidance', () => ({ default: () => <div>Guidance Page</div> }));
vi.mock('./pages/nutritionist/MyFoods', () => ({ default: () => <div>Foods Page</div> }));

// Test helper: sets the signed-in user roles.
const setRoles = (roles) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u1', betaAccess: true, platformPlan: { tier: 'BETA', limits: {} } },
    isAuthenticated: true,
    hasRole: (role) => roles.includes(role),
  });
};

describe('App routes: nutritionist area', () => {
  beforeEach(() => setRoles(['NUTRITIONIST']));

  it.each([
    ['/nutritionist/patients', 'Patients Page'],
    ['/nutritionist/patients/p1/plan', 'Summary Page'],
    ['/nutritionist/patients/p1/plan/goals', 'Goals Page'],
    ['/nutritionist/patients/p1/plan/menu', 'Menu Page'],
    ['/nutritionist/patients/p1/plan/guidance', 'Guidance Page'],
    ['/nutritionist/foods', 'Foods Page'],
  ])('renders %s for a nutritionist', (path, text) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('sends a user without the nutritionist role back to /', () => {
    setRoles(['TRAINER']);
    window.history.pushState({}, '', '/nutritionist/patients');
    render(<App />);
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Patients Page')).not.toBeInTheDocument();
  });

  it.each(['/my/diet', '/nutritionist/onboarding', '/nutritionist/diet-protocols', '/nutritionist/diet-templates', '/nutritionist/profile'])(
    'no longer has %s (falls back to /)',
    (path) => {
      window.history.pushState({}, '', path);
      render(<App />);
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    },
  );
});
