import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Login from './Login';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = vi.fn();
const mockLoginWithGoogle = vi.fn();

describe('Login', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
    });
    mockLogin.mockReset();
    mockLoginWithGoogle.mockReset();
    mockNavigate.mockReset();
  });

  it('renders logo, heading, subtitle, email field, password field, and submit button', () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole('img', { name: /teufit/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
  });

  it('renders Google login button', () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole('link', { name: /esqueceu a senha/i })).toBeInTheDocument();
  });

  it('renders footer link to signup', () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole('link', { name: /criar conta/i })).toBeInTheDocument();
  });

  it('renders a legal footer link to the privacy policy', () => {
    renderWithRouter(<Login />);

    expect(
      screen.getByRole('link', { name: /política de privacidade/i })
    ).toHaveAttribute('href', '/privacy-policy');
  });

  it('redirects to dashboard when already authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      login: mockLogin,
      loginWithGoogle: mockLoginWithGoogle,
    });

    renderWithRouter(<Login />, { route: '/login' });

    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });

  it('calls login with entered email and password on submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123');
    });
  });

  it('shows error message when login fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, error: 'E-mail ou senha incorretos.' });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => {
      expect(screen.getByText('E-mail ou senha incorretos.')).toBeInTheDocument();
    });
  });

  it('disables the submit button while login is in progress', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();
  });

  it('disables the Google button while email login is in progress', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeDisabled();
  });

  it('toggles password visibility when the toggle button is clicked', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Login />);

    const passwordInput = screen.getByLabelText(/^senha$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /mostrar senha/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /ocultar senha/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls loginWithGoogle when Google button is clicked', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockResolvedValue({ success: true });

    renderWithRouter(<Login />);

    await user.click(screen.getByRole('button', { name: /continuar com google/i }));

    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalled();
    });
  });

  it('shows loading state on Google button while Google login is in progress', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Login />);

    await user.click(screen.getByRole('button', { name: /continuar com google/i }));

    expect(screen.getByRole('button', { name: /conectando\.\.\./i })).toBeDisabled();
  });

  it('shows error when Google login fails', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockResolvedValue({ success: false, error: 'Erro no Google.' });

    renderWithRouter(<Login />);

    await user.click(screen.getByRole('button', { name: /continuar com google/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro no Google.')).toBeInTheDocument();
    });
  });

  it('shows credential conflict message when Google returns that error', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockResolvedValue({
      success: false,
      error: 'Firebase: auth/account-exists-with-different-credential',
    });

    renderWithRouter(<Login />);

    await user.click(screen.getByRole('button', { name: /continuar com google/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/esse e-mail já está cadastrado com senha/i)
      ).toBeInTheDocument();
    });
  });

  it('calls login and does not show an error on successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123');
    });

    expect(screen.queryByText(/e-mail ou senha incorretos/i)).not.toBeInTheDocument();
  });

  it('navigates to dashboard on successful login without a code', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderWithRouter(<Login />, { route: '/login' });

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('navigates to /invite carrying the code on successful login when a code is present', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderWithRouter(<Login />, { route: '/login?code=TF-8F3K-2Q7M-04' });

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/invite?code=TF-8F3K-2Q7M-04', { replace: true });
    });
  });

  it('preserves the code on the signup link when a code is present', () => {
    renderWithRouter(<Login />, { route: '/login?code=TF-8F3K-2Q7M-04' });

    expect(screen.getByRole('link', { name: /criar conta/i })).toHaveAttribute(
      'href',
      '/signup?code=TF-8F3K-2Q7M-04'
    );
  });

  describe('beta gate direct navigation', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('navigates straight to /invite when gate is on and the fresh user is not granted', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ success: true, user: { betaAccess: false } });

      renderWithRouter(<Login />, { route: '/login' });

      await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
      await user.click(screen.getByRole('button', { name: /^entrar$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/invite', { replace: true });
      });
    });

    it('navigates to dashboard when gate is on but the fresh user is granted', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ success: true, user: { betaAccess: true } });

      renderWithRouter(<Login />, { route: '/login' });

      await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
      await user.click(screen.getByRole('button', { name: /^entrar$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('navigates to dashboard when the gate is disabled even if the user is not granted', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'false');
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ success: true, user: { betaAccess: false } });

      renderWithRouter(<Login />, { route: '/login' });

      await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
      await user.click(screen.getByRole('button', { name: /^entrar$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('navigates a not-granted Google user straight to /invite when gate is on', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      const user = userEvent.setup();
      mockLoginWithGoogle.mockResolvedValue({ success: true, user: { betaAccess: false } });

      renderWithRouter(<Login />, { route: '/login' });

      await user.click(screen.getByRole('button', { name: /continuar com google/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/invite', { replace: true });
      });
    });
  });
});
