import { StrictMode } from 'react';
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
  default: { post: vi.fn(), get: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUpdateTokens = vi.fn();
const mockRefreshUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockLogout = vi.fn();

const setAuth = (overrides = {}) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { email: 'carolina@teufit.com.br', firstName: 'Carolina', betaAccess: false },
    isAuthenticated: true,
    updateTokens: mockUpdateTokens,
    refreshUser: mockRefreshUser,
    updateUser: mockUpdateUser,
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

  it('redirects to /signup carrying the code when not authenticated and a code is present', async () => {
    setAuth({ isAuthenticated: false, user: null });
    api.get.mockResolvedValue({ data: { email: 'novo@example.com', accountExists: false } });

    render(
      <MemoryRouter initialEntries={['/invite?code=TF-8F3K-2Q7M-04']}>
        <Routes>
          <Route path="/invite" element={<InviteRedeem />} />
          <Route path="/signup" element={<SignupProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByTestId('signup-code')).toHaveTextContent('TF-8F3K-2Q7M-04');
  });

  it('redirects to / when the user already has beta access', () => {
    setAuth({ user: { email: 'a@b.com', betaAccess: true } });

    renderWithRoute(<InviteRedeem />, { route: '/invite', path: '/invite' });

    expect(screen.getByTestId('redirected')).toBeInTheDocument();
  });

  it('prefills and normalizes the code from the ?code query param once the form appears', async () => {
    // With an authenticated, not-yet-granted user and a code present,
    // auto-redeem always intercepts first (see the minimal-card test below)
    // — the form only becomes visible again if that attempt fails. This is
    // now the only realistic path to observe the prefilled/normalized value
    // in the form's code input.
    api.post.mockRejectedValue({
      errorInfo: { messageCode: 'invite.notFound' },
      userMessage: 'Não reconhecemos esse código. Confira se digitou certo.',
    });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=tf-8f3k-2q7m-04' });

    await waitFor(() => {
      expect(screen.getByLabelText(/código do convite/i)).toHaveValue('TF-8F3K-2Q7M-04');
    });
  });

  it('auto-redeems the normalized prefilled code exactly once, showing a minimal activating card with no form', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/invite?code=tf-8f3k-2q7m-04']}>
          <InviteRedeem />
        </MemoryRouter>
      </StrictMode>
    );

    expect(screen.getByRole('img', { name: /teufit/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ativando seu convite/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/só um instante enquanto liberamos seu acesso/i);

    // The structural fix: auto-redeem must never render the manual-entry
    // form — no code input, no account chip, no submit button. Previously
    // the full form rendered underneath with a "Verificando…" button, which
    // was the actual source of the reported flicker.
    expect(screen.queryByLabelText(/código do convite/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Beta fechado')).not.toBeInTheDocument();
    expect(screen.queryByText('carolina@teufit.com.br')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/invite/redeem', { code: 'TF-8F3K-2Q7M-04' });
  });

  it('does not auto-redeem when there is no code in the URL', async () => {
    renderWithRouter(<InviteRedeem />, { route: '/invite' });

    await Promise.resolve();
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /desbloquear acesso/i })).toBeEnabled();
  });

  it('does not auto-redeem when the user is not authenticated', () => {
    setAuth({ isAuthenticated: false, user: null });
    api.get.mockResolvedValue({ data: { email: 'novo@example.com', accountExists: false } });

    renderWithRoute(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04', path: '/invite' });

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

  it('auto-redeems the code, rotates tokens, refreshes the user, then navigates home', async () => {
    api.post.mockResolvedValue({ data: { token: { accessToken: 'acc' }, refreshToken: 'ref' } });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04' });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/invite/redeem', { code: 'TF-8F3K-2Q7M-04' });
    });
    expect(mockUpdateTokens).toHaveBeenCalledWith('acc', 'ref');
    expect(mockRefreshUser).toHaveBeenCalled();

    // Generous timeout: the success card only appears after the minimum
    // loading-card display duration (~600ms) pads out the otherwise-instant
    // mocked response.
    await screen.findByRole('heading', { name: /acesso liberado/i }, { timeout: 2000 });
    await waitFor(
      () => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }),
      { timeout: 2000 }
    );
  });

  it('keeps the minimal loading card visible for a minimum duration even when the API resolves instantly', async () => {
    api.post.mockResolvedValue({ data: { token: { accessToken: 'acc' }, refreshToken: 'ref' } });
    mockRefreshUser.mockResolvedValue({ betaAccess: true });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04' });

    expect(screen.getByRole('heading', { name: /ativando seu convite/i })).toBeInTheDocument();

    // By the time refreshUser has resolved, the redeem POST + refresh round
    // trip is effectively done (both mocked, near-instant) — but the success
    // card must not have replaced the loading card yet, because the minimum
    // display duration is still padding the transition.
    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
    });
    expect(screen.getByRole('heading', { name: /ativando seu convite/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /acesso liberado/i })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acesso liberado/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('after a failed auto-redeem keeps the code and allows a manual retry', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      errorInfo: { messageCode: 'invite.notFound' },
      userMessage: 'Não reconhecemos esse código. Confira se digitou certo.',
    });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-99' });

    await waitFor(() => {
      expect(screen.getByText(/não reconhecemos esse código/i)).toBeInTheDocument();
    });
    const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
    expect(retryButton).toBeEnabled();
    expect(screen.getByLabelText(/código do convite/i)).toHaveValue('TF-8F3K-2Q7M-99');
    expect(api.post).toHaveBeenCalledTimes(1);

    await user.click(retryButton);

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  });

  it('a manual retry after a failed auto-redeem shows the form with an inline spinner, not the full-card loading swap', async () => {
    // Guards the `autoRedeeming` state machine: once the automatic attempt
    // has settled (even by failing), a subsequent user-initiated submit must
    // behave exactly like the pre-existing manual path — the form stays put
    // with its inline button spinner — never re-triggering the minimal
    // full-card loading state meant only for the effect-driven first
    // attempt.
    const user = userEvent.setup();
    api.post
      .mockRejectedValueOnce({
        errorInfo: { messageCode: 'invite.notFound' },
        userMessage: 'Não reconhecemos esse código. Confira se digitou certo.',
      })
      .mockImplementationOnce(() => new Promise(() => {}));

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-99' });

    const retryButton = await screen.findByRole('button', { name: /tentar novamente/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled();
    });
    // Still the form — code input, account chip — not the minimal card.
    expect(screen.getByLabelText(/código do convite/i)).toBeInTheDocument();
    expect(screen.getByText('carolina@teufit.com.br')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('on invite.alreadyAccepted shows "Ir para o início" which refreshes and routes home', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      errorInfo: { messageCode: 'invite.alreadyAccepted' },
      userMessage: 'Este código já foi resgatado.',
    });

    renderWithRouter(<InviteRedeem />, { route: '/invite?code=TF-8F3K-2Q7M-04' });

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

    renderWithRouter(<InviteRedeem />, { route: '/invite' });

    await user.type(screen.getByLabelText(/código do convite/i), 'TF8F3K2Q7M04');
    await user.click(screen.getByRole('button', { name: /desbloquear acesso/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled();
    });
    expect(api.post).toHaveBeenCalledWith('/invite/redeem', { code: 'TF-8F3K-2Q7M-04' });
    expect(screen.getByLabelText(/código do convite/i)).toBeDisabled();
  });
});
