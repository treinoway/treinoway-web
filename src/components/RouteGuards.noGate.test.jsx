import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '../test/test-utils';
import ProtectedRoute from './ProtectedRoute';
import RequireRole from './RequireRole';
import NutritionistRoute from './NutritionistRoute';
import { useAuth } from '../contexts/AuthContext';

// Toast spy hoisted so the mock factory and the assertions share it.
const mockShowToast = vi.hoisted(() => vi.fn());

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

// Mocks an authenticated user that the old beta gate would have blocked.
const setupGatedUser = (roles = []) => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    user: { id: 'user-1', email: 'ana@example.com', roles, betaAccess: false },
    hasRole: (role) => roles.includes(role),
  });
};

// Renders the guarded element at /guarded with probes on every redirect target.
const renderGuarded = (guarded) => render(
  <MemoryRouter initialEntries={['/guarded']}>
    <Routes>
      <Route path="/guarded" element={guarded} />
      <Route path="/invite" element={<div>Invite Page</div>} />
      <Route path="/login" element={<div>Login Page</div>} />
      <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      <Route path="/" element={<div>Home Page</div>} />
    </Routes>
  </MemoryRouter>
);

describe('route guards without the beta gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('ProtectedRoute', () => {
    it('renders its children for a user with betaAccess false while the gate flag is on', () => {
      setupGatedUser();

      renderGuarded(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Invite Page')).not.toBeInTheDocument();
    });

    it('still redirects an unauthenticated visitor to /login', () => {
      vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false, user: null, hasRole: () => false });

      renderGuarded(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);

      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('RequireRole', () => {
    it('renders its children for a trainer with betaAccess false while the gate flag is on', () => {
      setupGatedUser(['TRAINER']);

      renderGuarded(<RequireRole roles={['TRAINER']}><div>Trainer Content</div></RequireRole>);

      expect(screen.getByText('Trainer Content')).toBeInTheDocument();
      expect(screen.queryByText('Invite Page')).not.toBeInTheDocument();
    });

    it('sends a user without the role to /dashboard, not to /invite', () => {
      setupGatedUser([]);

      renderGuarded(<RequireRole roles={['TRAINER']}><div>Trainer Content</div></RequireRole>);

      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      expect(screen.queryByText('Invite Page')).not.toBeInTheDocument();
    });
  });

  describe('NutritionistRoute', () => {
    it('renders its children for a nutritionist with betaAccess false while the gate flag is on', () => {
      setupGatedUser(['NUTRITIONIST']);

      renderGuarded(<NutritionistRoute><div>Nutritionist Content</div></NutritionistRoute>);

      expect(screen.getByText('Nutritionist Content')).toBeInTheDocument();
      expect(screen.queryByText('Invite Page')).not.toBeInTheDocument();
    });

    it('sends a non-nutritionist to "/", not to /invite', () => {
      setupGatedUser([]);

      renderGuarded(<NutritionistRoute><div>Nutritionist Content</div></NutritionistRoute>);

      expect(screen.getByText('Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Invite Page')).not.toBeInTheDocument();
    });
  });
});
