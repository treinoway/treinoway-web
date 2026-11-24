import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, renderWithRouter, screen, waitFor, within } from '../test/test-utils';
import Signup from './Signup';
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

const mockSignupDirect = vi.fn();
const mockLoginWithGoogle = vi.fn();

const NEW_USER = { id: 'user-1', email: 'ana@example.com', roles: [], emailVerified: false, betaAccess: true };
const EMAIL_IN_USE_MESSAGE = 'Este e-mail já está cadastrado.';

// Builds the auth context value of a visitor, with optional overrides.
const authValue = (overrides = {}) => ({
  isAuthenticated: false,
  user: null,
  signupDirect: mockSignupDirect,
  loginWithGoogle: mockLoginWithGoogle,
  signup: vi.fn(),
  verifySignup: vi.fn(),
  signupWithInvite: vi.fn(),
  resendSignupCode: vi.fn(),
  ...overrides,
});

// Types the three signup fields; an empty value leaves that field untouched.
const fillForm = async (user, { name = 'Ana Lima', email = 'ana@example.com', password = 'pass1234' } = {}) => {
  if (name) await user.type(screen.getByLabelText('Nome'), name);
  if (email) await user.type(screen.getByLabelText('E-mail'), email);
  if (password) await user.type(screen.getByLabelText('Senha'), password);
};

// Clicks the "Criar conta" submit button.
const submitForm = (user) => user.click(screen.getByRole('button', { name: 'Criar conta' }));

// Returns the inline error rendered inside the DS field that wraps the labelled input.
const fieldAlert = (label) => within(screen.getByLabelText(label).closest('.field')).getByRole('alert');

// Lists every destination the page navigated to.
const navigatedPaths = () => mockNavigate.mock.calls.map(([to]) => String(to));

// Renders Signup at /signup with probes on the home and invite routes.
const renderSignupRoutes = (route = '/signup') => render(
  <MemoryRouter initialEntries={[route]}>
    <Routes>
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<div>Home Page</div>} />
      <Route path="/invite" element={<div>Invite Page</div>} />
    </Routes>
  </MemoryRouter>
);

