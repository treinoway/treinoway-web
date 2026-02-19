import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Signup from './Signup';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockSignup = vi.fn();

describe('Signup', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      signup: mockSignup,
    });
    mockSignup.mockReset();
  });

  it('renders all form inputs and submit button', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cadastrar/i })).toBeInTheDocument();
  });

  it('renders a link to the login page', () => {
    renderWithRouter(<Signup />);

    expect(screen.getByRole('link', { name: /entrar/i })).toBeInTheDocument();
  });

  it('redirects to dashboard when already authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      signup: mockSignup,
    });

    renderWithRouter(<Signup />, { route: '/signup' });

    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass123');
    await user.type(screen.getByLabelText(/confirmar senha/i), 'different');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('shows error when password is shorter than 6 characters', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), '12345');
    await user.type(screen.getByLabelText(/confirmar senha/i), '12345');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres.')).toBeInTheDocument();
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('calls signup with email and password when form is valid', async () => {
    const user = userEvent.setup();
    mockSignup.mockResolvedValue({ success: true });

    renderWithRouter(<Signup />);

    await user.type(screen.getByLabelText(/e-mail/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'pass123');
    await user.type(screen.getByLabelText(/confirmar senha/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

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
    await user.type(screen.getByLabelText(/confirmar senha/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

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
    await user.type(screen.getByLabelText(/confirmar senha/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(screen.getByRole('button', { name: /criando conta/i })).toBeDisabled();
  });
});
