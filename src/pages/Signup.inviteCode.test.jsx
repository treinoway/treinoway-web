import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor } from '../test/test-utils';
import Signup from './Signup';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSignupDirect = vi.fn();
const mockSignupWithInvite = vi.fn();
const mockSignup = vi.fn();

const ROUTE_WITH_CODE = '/signup?code=TF-AAAA-BBBB-CC';
const NEW_USER = { id: 'user-1', email: 'ana@example.com', roles: [], emailVerified: false, betaAccess: true };

// Lists every destination the page navigated to.
const navigatedPaths = () => mockNavigate.mock.calls.map(([to]) => String(to));

// Renders Signup on the old invite link.
const renderWithCode = () => renderWithRouter(<Signup />, { route: ROUTE_WITH_CODE });

// Asserts that no closed-beta or invite framing is on the page.
const expectNoInviteFraming = () => {
  expect(screen.queryByText(/beta fechado/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/teste fechado/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Etapas do convite' })).not.toBeInTheDocument();
  expect(screen.queryByText('Acesso liberado')).not.toBeInTheDocument();
  expect(screen.queryByText('TF-AAAA-BBBB-CC')).not.toBeInTheDocument();
  expect(screen.queryByText('E-mail do convite')).not.toBeInTheDocument();
};

describe('Signup with ?code= (plain direct signup)', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      user: null,
      signupDirect: mockSignupDirect,
      signupWithInvite: mockSignupWithInvite,
      signup: mockSignup,
      verifySignup: vi.fn(),
      resendSignupCode: vi.fn(),
      loginWithGoogle: vi.fn(),
    });
    mockSignupDirect.mockReset();
    mockSignupDirect.mockResolvedValue({ success: true, user: NEW_USER });
    mockSignupWithInvite.mockReset();
    mockSignupWithInvite.mockResolvedValue({ success: true, user: NEW_USER, linkedTrainers: 0 });
    mockSignup.mockReset();
    mockSignup.mockResolvedValue({ success: true });
    mockNavigate.mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });
  });

  it('renders the form at once, without waiting for an invite preview', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    renderWithCode();

    expect(screen.getByRole('heading', { name: 'Crie sua conta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
    expectNoInviteFraming();
  });

  it('keeps the e-mail editable and empty even when the invite preview would answer with an e-mail', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { email: 'convite@example.com', accountExists: false } });
    const user = userEvent.setup();

    renderWithCode();
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');

    const email = screen.getByLabelText('E-mail');
    expect(email).toHaveValue('');
    expect(email).not.toHaveAttribute('readonly');
    expect(email).toBeEnabled();
    await user.type(email, 'ana@example.com');
    expect(email).toHaveValue('ana@example.com');
    expect(screen.queryByDisplayValue('convite@example.com')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument();
    expectNoInviteFraming();
  });

  it('does not turn into the "already has an account" notice when the preview says the account exists', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { email: 'convite@example.com', accountExists: true } });
    const user = userEvent.setup();

    renderWithCode();
    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');

    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument();
    expect(screen.queryByText(/entre para ativar seu convite/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar e ativar convite' })).not.toBeInTheDocument();
  });

  it('submits through signupDirect, never through the invite or code signup, and lands on "/"', async () => {
    const user = userEvent.setup();
    renderWithCode();

    await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'pass1234');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(mockSignupDirect).toHaveBeenCalledTimes(1));
    expect(mockSignupDirect).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'pass1234',
      firstName: 'Ana',
      lastName: 'Lima',
    });
    await waitFor(() => expect(navigatedPaths()).toContain('/'));
    expect(navigatedPaths().some((path) => path.startsWith('/invite'))).toBe(false);
    expect(mockSignupWithInvite).not.toHaveBeenCalled();
    expect(mockSignup).not.toHaveBeenCalled();
    expect(screen.queryByText(/confirme seu e-mail/i)).not.toBeInTheDocument();
  });
});
