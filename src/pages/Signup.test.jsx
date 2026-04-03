import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Signup from './Signup';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

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
  });

  it('renders logo, heading, subtitle, email field, password field, and submit button', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByRole('img', { name: /treinoway/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /criar conta/i })).toBeInTheDocument();
    expect(screen.getByText(/gerencie seus alunos e treinos/i)).toBeInTheDocument();
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

    expect(screen.getByText(/mínimo 6 caracteres/i)).toBeInTheDocument();
  });

  it('renders Google signup button', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByRole('button', { name: /cadastrar com google/i })).toBeInTheDocument();
  });

  it('renders footer link to login', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByRole('link', { name: /^entrar$/i })).toBeInTheDocument();
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

  it('shows inline error when password is shorter than 6 characters on submit', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), '12345');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('shows inline password length error on blur', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/^senha$/i), '123');
    await user.tab();

    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();
  });

  it('calls signup with email and password when form is valid', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: true });

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('user@example.com', 'pass123');
    });
  });

  it('shows API error message when signup fails', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: false, error: 'E-mail já cadastrado.' });

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass123');
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
    await user.type(screen.getByLabelText(/^senha$/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    expect(screen.getByRole('button', { name: /criando conta/i })).toBeDisabled();
  });

  it('disables the Google button while email signup is in progress', async () => {
    const user = userEvent.setup();
    mockSignup.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass123');
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
    await user.type(screen.getByLabelText(/^senha$/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /^criar conta$/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('user@example.com', 'pass123');
    });
  });
});
