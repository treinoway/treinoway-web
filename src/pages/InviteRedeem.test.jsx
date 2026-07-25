import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { renderWithRouter, renderWithRoute } from '../test/test-utils';
import InviteRedeem from './InviteRedeem';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

const SignupProbe = () => {
  const [params] = useSearchParams();
  return <div data-testid="signup-code">{params.get('code')}</div>;
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: { post: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUpdateTokens = vi.fn();
const mockRefreshUser = vi.fn();
const mockLogout = vi.fn();

const setAuth = (overrides = {}) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { email: 'carolina@teufit.com.br', firstName: 'Carolina', betaAccess: false },
    isAuthenticated: true,
    updateTokens: mockUpdateTokens,
    refreshUser: mockRefreshUser,
    logout: mockLogout,
    ...overrides,
  });
};

describe('InviteRedeem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshUser.mockResolvedValue(null);
    setAuth();
  });

  it('renders the beta pill, title, connected account and code field by default', () => {
    renderWithRouter(<InviteRedeem />, { route: '/invite' });

    expect(screen.getByRole('img', { name: /teufit/i })).toBeInTheDocument();
    expect(screen.getByText('Beta fechado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /o teufit está em beta fechado/i })).toBeInTheDocument();
    expect(screen.getByText('carolina@teufit.com.br')).toBeInTheDocument();
    expect(screen.getByLabelText(/código do convite/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /desbloquear acesso/i })).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated and no code is present', () => {
    setAuth({ isAuthenticated: false, user: null });

    renderWithRoute(<InviteRedeem />, { route: '/invite', path: '/invite' });

    expect(screen.getByTestId('redirected')).toBeInTheDocument();
  });

  it('redirects to /signup carrying the code when not authenticated and a code is present', () => {
    setAuth({ isAuthenticated: false, user: null });

    render(
      <MemoryRouter initialEntries={['/invite?code=TF-8F3K-2Q7M-04']}>
        <Routes>
          <Route path="/invite" element={<InviteRedeem />} />
          <Route path="/signup" element={<SignupProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('signup-code')).toHaveTextContent('TF-8F3K-2Q7M-04');
  });

  it('redirects to / when the user already has beta access', () => {
    setAuth({ user: { email: 'a@b.com', betaAccess: true } });

    renderWithRoute(<InviteRedeem />, { route: '/invite', path: '/invite' });

    expect(screen.getByTestId('redirected')).toBeInTheDocument();
  });

  it('prefills and normalizes the code from the ?code query param', () => {
    renderWithRouter(<InviteRedeem />, { route: '/invite?code=tf-8f3k-2q7m-04' });

    expect(screen.getByLabelText(/código do convite/i)).toHaveValue('TF-8F3K-2Q7M-04');
    expect(screen.getByRole('heading', { name: /seu convite está pronto/i })).toBeInTheDocument();
    expect(screen.getByText(/código preenchido pelo seu convite/i)).toBeInTheDocument();
  });

  it('does not auto-submit a prefilled code (conscious confirm)', () => {
    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04' });

    expect(api.post).not.toHaveBeenCalled();
  });

  it('normalizes typed input: uppercase, Crockford (O/I/L) and hyphens', async () => {
    const user = userEvent.setup();
    renderWithRouter(<InviteRedeem />, { route: '/invite' });

    const input = screen.getByLabelText(/código do convite/i);
    await user.type(input, 'tfoil2q7m04');

    // O→0, I→1, L→1 → TF0112Q7M04 → grouped
    expect(input).toHaveValue('TF-0112-Q7M0-4');
  });

  it('blocks empty submit with an inline field error and no API call', async () => {
    const user = userEvent.setup();
    renderWithRouter(<InviteRedeem />, { route: '/invite' });

    await user.click(screen.getByRole('button', { name: /desbloquear acesso/i }));

    expect(screen.getByText(/informe o código do convite/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('redeems the code, rotates tokens, refreshes the user, then navigates home', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { token: { accessToken: 'acc' }, refreshToken: 'ref' } });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04' });

    await user.click(screen.getByRole('button', { name: /desbloquear acesso/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/invite/redeem', { code: 'TF-8F3K-2Q7M-04' });
    });
    expect(mockUpdateTokens).toHaveBeenCalledWith('acc', 'ref');
    expect(mockRefreshUser).toHaveBeenCalled();

    await screen.findByRole('heading', { name: /acesso liberado/i });
    await waitFor(
      () => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }),
      { timeout: 2000 }
    );
  });

  it('shows the server message and a retry CTA on invite.notFound, keeping the code', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      errorInfo: { messageCode: 'invite.notFound' },
      userMessage: 'Não reconhecemos esse código. Confira se digitou certo.',
    });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-99' });

    await user.click(screen.getByRole('button', { name: /desbloquear acesso/i }));

    await waitFor(() => {
      expect(screen.getByText(/não reconhecemos esse código/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/código do convite/i)).toHaveValue('TF-8F3K-2Q7M-99');
  });

  it('on invite.alreadyAccepted shows "Ir para o início" which refreshes and routes home', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      errorInfo: { messageCode: 'invite.alreadyAccepted' },
      userMessage: 'Este código já foi resgatado.',
    });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04' });

    await user.click(screen.getByRole('button', { name: /desbloquear acesso/i }));

    const homeButton = await screen.findByRole('button', { name: /ir para o início/i });
    expect(screen.queryByLabelText(/código do convite/i)).not.toBeInTheDocument();

    await user.click(homeButton);
    expect(mockRefreshUser).toHaveBeenCalled();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('on invite.emailMismatch shows "Entrar com outra conta" which signs out', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      errorInfo: { messageCode: 'invite.emailMismatch' },
      userMessage: 'Este convite foi enviado para outro endereço.',
    });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04' });

    await user.click(screen.getByRole('button', { name: /desbloquear acesso/i }));

    const switchButton = await screen.findByRole('button', { name: /entrar com outra conta/i });
    await user.click(switchButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('signs out via the account "Sair" button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<InviteRedeem />, { route: '/invite' });

    await user.click(screen.getByRole('button', { name: /^sair$/i }));

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('disables the input and button while verifying', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04' });

    await user.click(screen.getByRole('button', { name: /desbloquear acesso/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled();
    });
    expect(screen.getByLabelText(/código do convite/i)).toBeDisabled();
  });
});
