import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Login from './Login';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockLogin = vi.fn();

describe('Login', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      login: mockLogin,
    });
    mockLogin.mockReset();
  });

  it('renders email and password inputs and submit button', () => {
    renderWithRouter(<Login />);

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
  });

  it('renders a link to the signup page', () => {
    renderWithRouter(<Login />);

    expect(screen.getByRole('link', { name: /cadastre-se/i })).toBeInTheDocument();
  });

  it('redirects to dashboard when already authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      login: mockLogin,
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

  it('dismisses error message when close button is clicked', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, error: 'E-mail ou senha incorretos.' });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => {
      expect(screen.getByText('E-mail ou senha incorretos.')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /fechar alerta/i }));

    expect(screen.queryByText('E-mail ou senha incorretos.')).not.toBeInTheDocument();
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
});
