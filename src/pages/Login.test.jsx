import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Login from './Login';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

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
  });

  it('renders logo, heading, email field, password field, and submit button', () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole('img', { name: /treinoway/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
  });

  it('does not render a subtitle', () => {
    renderWithRouter(<Login />);

    expect(screen.queryByText(/gerencie seus alunos/i)).not.toBeInTheDocument();
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
});
