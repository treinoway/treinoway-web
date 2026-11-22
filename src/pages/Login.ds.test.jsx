import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, renderWithRouter, screen, waitFor } from '../test/test-utils';
import Login from './Login';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = vi.fn();
const mockLoginWithGoogle = vi.fn();

const GATED_USER = { id: 'user-1', email: 'ana@example.com', roles: [], betaAccess: false };

// Builds the auth context value of a visitor, with optional overrides.
const authValue = (overrides = {}) => ({
  isAuthenticated: false,
  user: null,
  login: mockLogin,
  loginWithGoogle: mockLoginWithGoogle,
  ...overrides,
});

// Lists every destination the page navigated to.
const navigatedPaths = () => mockNavigate.mock.calls.map(([to]) => String(to));

// Fills e-mail and password and submits the login form.
const submitLogin = async (user) => {
  await user.type(await screen.findByLabelText('E-mail'), 'ana@example.com');
  await user.type(screen.getByLabelText('Senha'), 'pass1234');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
};

// Renders Login at the route with probes on the home and invite routes.
const renderLoginRoutes = (route = '/login') => render(
  <MemoryRouter initialEntries={[route]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<div>Home Page</div>} />
      <Route path="/invite" element={<div>Invite Page</div>} />
    </Routes>
  </MemoryRouter>
);

describe('Login on DS components, with no beta gate', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authValue());
    mockLogin.mockReset();
    mockLogin.mockResolvedValue({ success: true, user: GATED_USER });
    mockLoginWithGoogle.mockReset();
    mockNavigate.mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('design system', () => {
    it('renders the submit as a DS primary button', () => {
      renderWithRouter(<Login />, { route: '/login' });

      const submit = screen.getByRole('button', { name: 'Entrar' });
      expect(submit).toHaveClass('btn', 'btn--primary');
      expect(submit).not.toHaveClass('btn-primary-full');
    });

    it('renders the Google button as a DS secondary button', () => {
      renderWithRouter(<Login />, { route: '/login' });

      const google = screen.getByRole('button', { name: 'Continuar com Google' });
      expect(google).toHaveClass('btn', 'btn--secondary');
      expect(google).not.toHaveClass('btn-google');
    });

    it.each(['E-mail', 'Senha'])('renders "%s" as a DS input', (label) => {
      renderWithRouter(<Login />, { route: '/login' });

      const input = screen.getByLabelText(label);
      expect(input).toHaveClass('input');
      expect(input).not.toHaveClass('form-input');
    });
  });

  describe('post-auth destination', () => {
    it('navigates to "/" after login even when the gate flag is on and betaAccess is false', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      const user = userEvent.setup();
      renderWithRouter(<Login />, { route: '/login' });

      await submitLogin(user);

      await waitFor(() => expect(navigatedPaths()).toContain('/'));
      expect(navigatedPaths().some((path) => path.startsWith('/invite'))).toBe(false);
    });

    it('navigates to "/" after Google auth even when the gate flag is on and betaAccess is false', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      mockLoginWithGoogle.mockResolvedValue({ success: true, user: GATED_USER });
      const user = userEvent.setup();
      renderWithRouter(<Login />, { route: '/login' });

      await user.click(screen.getByRole('button', { name: 'Continuar com Google' }));

      await waitFor(() => expect(navigatedPaths()).toContain('/'));
      expect(navigatedPaths().some((path) => path.startsWith('/invite'))).toBe(false);
    });

    it('redirects an authenticated user to "/" and never to /invite when the URL has no code', () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      vi.mocked(useAuth).mockReturnValue(authValue({ isAuthenticated: true, user: GATED_USER }));

      renderLoginRoutes('/login');

      expect(screen.getByText('Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Invite Page')).not.toBeInTheDocument();
    });

    it('still sends the user to /invite with the code when the URL carries ?code=', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login />, { route: '/login?code=TF-ABCD-EFGH-12' });

      await submitLogin(user);

      await waitFor(() => expect(navigatedPaths()).toContain('/invite?code=TF-ABCD-EFGH-12'));
    });
  });
});
