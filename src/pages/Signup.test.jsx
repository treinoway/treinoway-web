import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Signup from './Signup';
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
    // Default: invite preview unavailable (network) → graceful fallback form.
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });
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

    await user.type(await screen.findByLabelText(/e-mail/i), 'user@example.com');
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

  it('shows the email hint when a code is present and the preview is unavailable', async () => {
    renderWithRouter(<Signup />, { route: '/signup?code=TF-8F3K-2Q7M-04' });

    expect(await screen.findByText(/use o e-mail em que você recebeu o convite/i)).toBeInTheDocument();
  });

  it('does not show the email hint when no code is present', () => {
    renderWithRouter(<Signup />, { route: '/signup' });

    expect(screen.queryByText(/use o e-mail em que você recebeu o convite/i)).not.toBeInTheDocument();
  });
  it('does not request an invite preview when no code is present', () => {
    renderWithRouter(<Signup />, { route: '/signup' });

    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByText(/beta fechado/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /etapas do convite/i })).not.toBeInTheDocument();
  });

  describe('invite flow (?code=)', () => {
    const ROUTE = '/signup?code=tf-7bca-yazs-bd';
    const PREVIEW = {
      email: 'convidado@teufit.com.br',
      invitedByName: 'Carolina',
      expiresAt: '2026-10-15T00:00:00.000Z',
      accountExists: false,
    };
    const rejectWith = (status, messageCode) => {
      vi.mocked(api.get).mockRejectedValue({
        response: { status, data: { messageCode } },
        errorInfo: { status, messageCode },
        userMessage: 'Convite inválido.',
      });
    };

    it('replaces the generic subtitle with the invite context (always the impersonal title)', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });

      renderWithRouter(<Signup />, { route: ROUTE });

      // The title is always impersonal, even though the preview payload
      // includes an invitedByName — the frontend no longer reads that field.
      expect(
        await screen.findByRole('heading', { name: /você foi convidado\(a\) para o teste fechado/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(/alunos, treinos e resultados/i)).not.toBeInTheDocument();
      expect(screen.getByText('Beta fechado')).toBeInTheDocument();
      expect(screen.getByText('TF-7BCA-YAZS-BD')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith(
        '/invite/preview',
        expect.objectContaining({ params: { code: 'TF-7BCA-YAZS-BD' } })
      );
    });

    it('renders the 2-step indicator with "Criar conta" as the current step', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });

      renderWithRouter(<Signup />, { route: ROUTE });

      const steps = await screen.findByRole('list', { name: /etapas do convite/i });
      const [first, second] = within(steps).getAllByRole('listitem');
      expect(first).toHaveTextContent(/criar conta/i);
      expect(first).toHaveAttribute('aria-current', 'step');
      expect(second).toHaveTextContent(/acesso liberado/i);
      expect(second).not.toHaveAttribute('aria-current');
    });

    it('shows a loading placeholder instead of the form while the preview loads', () => {
      vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

      renderWithRouter(<Signup />, { route: ROUTE });

      expect(screen.getByRole('status')).toHaveTextContent(/verificando seu convite/i);
      expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /criar conta/i })).not.toBeInTheDocument();
    });

    it('prefills and locks the invited email and uses the invite CTA', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });

      renderWithRouter(<Signup />, { route: ROUTE });

      const emailInput = await screen.findByLabelText(/e-mail/i);
      expect(emailInput).toHaveValue('convidado@teufit.com.br');
      expect(emailInput).toHaveAttribute('readonly');
      expect(emailInput).toHaveAccessibleDescription(/e-mail do convite/i);
      expect(screen.getByRole('button', { name: /criar conta e ativar convite/i })).toBeInTheDocument();
      expect(screen.queryByText(/use o e-mail em que você recebeu o convite/i)).not.toBeInTheDocument();
    });

    it('signs up with the locked invited email and routes to /invite with the code', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      mockSignup.mockResolvedValue({ success: true });

      renderWithRouter(<Signup />, { route: ROUTE });

      await user.type(await screen.findByLabelText(/^senha$/i), 'pass1234');
      await user.click(screen.getByRole('button', { name: /criar conta e ativar convite/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith('convidado@teufit.com.br', 'pass1234');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/invite?code=tf-7bca-yazs-bd', { replace: true });
    });

    it('passes the invited email as Google login_hint', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      mockLoginWithGoogle.mockResolvedValue({ success: true });

      renderWithRouter(<Signup />, { route: ROUTE });

      await user.click(await screen.findByRole('button', { name: /cadastrar com google/i }));

      await waitFor(() => {
        expect(mockLoginWithGoogle).toHaveBeenCalledWith({ loginHint: 'convidado@teufit.com.br' });
      });
    });

    it('hides the form and points to login when an account already exists', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { ...PREVIEW, accountExists: true } });

      renderWithRouter(<Signup />, { route: ROUTE });

      expect(
        await screen.findByText(/você já tem uma conta com/i)
      ).toHaveTextContent('Você já tem uma conta com convidado@teufit.com.br. Entre para ativar seu convite.');
      expect(screen.getByRole('link', { name: /entrar e ativar convite/i })).toHaveAttribute(
        'href',
        '/login?code=tf-7bca-yazs-bd'
      );
      expect(screen.queryByLabelText(/^senha$/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cadastrar com google/i })).not.toBeInTheDocument();
    });

    it.each([
      ['invite.expired', 403, /este convite expirou/i],
      ['invite.revoked', 403, /este convite não é mais válido/i],
      ['invite.alreadyAccepted', 409, /este convite já foi utilizado/i],
      ['invite.notFound', 404, /convite não encontrado/i],
    ])('replaces the form with a state card on %s', async (messageCode, status, title) => {
      rejectWith(status, messageCode);

      renderWithRouter(<Signup />, { route: ROUTE });

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /criar conta/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cadastrar com google/i })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /suporte@teufit.com.br/i })).toHaveAttribute(
        'href',
        'mailto:suporte@teufit.com.br'
      );
      expect(screen.getByRole('link', { name: /tenho outro código/i })).toHaveAttribute('href', '/login');
      expect(screen.queryByRole('list', { name: /etapas do convite/i })).not.toBeInTheDocument();
    });

    it('mentions a newer invite on invite.revoked', async () => {
      rejectWith(403, 'invite.revoked');

      renderWithRouter(<Signup />, { route: ROUTE });

      expect(await screen.findByText(/convite mais recente/i)).toBeInTheDocument();
    });

    it('offers an "Entrar" CTA (without the dead code) on invite.alreadyAccepted', async () => {
      rejectWith(409, 'invite.alreadyAccepted');

      renderWithRouter(<Signup />, { route: ROUTE });

      await screen.findByRole('heading', { name: /este convite já foi utilizado/i });
      expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveAttribute('href', '/login');
    });

    it('keeps the invite framing with an editable email when the preview is unavailable', async () => {
      const user = userEvent.setup();
      mockSignup.mockResolvedValue({ success: true });

      renderWithRouter(<Signup />, { route: ROUTE });

      expect(
        await screen.findByRole('heading', { name: /você foi convidado\(a\) para o teste fechado/i })
      ).toBeInTheDocument();
      const emailInput = await screen.findByLabelText(/e-mail/i);
      expect(emailInput).not.toHaveAttribute('readonly');
      expect(screen.getByText(/use o e-mail em que você recebeu o convite/i)).toBeInTheDocument();

      await user.type(emailInput, 'outro@teufit.com.br');
      await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
      await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

      await waitFor(() => {
        expect(mockSignup).toHaveBeenCalledWith('outro@teufit.com.br', 'pass1234');
      });
      expect(mockLoginWithGoogle).not.toHaveBeenCalled();
    });

    it('calls Google without a hint when the preview is unavailable', async () => {
      const user = userEvent.setup();
      mockLoginWithGoogle.mockResolvedValue({ success: true });

      renderWithRouter(<Signup />, { route: ROUTE });

      await user.click(await screen.findByRole('button', { name: /cadastrar com google/i }));

      await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalledWith());
    });
  });
});
