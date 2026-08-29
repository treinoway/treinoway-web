import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Signup from './Signup';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSignup = vi.fn();
const mockLoginWithGoogle = vi.fn();

describe('Signup', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      signup: mockSignup,
      loginWithGoogle: mockLoginWithGoogle,
    });
    mockSignup.mockReset();
    mockLoginWithGoogle.mockReset();
    mockNavigate.mockReset();
  });

  it('renders logo, heading, subtitle, email field, password field, and submit button', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByRole('img', { name: /teufit/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /criar conta/i })).toBeInTheDocument();
    expect(screen.getByText(/alunos, treinos e resultados/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^criar conta$/i })).toBeInTheDocument();
  });

  it('does not render a confirm password field', () => {
    renderWithRouter(<Signup />);

    expect(screen.queryByLabelText(/confirmar senha/i)).not.toBeInTheDocument();
  });

  it('renders a password hint', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
  });

  it('renders Google signup button', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByRole('button', { name: /cadastrar com google/i })).toBeInTheDocument();
  });

  it('renders footer link to login', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByRole('link', { name: /^entrar$/i })).toBeInTheDocument();
  });

  it('renders a legal footer link to the privacy policy', () => {
    renderWithRouter(<Signup />);

    expect(
      screen.getByRole('link', { name: /política de privacidade/i })
    ).toHaveAttribute('href', '/privacy-policy');
  });

  it('renders a legal footer link to the terms of use', () => {
    renderWithRouter(<Signup />);

    expect(
      screen.getByRole('link', { name: /termos e condições/i })
    ).toHaveAttribute('href', '/terms');
  });

  it('redirects to dashboard when already authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      signup: mockSignup,
      loginWithGoogle: mockLoginWithGoogle,
    });

    renderWithRouter(<Signup />, { route: '/signup' });

    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });

  it('shows inline error when password is shorter than 8 characters on submit', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), '1234567');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('shows inline password length error on blur', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/^senha$/i), '123');
    await user.tab();

    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument();
  });

  it('shows inline validation error for a 7-character password and does not call signup', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'abcdefg');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('calls signup with email and password when form is valid', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: true });

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('user@example.com', 'pass1234');
    });
  });

  it('shows API error message when signup fails', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: false, error: 'E-mail já cadastrado.' });

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    await waitFor(() => {
      expect(screen.getByText('E-mail já cadastrado.')).toBeInTheDocument();
    });
  });

  it('disables submit button while signup is in progress', async () => {
    const user = userEvent.setup();
    mockSignup.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    expect(screen.getByRole('button', { name: /criando conta/i })).toBeDisabled();
  });

  it('disables the Google button while email signup is in progress', async () => {
    const user = userEvent.setup();
    mockSignup.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    expect(screen.getByRole('button', { name: /cadastrar com google/i })).toBeDisabled();
  });

  it('toggles password visibility when the toggle button is clicked', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    const passwordInput = screen.getByLabelText(/^senha$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /^mostrar senha$/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /^ocultar senha$/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls loginWithGoogle when Google button is clicked', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockResolvedValue({ success: true });

    renderWithRouter(<Signup />);

    await user.click(screen.getByRole('button', { name: /cadastrar com google/i }));

    await waitFor(() => {
      expect(mockLoginWithGoogle).toHaveBeenCalled();
    });
  });

  it('shows loading state on Google button while Google signup is in progress', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await user.click(screen.getByRole('button', { name: /cadastrar com google/i }));

    expect(screen.getByRole('button', { name: /cadastrando\.\.\./i })).toBeDisabled();
  });

  it('shows error when Google signup fails', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockResolvedValue({ success: false, error: 'Erro no Google.' });

    renderWithRouter(<Signup />);

    await user.click(screen.getByRole('button', { name: /cadastrar com google/i }));

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

    renderWithRouter(<Signup />);

    await user.click(screen.getByRole('button', { name: /cadastrar com google/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/esse e-mail já está cadastrado com senha/i)
      ).toBeInTheDocument();
    });
  });

  it('calls signup and completes on successful signup', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: true });

    renderWithRouter(<Signup />, { route: '/signup' });

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('user@example.com', 'pass1234');
    });
  });

  it('navigates to dashboard on successful signup without a code', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: true });

    renderWithRouter(<Signup />, { route: '/signup' });

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('navigates to /invite carrying the code on successful signup when a code is present', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: true });

    renderWithRouter(<Signup />, { route: '/signup?code=TF-8F3K-2Q7M-04' });

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/invite?code=TF-8F3K-2Q7M-04', { replace: true });
    });
  });

  describe('beta gate direct navigation', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('navigates straight to /invite when gate is on and the fresh user is not granted', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      const user = userEvent.setup();
      mockSignup.mockResolvedValue({ success: true, user: { betaAccess: false } });

      renderWithRouter(<Signup />, { route: '/signup' });

      await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
      await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/invite', { replace: true });
      });
    });

    it('navigates to dashboard when gate is on but the fresh user is granted', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      const user = userEvent.setup();
      mockSignup.mockResolvedValue({ success: true, user: { betaAccess: true } });

      renderWithRouter(<Signup />, { route: '/signup' });

      await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
      await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('navigates to dashboard when the gate is disabled even if the user is not granted', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'false');
      const user = userEvent.setup();
      mockSignup.mockResolvedValue({ success: true, user: { betaAccess: false } });

      renderWithRouter(<Signup />, { route: '/signup' });

      await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
      await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
      await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('navigates a not-granted Google user straight to /invite when gate is on', async () => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
      const user = userEvent.setup();
      mockLoginWithGoogle.mockResolvedValue({ success: true, user: { betaAccess: false } });

      renderWithRouter(<Signup />, { route: '/signup' });

      await user.click(screen.getByRole('button', { name: /cadastrar com google/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/invite', { replace: true });
      });
    });
  });

  it('preserves the code on the login link when a code is present', () => {
    renderWithRouter(<Signup />, { route: '/signup?code=TF-8F3K-2Q7M-04' });

    expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveAttribute(
      'href',
      '/login?code=TF-8F3K-2Q7M-04'
    );
  });

  it('shows the email hint when a code is present', () => {
    renderWithRouter(<Signup />, { route: '/signup?code=TF-8F3K-2Q7M-04' });

    expect(screen.getByText(/use o e-mail em que você recebeu o convite/i)).toBeInTheDocument();
  });

  it('does not show the email hint when no code is present', () => {
    renderWithRouter(<Signup />, { route: '/signup' });

    expect(screen.queryByText(/use o e-mail em que você recebeu o convite/i)).not.toBeInTheDocument();
  });
});
