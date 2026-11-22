import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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

const mockSignupDirect = vi.fn();
const mockLoginWithGoogle = vi.fn();

const authValue = (overrides = {}) => ({
  isAuthenticated: false,
  signupDirect: mockSignupDirect,
  loginWithGoogle: mockLoginWithGoogle,
  ...overrides,
});

const submitSignupForm = async (user, { name = 'Ana Lima', email = 'user@example.com', password = 'pass1234' } = {}) => {
  await user.type(await screen.findByLabelText(/^nome$/i), name);
  await user.type(screen.getByLabelText(/e-mail/i), email);
  await user.type(screen.getByLabelText(/^senha$/i), password);
  await user.click(screen.getByRole('button', { name: /^criar conta$/i }));
};

describe('Signup', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authValue());
    mockSignupDirect.mockReset();
    mockSignupDirect.mockResolvedValue({ success: true, user: { id: 'user-1' } });
    mockLoginWithGoogle.mockReset();
    mockNavigate.mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });
  });

  it('renders logo, heading, subtitle, name field, email field, password field, and submit button', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByRole('img', { name: /teufit/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /crie sua conta/i })).not.toHaveClass('visually-hidden');
    expect(screen.getByText(/alunos, treinos e resultados/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nome$/i)).toBeInTheDocument();
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
    expect(mockSignupDirect).not.toHaveBeenCalled();
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
    expect(mockSignupDirect).not.toHaveBeenCalled();
  });

  it('shows the API error and stays on the form when signup fails (validation / rate limit)', async () => {
    const user = userEvent.setup();
    mockSignupDirect.mockResolvedValue({ success: false, error: 'Informe um e-mail válido.' });

    renderWithRouter(<Signup />);

    await submitSignupForm(user);

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/código de verificação/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^criar conta$/i })).toBeEnabled();
  });

  it('disables submit button while signup is in progress', async () => {
    const user = userEvent.setup();
    mockSignupDirect.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await submitSignupForm(user);

    expect(screen.getByRole('button', { name: /carregando\.\.\./i })).toBeDisabled();
  });

  it('disables the Google button while email signup is in progress', async () => {
    const user = userEvent.setup();
    mockSignupDirect.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await submitSignupForm(user);

    expect(screen.getByRole('button', { name: /cadastrar com google/i })).toBeDisabled();
  });

  it('calls signupDirect once when the form is submitted twice in a row', async () => {
    const user = userEvent.setup();
    mockSignupDirect.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/^nome$/i), 'Ana Lima');
    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass1234');
    const form = screen.getByRole('button', { name: /^criar conta$/i }).closest('form');
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    await waitFor(() => expect(mockSignupDirect).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /carregando\.\.\./i })).toBeDisabled();
  });

  it('links the name error and the password hint to their inputs', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    expect(screen.getByLabelText(/^senha$/i)).toHaveAccessibleDescription('Mínimo 8 caracteres');

    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    expect(screen.getByLabelText(/^nome$/i)).toHaveAccessibleDescription('Informe seu nome');
    expect(screen.getByLabelText(/e-mail/i)).toHaveAccessibleDescription('E-mail em formato inválido.');
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

  it('keeps the normal Google label and stays enabled while the popup is open', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await user.click(screen.getByRole('button', { name: /cadastrar com google/i }));

    expect(screen.getByRole('button', { name: /cadastrar com google/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /cadastrando\.\.\./i })).not.toBeInTheDocument();
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

  it('calls Google without a login hint even when the URL carries an invite code', async () => {
    const user = userEvent.setup();
    mockLoginWithGoogle.mockResolvedValue({ success: true });

    renderWithRouter(<Signup />, { route: '/signup?code=tf-7bca-yazs-bd' });

    await user.click(await screen.findByRole('button', { name: /cadastrar com google/i }));

    await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalled());
    expect(mockLoginWithGoogle.mock.calls[0][0]).not.toHaveProperty('loginHint');
  });

  describe('Google popup lifecycle', () => {
    const googleButton = (name = /cadastrar com google/i) => screen.getByRole('button', { name });

    it('keeps inputs, submit and Google button enabled while the popup is pending', async () => {
      const user = userEvent.setup();
      mockLoginWithGoogle.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<Signup />);
      await user.click(googleButton());

      expect(screen.getByLabelText(/e-mail/i)).toBeEnabled();
      expect(screen.getByLabelText(/^senha$/i)).toBeEnabled();
      expect(screen.getByRole('button', { name: /^criar conta$/i })).toBeEnabled();
      expect(googleButton(/cadastrar com google/i)).toBeEnabled();
    });

    it('disables controls during the backend exchange after the popup resolves', async () => {
      const user = userEvent.setup();
      mockLoginWithGoogle.mockImplementation(({ onPopupResolved }) => {
        onPopupResolved();
        return new Promise(() => {});
      });

      renderWithRouter(<Signup />);
      await user.click(googleButton());

      expect(screen.getByLabelText(/e-mail/i)).toBeDisabled();
      expect(googleButton(/cadastrando\.\.\./i)).toBeDisabled();
    });

    it('re-enables everything without an error when the popup is closed', async () => {
      const user = userEvent.setup();
      mockLoginWithGoogle.mockResolvedValue({ success: false, error: null });

      renderWithRouter(<Signup />);
      await user.click(googleButton());

      await waitFor(() => expect(googleButton(/cadastrar com google/i)).toBeEnabled());
      expect(screen.getByLabelText(/e-mail/i)).toBeEnabled();
      expect(screen.queryByText(/erro|falha/i)).not.toBeInTheDocument();
    });

    it('lets the user retry while a popup is pending and ignores the stale result', async () => {
      const user = userEvent.setup();
      let rejectFirst;
      mockLoginWithGoogle
        .mockImplementationOnce(() => new Promise((_, reject) => { rejectFirst = reject; }))
        .mockImplementationOnce(() => new Promise(() => {}));

      renderWithRouter(<Signup />);
      await user.click(googleButton());
      await user.click(googleButton(/cadastrar com google/i));
      expect(mockLoginWithGoogle).toHaveBeenCalledTimes(2);

      await act(async () => { rejectFirst(new Error('stale')); });

      expect(googleButton(/cadastrar com google/i)).toBeEnabled();
      expect(screen.queryByText(/inesperado/i)).not.toBeInTheDocument();
    });
  });
});