describe('Signup (direct, no code step)', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authValue());
    mockSignupDirect.mockReset();
    mockSignupDirect.mockResolvedValue({ success: true, user: NEW_USER });
    mockLoginWithGoogle.mockReset();
    mockNavigate.mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('layout', () => {
    it('renders heading, subtitle, Google button, the three fields, hint, submit and login link', () => {
      renderWithRouter(<Signup />, { route: '/signup' });

      expect(screen.getByRole('heading', { name: 'Crie sua conta' })).toBeInTheDocument();
      expect(screen.getByText('Alunos, treinos e resultados.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cadastrar com Google' })).toBeInTheDocument();
      expect(screen.getByLabelText('Nome')).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
      expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    });

    it('asks for no profession and shows no e-mail confirmation step', () => {
      renderWithRouter(<Signup />, { route: '/signup' });

      expect(screen.getByLabelText('Nome')).toBeInTheDocument();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/treinador|nutricionista|como você atende/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/confirme seu e-mail/i)).not.toBeInTheDocument();
    });
  });

  describe('design system', () => {
    it('renders the submit as a sentence-case DS primary button', () => {
      renderWithRouter(<Signup />, { route: '/signup' });

      const submit = screen.getByRole('button', { name: 'Criar conta' });
      expect(submit).toHaveClass('btn', 'btn--primary');
      expect(submit).not.toHaveClass('btn-primary-full');
      expect(submit).toHaveAttribute('type', 'submit');
      expect(submit).toHaveTextContent('Criar conta');
    });

    it('renders the Google button as a DS secondary button', () => {
      renderWithRouter(<Signup />, { route: '/signup' });

      const google = screen.getByRole('button', { name: 'Cadastrar com Google' });
      expect(google).toHaveClass('btn', 'btn--secondary');
      expect(google).not.toHaveClass('btn-google');
    });

    it.each(['Nome', 'E-mail', 'Senha'])('renders "%s" as a DS input inside a DS field', (label) => {
      renderWithRouter(<Signup />, { route: '/signup' });

      const input = screen.getByLabelText(label);
      expect(input).toHaveClass('input');
      expect(input).not.toHaveClass('form-input');
      expect(input.closest('.field')).not.toBeNull();
    });
  });

  describe('submit', () => {
    it('splits the name on the first space and calls signupDirect once', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user, { name: 'Ana Maria Lima' });
      await submitForm(user);

      await waitFor(() => expect(mockSignupDirect).toHaveBeenCalledTimes(1));
      expect(mockSignupDirect).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: 'pass1234',
        firstName: 'Ana',
        lastName: 'Maria Lima',
      });
    });

    it('omits lastName when the name has a single word', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user, { name: 'Ana' });
      await submitForm(user);

      await waitFor(() => expect(mockSignupDirect).toHaveBeenCalledTimes(1));
      const [payload] = mockSignupDirect.mock.calls[0];
      expect(payload.firstName).toBe('Ana');
      expect(payload.lastName).toBeUndefined();
      expect(payload.email).toBe('ana@example.com');
      expect(payload.password).toBe('pass1234');
    });

    it('navigates to "/" after a successful signup, with no code step and no /invite detour', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user);
      await submitForm(user);

      await waitFor(() => expect(navigatedPaths()).toContain('/'));
      expect(navigatedPaths().some((path) => path.startsWith('/invite'))).toBe(false);
      expect(screen.queryByText(/confirme seu e-mail/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/código/i)).not.toBeInTheDocument();
    });

    it('navigates to "/" even when the gate flag is on and the created user has betaAccess false', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      mockSignupDirect.mockResolvedValue({ success: true, user: { ...NEW_USER, betaAccess: false } });
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user);
      await submitForm(user);

      await waitFor(() => expect(navigatedPaths()).toContain('/'));
      expect(navigatedPaths().some((path) => path.startsWith('/invite'))).toBe(false);
    });

    it('disables the submit and labels it "Carregando..." while the request is pending', async () => {
      mockSignupDirect.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user);
      await submitForm(user);

      expect(await screen.findByRole('button', { name: 'Carregando...' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Criar conta' })).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows an inline error on the name field and does not call the API when the name is empty', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user, { name: '' });
      await submitForm(user);

      expect(fieldAlert('Nome')).toHaveTextContent(/\S/);
      expect(mockSignupDirect).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows an inline error on the e-mail field and does not call the API when the e-mail is invalid', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user, { email: 'ana-sem-arroba' });
      await submitForm(user);

      expect(fieldAlert('E-mail')).toHaveTextContent(/\S/);
      expect(mockSignupDirect).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows an inline error on the password field and does not call the API when it has fewer than 8 characters', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user, { password: '1234567' });
      await submitForm(user);

      expect(fieldAlert('Senha')).toHaveTextContent(/\S/);
      expect(mockSignupDirect).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('e-mail already in use (409)', () => {
    beforeEach(() => {
      mockSignupDirect.mockResolvedValue({
        success: false,
        error: EMAIL_IN_USE_MESSAGE,
        errorCode: 'EMAIL_IN_USE',
      });
    });

    it('shows the message with an "Entrar" link to /login', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user);
      await submitForm(user);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(EMAIL_IN_USE_MESSAGE);
      expect(within(alert).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('keeps the form filled and usable', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user);
      await submitForm(user);

      await screen.findByRole('alert');
      expect(screen.getByLabelText('Nome')).toHaveValue('Ana Lima');
      expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com');
      expect(screen.getByLabelText('Senha')).toHaveValue('pass1234');
      expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
    });
  });

  describe('other failures', () => {
    it('shows the returned message without the "Entrar" shortcut inside it', async () => {
      mockSignupDirect.mockResolvedValue({ success: false, error: 'Muitas tentativas. Tente mais tarde.', errorCode: 'RATE_LIMITED' });
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await fillForm(user);
      await submitForm(user);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Muitas tentativas. Tente mais tarde.');
      expect(within(alert).queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
    });
  });

  describe('Google signup', () => {
    it('navigates to "/" after Google auth even when the gate flag is on and betaAccess is false', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      mockLoginWithGoogle.mockResolvedValue({ success: true, user: { ...NEW_USER, betaAccess: false } });
      const user = userEvent.setup();
      renderWithRouter(<Signup />, { route: '/signup' });

      await user.click(screen.getByRole('button', { name: 'Cadastrar com Google' }));

      await waitFor(() => expect(navigatedPaths()).toContain('/'));
      expect(navigatedPaths().some((path) => path.startsWith('/invite'))).toBe(false);
    });
  });

  describe('already authenticated', () => {
    it('redirects to "/" and never to /invite, even with betaAccess false and the gate flag on', () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      vi.mocked(useAuth).mockReturnValue(authValue({
        isAuthenticated: true,
        user: { ...NEW_USER, betaAccess: false },
      }));

      renderSignupRoutes('/signup');

      expect(screen.getByText('Home Page')).toBeInTheDocument();
      expect(screen.queryByText('Invite Page')).not.toBeInTheDocument();
    });
  });
});
