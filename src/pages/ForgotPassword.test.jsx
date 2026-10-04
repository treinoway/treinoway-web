import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import ForgotPassword from './ForgotPassword';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockForgotPassword = vi.fn();
const mockResetPassword = vi.fn();

const INVALID_CODE_MESSAGE = 'Código inválido ou expirado. Solicite um novo.';

const fillResetFields = async (user) => {
  await user.type(screen.getByLabelText(/^código$/i), '123456');
  await user.type(screen.getByLabelText(/^nova senha$/i), 'newpass123');
  await user.type(screen.getByLabelText(/^confirmar nova senha$/i), 'newpass123');
};

const goToResetStepViaShortcut = async (user) => {
  renderWithRouter(<ForgotPassword />);
  await user.click(screen.getByRole('button', { name: /já recebeu um código/i }));
};

const goToResetStepViaSubmit = async (user) => {
  mockForgotPassword.mockResolvedValue({ success: true });
  renderWithRouter(<ForgotPassword />);
  await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
  await user.click(screen.getByRole('button', { name: /^enviar código$/i }));

  await waitFor(() => {
    expect(screen.getByLabelText(/^código$/i)).toBeInTheDocument();
  });
};

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      forgotPassword: mockForgotPassword,
      resetPassword: mockResetPassword,
    });
    mockForgotPassword.mockReset();
    mockResetPassword.mockReset();
  });

  it('renders logo, heading, subtitle, email field, submit button, and footer link on step 1', () => {
    renderWithRouter(<ForgotPassword />);

    expect(screen.getByRole('img', { name: /teufit/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /redefinir senha/i })).toBeInTheDocument();
    expect(screen.getByText(/informe seu e-mail para receber um código/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^enviar código$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /entrar/i })).toBeInTheDocument();
  });

  it('renders a legal footer link to the privacy policy on step 1', () => {
    renderWithRouter(<ForgotPassword />);

    expect(
      screen.getByRole('link', { name: /política de privacidade/i })
    ).toHaveAttribute('href', '/privacy-policy');
  });

  it('renders a legal footer link to the privacy policy on step 2', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);

    expect(
      screen.getByRole('link', { name: /política de privacidade/i })
    ).toHaveAttribute('href', '/privacy-policy');
  });

  it('renders a legal footer link to the terms of use on step 1', () => {
    renderWithRouter(<ForgotPassword />);

    expect(
      screen.getByRole('link', { name: /termos e condições/i })
    ).toHaveAttribute('href', '/terms');
  });

  it('renders a legal footer link to the terms of use on step 2', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);

    expect(
      screen.getByRole('link', { name: /termos e condições/i })
    ).toHaveAttribute('href', '/terms');
  });

  it('redirects to dashboard when already authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      forgotPassword: mockForgotPassword,
      resetPassword: mockResetPassword,
    });

    renderWithRouter(<ForgotPassword />, { route: '/forgot-password' });

    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });

  it('calls forgotPassword with the entered email on step 1 submit', async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockResolvedValue({ success: true });

    renderWithRouter(<ForgotPassword />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /^enviar código$/i }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('shows loading state and disables the button while sending the code', async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<ForgotPassword />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /^enviar código$/i }));

    expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled();
  });

  it('shows the error message when step 1 API call fails', async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockResolvedValue({ success: false, error: 'Erro ao enviar código.' });

    renderWithRouter(<ForgotPassword />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /^enviar código$/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro ao enviar código.')).toBeInTheDocument();
    });
  });

  it('moves to step 2 and shows the neutral anti-enumeration message on step 1 success', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);

    expect(
      screen.getByText(/se o e-mail estiver cadastrado, enviamos um código de 6 dígitos/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^código$/i)).toBeInTheDocument();
  });

  it('moves to step 2 without calling forgotPassword or showing the neutral message via the shortcut', async () => {
    const user = userEvent.setup();

    renderWithRouter(<ForgotPassword />);

    await user.click(screen.getByRole('button', { name: /já recebeu um código/i }));

    expect(mockForgotPassword).not.toHaveBeenCalled();
    expect(screen.queryByText(/se o e-mail estiver cadastrado/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^código$/i)).toBeInTheDocument();
    expect(screen.getByText(/digite o código recebido por e-mail/i)).toBeInTheDocument();
  });

  it('prevents submitting step 2 with inline validation errors', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);

    await user.type(screen.getByLabelText(/^código$/i), '123');
    await user.type(screen.getByLabelText(/^nova senha$/i), '1234567');
    await user.type(screen.getByLabelText(/^confirmar nova senha$/i), 'different');
    await user.click(screen.getByRole('button', { name: /^redefinir senha$/i }));

    expect(mockResetPassword).not.toHaveBeenCalled();
    expect(screen.getByText(/informe o código de 6 dígitos/i)).toBeInTheDocument();
    expect(screen.getByText(/a senha deve ter pelo menos 8 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/as senhas não conferem/i)).toBeInTheDocument();
  });

  it('carries the step 1 email into step 2 and sends email, code, password and confirmation', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);
    mockResetPassword.mockResolvedValue({ success: true });

    expect(screen.queryByLabelText(/^e-mail$/i)).not.toBeInTheDocument();

    await fillResetFields(user);
    await user.click(screen.getByRole('button', { name: /^redefinir senha$/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        code: '123456',
        password: 'newpass123',
        passwordConfirmation: 'newpass123',
      });
    });
  });

  it('shows an editable email field on step 2 when the email is unknown (shortcut)', async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValue({ success: true });
    await goToResetStepViaShortcut(user);

    const emailInput = screen.getByLabelText(/^e-mail$/i);
    expect(emailInput).toHaveValue('');

    await user.type(emailInput, '  typed@example.com ');
    await fillResetFields(user);
    await user.click(screen.getByRole('button', { name: /^redefinir senha$/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        email: 'typed@example.com',
        code: '123456',
        password: 'newpass123',
        passwordConfirmation: 'newpass123',
      });
    });
  });

  it('blocks step 2 submit with an inline error when the email is invalid', async () => {
    const user = userEvent.setup();
    await goToResetStepViaShortcut(user);

    await user.type(screen.getByLabelText(/^e-mail$/i), 'user@localhost');
    await fillResetFields(user);
    await user.click(screen.getByRole('button', { name: /^redefinir senha$/i }));

    expect(mockResetPassword).not.toHaveBeenCalled();
    expect(screen.getByText(/informe o e-mail usado para solicitar o código/i)).toBeInTheDocument();
  });

  it('prefills the step 2 email field with an email typed on step 1 before using the shortcut', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ForgotPassword />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /já recebeu um código/i }));

    expect(screen.getByLabelText(/^e-mail$/i)).toHaveValue('user@example.com');
  });

  it('shows the invalid-code error and resends the code for the same email', async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValue({ success: false, error: INVALID_CODE_MESSAGE });
    mockForgotPassword.mockResolvedValue({ success: true });
    await goToResetStepViaShortcut(user);

    await user.type(screen.getByLabelText(/^e-mail$/i), 'user@example.com');
    await fillResetFields(user);
    await user.click(screen.getByRole('button', { name: /^redefinir senha$/i }));

    expect(await screen.findByText(INVALID_CODE_MESSAGE)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^reenviar código$/i }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
    });
    expect(screen.queryByText(INVALID_CODE_MESSAGE)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reenviar código \(60s\)/i })).toBeDisabled();
  });

  it('offers to request a new code instead of resending when no email is known', async () => {
    const user = userEvent.setup();
    await goToResetStepViaShortcut(user);

    expect(screen.queryByRole('button', { name: /reenviar código/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /solicitar novo código/i }));

    expect(screen.getByRole('button', { name: /^enviar código$/i })).toBeInTheDocument();
  });

  it('shows the error and re-enables the form when step 2 API call fails', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);
    mockResetPassword.mockResolvedValue({ success: false, error: 'Código expirado.' });

    await user.type(screen.getByLabelText(/^código$/i), '123456');
    await user.type(screen.getByLabelText(/^nova senha$/i), 'newpass123');
    await user.type(screen.getByLabelText(/^confirmar nova senha$/i), 'newpass123');
    await user.click(screen.getByRole('button', { name: /^redefinir senha$/i }));

    await waitFor(() => {
      expect(screen.getByText('Código expirado.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^redefinir senha$/i })).toBeEnabled();
  });

  it('shows loading state while resetting the password', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);
    mockResetPassword.mockImplementation(() => new Promise(() => {}));

    await user.type(screen.getByLabelText(/^código$/i), '123456');
    await user.type(screen.getByLabelText(/^nova senha$/i), 'newpass123');
    await user.type(screen.getByLabelText(/^confirmar nova senha$/i), 'newpass123');
    await user.click(screen.getByRole('button', { name: /^redefinir senha$/i }));

    expect(screen.getByRole('button', { name: /redefinindo/i })).toBeDisabled();
  });

  it('disables the resend button with a countdown immediately after arriving via step 1', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);

    expect(screen.getByRole('button', { name: /reenviar código \(60s\)/i })).toBeDisabled();
  });

  it('toggles password and confirmation visibility independently', async () => {
    const user = userEvent.setup();
    await goToResetStepViaSubmit(user);

    const passwordInput = screen.getByLabelText(/^nova senha$/i);
    const confirmInput = screen.getByLabelText(/^confirmar nova senha$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /^mostrar senha$/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /mostrar confirmação de senha/i }));
    expect(confirmInput).toHaveAttribute('type', 'text');
  });
});
