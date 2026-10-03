import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
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
const mockVerifySignup = vi.fn();
const mockSignupWithInvite = vi.fn();
const mockResendSignupCode = vi.fn();
const mockLoginWithGoogle = vi.fn();

const CODE_LABEL = /código de verificação/i;

const authValue = (overrides = {}) => ({
  isAuthenticated: false,
  signup: mockSignup,
  verifySignup: mockVerifySignup,
  signupWithInvite: mockSignupWithInvite,
  resendSignupCode: mockResendSignupCode,
  loginWithGoogle: mockLoginWithGoogle,
  ...overrides,
});

const submitSignupForm = async (user, { email = 'user@example.com', password = 'pass1234' } = {}) => {
  await user.type(await screen.findByLabelText(/e-mail/i), email);
  await user.type(screen.getByLabelText(/^senha$/i), password);
  await user.click(screen.getByRole('button', { name: /^criar conta$/i }));
};

const enterCode = async (user, code = '123456') => {
  await user.type(await screen.findByLabelText(CODE_LABEL), code);
};

describe('Signup', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authValue());
    mockSignup.mockReset();
    mockSignup.mockResolvedValue({ success: true });
    mockVerifySignup.mockReset();
    mockVerifySignup.mockResolvedValue({ success: true, user: { id: 'user-1' } });
    mockResendSignupCode.mockReset();
    mockResendSignupCode.mockResolvedValue({ success: true });
    mockSignupWithInvite.mockReset();
    mockSignupWithInvite.mockResolvedValue({
      success: true,
      user: { id: 'user-1', betaAccess: true },
      linkedTrainers: 0,
    });
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
    vi.mocked(useAuth).mockReturnValue(authValue({ isAuthenticated: true }));

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

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('user@example.com', 'pass1234');
    });
  });

  it('shows the API error and stays on the form when signup fails (validation / rate limit)', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: false, error: 'Informe um e-mail válido.' });

    renderWithRouter(<Signup />);

    await submitSignupForm(user);

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.queryByLabelText(CODE_LABEL)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^criar conta$/i })).toBeEnabled();
  });

  it('disables submit button while signup is in progress', async () => {
    const user = userEvent.setup();
    mockSignup.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    expect(screen.getByRole('button', { name: /enviando código/i })).toBeDisabled();
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

  describe('code step', () => {
    it('replaces the form with the code step and the uniform notice after signup', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);

      const codeInput = await screen.findByLabelText(CODE_LABEL);
      expect(codeInput).toHaveAttribute('autocomplete', 'one-time-code');
      expect(codeInput).toHaveAttribute('inputmode', 'numeric');
      expect(screen.getByRole('heading', { name: /confirme seu e-mail/i })).toBeInTheDocument();
      expect(screen.getByText(/ainda não tiver conta/i)).toHaveTextContent(
        'Se user@example.com ainda não tiver conta, enviamos um código de 6 dígitos. Se já tiver, enviamos as instruções para entrar.'
      );
      expect(screen.queryByLabelText(/^senha$/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cadastrar com google/i })).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('auto-submits the 6-digit code with the in-memory password and navigates home', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await enterCode(user);

      await waitFor(() => {
        expect(mockVerifySignup).toHaveBeenCalledWith('user@example.com', '123456', 'pass1234');
      });
      expect(mockVerifySignup).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('accepts a pasted code with separators and keeps only the 6 digits', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await user.click(await screen.findByLabelText(CODE_LABEL));
      await user.paste('Código: 123 456');

      await waitFor(() => {
        expect(mockVerifySignup).toHaveBeenCalledWith('user@example.com', '123456', 'pass1234');
      });
    });

    it('ignores non-digits typed into the code field', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await enterCode(user, '12ab3');

      expect(screen.getByLabelText(CODE_LABEL)).toHaveValue('123');
      expect(mockVerifySignup).not.toHaveBeenCalled();
    });

    it('asks for the full code when confirming an incomplete one', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await enterCode(user, '123');
      await user.click(screen.getByRole('button', { name: /confirmar código/i }));

      expect(screen.getByRole('alert')).toHaveTextContent('Informe o código de 6 dígitos.');
      expect(mockVerifySignup).not.toHaveBeenCalled();
    });

    it('disables the code field and shows loading while verifying', async () => {
      const user = userEvent.setup();
      mockVerifySignup.mockReturnValue(new Promise(() => {}));

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await enterCode(user);

      expect(await screen.findByRole('button', { name: /confirmando/i })).toBeDisabled();
      expect(screen.getByLabelText(CODE_LABEL)).toBeDisabled();
    });

    it('shows the invalid-code error and lets the user retry with the confirm button', async () => {
      const user = userEvent.setup();
      mockVerifySignup
        .mockResolvedValueOnce({
          success: false,
          error: 'Código inválido. Confira o código e tente novamente.',
          messageCode: 'emailVerification.invalidCode',
        })
        .mockResolvedValueOnce({ success: true, user: { id: 'user-1' } });

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await enterCode(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(/código inválido/i);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /reenviar código/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /confirmar código/i }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
      expect(mockVerifySignup).toHaveBeenCalledTimes(2);
    });

    it('shows a rate-limit error without asking for a new code', async () => {
      const user = userEvent.setup();
      mockVerifySignup.mockResolvedValue({
        success: false,
        error: 'Muitas tentativas. Aguarde um momento e tente novamente.',
        messageCode: 'request.rateLimitExceeded',
      });

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await enterCode(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(/muitas tentativas/i);
      expect(screen.getByRole('button', { name: /confirmar código/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enviar novo código/i })).not.toBeInTheDocument();
    });

    it('returns to the form keeping the email when "Trocar e-mail" is clicked', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await user.click(await screen.findByRole('button', { name: /trocar e-mail/i }));

      expect(screen.queryByLabelText(CODE_LABEL)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/e-mail/i)).toHaveValue('user@example.com');
      expect(screen.getByRole('button', { name: /^criar conta$/i })).toBeInTheDocument();
    });

    it('verifies with the newly submitted email after changing it', async () => {
      const user = userEvent.setup();

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user, { email: 'typo@example.com' });
      await user.click(await screen.findByRole('button', { name: /trocar e-mail/i }));
      await user.clear(screen.getByLabelText(/e-mail/i));
      await user.type(screen.getByLabelText(/e-mail/i), 'right@example.com');
      await user.click(screen.getByRole('button', { name: /^criar conta$/i }));
      await enterCode(user);

      await waitFor(() => {
        expect(mockVerifySignup).toHaveBeenCalledWith('right@example.com', '123456', 'pass1234');
      });
    });
  });

  describe('code step — resend', () => {
    let user;

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // The countdown chains one 1s timeout per render, so tick second by second.
    const waitCooldown = async () => {
      await screen.findByLabelText(CODE_LABEL);
      for (let second = 0; second < 60; second += 1) {
        await act(async () => {
          vi.advanceTimersByTime(1000);
        });
      }
    };

    it('starts with a 60s local countdown and resends to the same email afterwards', async () => {
      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);

      expect(await screen.findByRole('button', { name: /reenviar código \(\d+s\)/i })).toBeDisabled();

      await waitCooldown();
      const resendButton = screen.getByRole('button', { name: /^reenviar código$/i });
      expect(resendButton).toBeEnabled();

      await user.click(resendButton);

      expect(mockResendSignupCode).toHaveBeenCalledWith('user@example.com');
      expect(await screen.findByRole('status')).toHaveTextContent(/novo código solicitado/i);
      expect(screen.getByRole('button', { name: /reenviar código \(\d+s\)/i })).toBeDisabled();
    });

    it('shows the error when the resend request fails', async () => {
      mockResendSignupCode.mockResolvedValue({ success: false, error: 'Sem conexão com a internet.' });

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await waitCooldown();
      await user.click(screen.getByRole('button', { name: /^reenviar código$/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão com a internet.');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it.each([
      ['emailVerification.codeExpired', 'Código expirado. Solicite um novo código.'],
      ['emailVerification.tooManyAttempts', 'Muitas tentativas incorretas. Solicite um novo código.'],
    ])('highlights the resend action on %s and restores the confirm step after a new code', async (messageCode, message) => {
      mockVerifySignup
        .mockResolvedValueOnce({ success: false, error: message, messageCode })
        .mockResolvedValueOnce({ success: true, user: { id: 'user-1' } });

      renderWithRouter(<Signup />, { route: '/signup' });
      await submitSignupForm(user);
      await enterCode(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.queryByRole('button', { name: /confirmar código/i })).not.toBeInTheDocument();

      await waitCooldown();
      await user.click(screen.getByRole('button', { name: /^enviar novo código$/i }));

      expect(mockResendSignupCode).toHaveBeenCalledWith('user@example.com');
      expect(await screen.findByRole('button', { name: /confirmar código/i })).toBeInTheDocument();
      expect(screen.getByLabelText(CODE_LABEL)).toHaveValue('');
      expect(screen.queryByText(message)).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(CODE_LABEL), { target: { value: '654321' } });

      await waitFor(() => {
        expect(mockVerifySignup).toHaveBeenLastCalledWith('user@example.com', '654321', 'pass1234');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('navigates to /invite carrying the code after verifying when a code is present', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />, { route: '/signup?code=TF-8F3K-2Q7M-04' });

    await submitSignupForm(user);
    await enterCode(user);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/invite?code=TF-8F3K-2Q7M-04', { replace: true });
    });
  });

  describe('beta gate direct navigation', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it.each([
      ['true', false, '/invite'],
      ['true', true, '/'],
      ['false', false, '/'],
    ])('with gate=%s and betaAccess=%s, navigates to %s after verifying', async (gate, betaAccess, destination) => {
      vi.stubEnv('VITE_BETA_GATE_ENABLED', gate);
      const user = userEvent.setup();
      mockVerifySignup.mockResolvedValue({ success: true, user: { betaAccess } });

      renderWithRouter(<Signup />, { route: '/signup' });

      await submitSignupForm(user);
      await enterCode(user);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(destination, { replace: true });
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

    const submitInviteSignup = async (user, password = 'pass1234') => {
      await user.type(await screen.findByLabelText(/^senha$/i), password);
      await user.click(screen.getByRole('button', { name: /criar conta e ativar convite/i }));
    };

    const failInviteSignupWith = (messageCode, extra = {}) => {
      mockSignupWithInvite.mockResolvedValue({
        success: false,
        error: 'Mensagem do servidor.',
        messageCode,
        details: null,
        ...extra,
      });
    };

    it('creates the account in one step with the invite code and goes home', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });

      renderWithRouter(<Signup />, { route: ROUTE });
      await submitInviteSignup(user);

      await waitFor(() => {
        expect(mockSignupWithInvite).toHaveBeenCalledWith('TF-7BCA-YAZS-BD', 'pass1234');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      expect(mockSignup).not.toHaveBeenCalled();
      expect(mockVerifySignup).not.toHaveBeenCalled();
      expect(screen.queryByLabelText(CODE_LABEL)).not.toBeInTheDocument();
    });

    it('still detours through /invite with the code if the session comes back gated', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      mockSignupWithInvite.mockResolvedValue({ success: true, user: { id: 'user-1', betaAccess: false } });

      renderWithRouter(<Signup />, { route: ROUTE });
      await submitInviteSignup(user);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/invite?code=tf-7bca-yazs-bd', { replace: true });
      });
    });

    it('disables the form and shows "Criando conta..." while the invite signup is pending', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      mockSignupWithInvite.mockReturnValue(new Promise(() => {}));

      renderWithRouter(<Signup />, { route: ROUTE });
      await submitInviteSignup(user);

      const pendingButton = await screen.findByRole('button', { name: /criando conta/i });
      expect(pendingButton).toBeDisabled();
      expect(screen.getByLabelText(/^senha$/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /cadastrar com google/i })).toBeDisabled();
    });

    it('never sends a second request on a double submit', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      mockSignupWithInvite.mockReturnValue(new Promise(() => {}));

      renderWithRouter(<Signup />, { route: ROUTE });
      const passwordInput = await screen.findByLabelText(/^senha$/i);
      fireEvent.change(passwordInput, { target: { value: 'pass1234' } });
      const form = passwordInput.closest('form');
      fireEvent.submit(form);
      fireEvent.submit(form);

      await waitFor(() => expect(mockSignupWithInvite).toHaveBeenCalledTimes(1));
    });

    it('does not call the invite endpoint for a password under 8 characters', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });

      renderWithRouter(<Signup />, { route: ROUTE });
      await submitInviteSignup(user, 'short1');

      expect(await screen.findByText(/a senha deve ter pelo menos 8 caracteres/i)).toBeInTheDocument();
      expect(mockSignupWithInvite).not.toHaveBeenCalled();
    });

    it('shows a server-side weak password error inline under the password field', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      failInviteSignupWith('validation.failed', {
        error: 'A senha deve ter no mínimo 8 caracteres.',
        details: [{ field: 'password', messageCode: 'validation.password.minLength' }],
      });

      renderWithRouter(<Signup />, { route: ROUTE });
      await submitInviteSignup(user);

      expect(await screen.findByText('A senha deve ter no mínimo 8 caracteres.')).toHaveClass('form-error');
      expect(screen.getByLabelText(/^senha$/i)).toBeEnabled();
      expect(screen.getByRole('button', { name: /criar conta e ativar convite/i })).toBeEnabled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows the rate limit message and lets the user retry', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      failInviteSignupWith('request.rateLimitExceeded', {
        error: 'Muitas tentativas. Aguarde um momento e tente novamente.',
      });

      renderWithRouter(<Signup />, { route: ROUTE });
      await submitInviteSignup(user);

      expect(await screen.findByText(/muitas tentativas/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /criar conta e ativar convite/i })).toBeEnabled();
    });

    it('points to sign in (keeping the code) when the account was created after the preview', async () => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      failInviteSignupWith('trainerInvite.accountExists');

      renderWithRouter(<Signup />, { route: ROUTE });
      await submitInviteSignup(user);

      expect(await screen.findByText(/você já tem uma conta com/i)).toHaveTextContent('convidado@teufit.com.br');
      expect(screen.getByRole('link', { name: /entrar e ativar convite/i })).toHaveAttribute(
        'href',
        '/login?code=tf-7bca-yazs-bd'
      );
      expect(screen.queryByLabelText(/^senha$/i)).not.toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it.each([
      ['invite.expired', /este convite expirou/i],
      ['invite.revoked', /este convite não é mais válido/i],
      ['invite.alreadyAccepted', /este convite já foi utilizado/i],
      ['invite.notFound', /convite não encontrado/i],
    ])('replaces the form with a state card when the invite signup fails with %s', async (messageCode, title) => {
      const user = userEvent.setup();
      vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });
      failInviteSignupWith(messageCode);

      renderWithRouter(<Signup />, { route: ROUTE });
      await submitInviteSignup(user);

      expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.queryByLabelText(/^senha$/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('list', { name: /etapas do convite/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/já tem uma conta\?/i)).not.toBeInTheDocument();
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
