import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Login from './Login';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
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
    // Default: invite preview unavailable (network) → graceful fallback form.
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });
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

  it('renders a legal footer link to the terms of use', () => {
    renderWithRouter(<Login />);

    expect(
      screen.getByRole('link', { name: /termos e condições/i })
    ).toHaveAttribute('href', '/terms');
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
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
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

  it('keeps the normal Google label and stays enabled while the popup is open', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Login />);

    await user.click(screen.getByRole('button', { name: /continuar com google/i }));

    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /conectando\.\.\./i })).not.toBeInTheDocument();
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

    await user.type(await screen.findByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/invite?code=TF-8F3K-2Q7M-04', { replace: true });
    });
  });

  it('preserves the code on the signup link when a code is present', async () => {
    renderWithRouter(<Login />, { route: '/login?code=TF-8F3K-2Q7M-04' });

    await screen.findByLabelText(/e-mail/i);
    expect(screen.getByRole('link', { name: /criar conta/i })).toHaveAttribute(
      'href',
      '/signup?code=TF-8F3K-2Q7M-04'
    );
  });

  describe('beta gate direct navigation', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
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
  });
  it('does not request an invite preview when no code is present', () => {
    renderWithRouter(<Login />, { route: '/login' });

    expect(api.get).not.toHaveBeenCalled();
    expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
    expect(screen.queryByText(/beta fechado/i)).not.toBeInTheDocument();
  });

  describe('old invite link (?code=)', () => {
    const ROUTE = '/login?code=TF-7BCA-YAZS-BD';

    it('renders the plain login with no invite framing and no preview request', () => {
      vi.mocked(api.get).mockResolvedValue({ data: { email: 'convidado@teufit.com.br', accountExists: true } });

      renderWithRouter(<Login />, { route: ROUTE });

      expect(screen.getByText(/bem-vindo de volta/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument();
      expect(screen.getByText(/novo por aqui/i)).toBeInTheDocument();
      expect(screen.queryByText(/beta fechado/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/teste fechado/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('list', { name: /etapas do convite/i })).not.toBeInTheDocument();
      expect(screen.queryByText('TF-7BCA-YAZS-BD')).not.toBeInTheDocument();
      expect(api.get).not.toHaveBeenCalled();
    });

    it('keeps the e-mail editable and empty, and logs in with the typed e-mail', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ success: true });

      renderWithRouter(<Login />, { route: ROUTE });

      const emailInput = screen.getByLabelText(/e-mail/i);
      expect(emailInput).toHaveValue('');
      expect(emailInput).not.toHaveAttribute('readonly');

      await user.type(emailInput, 'ana@example.com');
      await user.type(screen.getByLabelText(/^senha$/i), 'secret123');
      await user.click(screen.getByRole('button', { name: /^entrar$/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('ana@example.com', 'secret123');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/invite?code=TF-7BCA-YAZS-BD', { replace: true });
    });

    it('calls Google without a login hint', async () => {
      const user = userEvent.setup();
      mockLoginWithGoogle.mockResolvedValue({ success: true });

      renderWithRouter(<Login />, { route: ROUTE });

      await user.click(screen.getByRole('button', { name: /continuar com google/i }));

      await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
      expect(mockLoginWithGoogle.mock.calls[0][0]).not.toHaveProperty('loginHint');
    });
  });

  describe('Google popup lifecycle', () => {
    const googleButton = (name = /continuar com google/i) => screen.getByRole('button', { name });

    it('keeps inputs, submit and Google button enabled while the popup is pending', async () => {
      const user = userEvent.setup();
      mockLoginWithGoogle.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<Login />);
      await user.click(googleButton());

      expect(screen.getByLabelText(/e-mail/i)).toBeEnabled();
      expect(screen.getByLabelText(/^senha$/i)).toBeEnabled();
      expect(screen.getByRole('button', { name: /^entrar$/i })).toBeEnabled();
      expect(googleButton(/continuar com google/i)).toBeEnabled();
    });

    it('disables controls during the backend exchange after the popup resolves', async () => {
      const user = userEvent.setup();
      mockLoginWithGoogle.mockImplementation(({ onPopupResolved }) => {
        onPopupResolved();
        return new Promise(() => {});
      });

      renderWithRouter(<Login />);
      await user.click(googleButton());

      expect(screen.getByLabelText(/e-mail/i)).toBeDisabled();
      expect(googleButton(/conectando\.\.\./i)).toBeDisabled();
    });

    it('re-enables everything without an error when the popup is closed', async () => {
      const user = userEvent.setup();
      mockLoginWithGoogle.mockResolvedValue({ success: false, error: null });

      renderWithRouter(<Login />);
      await user.click(googleButton());

      await waitFor(() => expect(googleButton(/continuar com google/i)).toBeEnabled());
      expect(screen.getByLabelText(/e-mail/i)).toBeEnabled();
      expect(screen.queryByText(/erro|falha/i)).not.toBeInTheDocument();
    });

    it('lets the user retry while a popup is pending and ignores the stale result', async () => {
      const user = userEvent.setup();
      let rejectFirst;
      mockLoginWithGoogle
        .mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject; }))
        .mockImplementationOnce(() => new Promise(() => {}));

      renderWithRouter(<Login />);
      await user.click(googleButton());
      await user.click(googleButton(/continuar com google/i));
      expect(mockLoginWithGoogle).toHaveBeenCalledTimes(2);

      await act(async () => { rejectFirst(new Error('stale')); });

      expect(googleButton(/continuar com google/i)).toBeEnabled();
      expect(screen.queryByText(/inesperado/i)).not.toBeInTheDocument();
    });
  });
});
