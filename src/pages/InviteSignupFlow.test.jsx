// Regression coverage for a reported bug: after signing up through an
// invite link, the user is expected to land on the /invite "Acesso liberado"
// success state, never on a bare /invite form with an empty code field.
//
// Two independent causes were found and reproduced here (both fixed):
//
// 1. Signup's `if (isAuthenticated) return <Navigate to="/" replace />`
//    guard raced the explicit `navigate(resolveDestination(...))` call in
//    the submit handler — both are triggered off the same AuthContext
//    setUser/setAccessToken update. Whichever won the render dropped the
//    invite code (the guard always targeted a bare "/"), so ProtectedRoute
//    then bounced the still-gated user to a bare /invite. Fixed by routing
//    the guard through resolveDestination(user) too, so either outcome
//    lands on the same, correct place. Login.jsx has the identical guard
//    and received the identical fix.
// 2. Even with #1 fixed, InviteRedeem trusted the /me response inside
//    refreshUser() as the source of truth for betaAccess. If that read is
//    even briefly stale relative to the redeem POST that just succeeded,
//    the 900ms success-timer's navigate('/', {replace:true}) gets bounced
//    by ProtectedRoute back to a bare /invite — a confusing "it worked,
//    then it didn't" experience. Fixed by trusting the /invite/redeem
//    POST's own success and force-syncing betaAccess:true locally.
//
// Signup now has a code step (anti-enumeration): POST /auth/signup only
// answers 202 and the session is established by POST /auth/signup/verify, so
// the same races are reproduced from the verify call instead. That path is
// what a valid preview WITHOUT a bound email falls back to (previewEmail
// null below). A preview with the invited email uses the one-step
// POST /auth/signup/invite instead, covered at the end of this file.
//
// This deliberately uses the REAL AuthProvider (not a mocked useAuth)
// because both bugs are render-timing/state races that a mocked useAuth
// (returning static props) cannot reproduce. Only `api` (network) and
// firebase are mocked; routing and auth state are real.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { render } from '../test/test-utils';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Signup from './Signup';
import InviteRedeem from './InviteRedeem';
import api from '../api/axios';

vi.mock('../firebase', () => ({ auth: {}, googleProvider: {} }));
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider() {
    this.setCustomParameters = vi.fn();
  }),
}));
vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const INVITE_CODE = 'TF-CW0G-HD5A-DZ';

// eslint-disable-next-line react/prop-types
const RouteProbe = ({ label, children }) => {
  const [params] = useSearchParams();
  return (
    <div>
      <span data-testid="route-label">{label}</span>
      <span data-testid="route-code">{params.get('code') || ''}</span>
      {children}
    </div>
  );
};

const renderFlow = (initialEntry) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <AuthProvider>
      <Routes>
        <Route path="/signup" element={<RouteProbe label="signup"><Signup /></RouteProbe>} />
        <Route path="/invite" element={<RouteProbe label="invite"><InviteRedeem /></RouteProbe>} />
        <Route
          path="/"
          element={<RouteProbe label="home"><ProtectedRoute><div>HOME PAGE</div></ProtectedRoute></RouteProbe>}
        />
        <Route path="/login" element={<RouteProbe label="login"><div>LOGIN PAGE</div></RouteProbe>} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>
);

// signupBetaAccess: what GET /me returns right after signup (call #1).
// redeemBetaAccess: what GET /me returns after the /invite/redeem POST,
// inside InviteRedeem's refreshUser() call (call #2).
const mockApi = ({
  signupBetaAccess = false,
  redeemBetaAccess = true,
  previewEmail = null,
  verifyError = null,
  inviteSignupError = null,
} = {}) => {
  let meCallCount = 0;

  api.post.mockImplementation((url) => {
    if (url === '/auth/signup') {
      return Promise.resolve({ status: 202, data: { status: 'pending_verification' } });
    }
    if (url === '/auth/signup/verify') {
      if (verifyError) return Promise.reject(verifyError);
      return Promise.resolve({
        status: 201,
        data: {
          user: { id: 'user-1' },
          token: { accessToken: 'signup-token' },
          refreshToken: 'signup-refresh',
          linkedTrainers: 0,
        },
      });
    }
    if (url === '/auth/signup/invite') {
      if (inviteSignupError) return Promise.reject(inviteSignupError);
      return Promise.resolve({
        status: 201,
        data: {
          user: { id: 'user-1' },
          token: { accessToken: 'invite-token' },
          refreshToken: 'invite-refresh',
          linkedTrainers: 0,
          betaAccess: true,
          activeProfile: 'trainer',
        },
      });
    }
    if (url === '/invite/redeem') {
      return Promise.resolve({
        data: { token: { accessToken: 'redeem-token' }, refreshToken: 'redeem-refresh' },
      });
    }
    return Promise.reject(new Error(`Unhandled POST ${url}`));
  });

  api.get.mockImplementation((url) => {
    if (url === '/invite/preview') {
      return Promise.resolve({ data: { email: previewEmail, invitedByName: null, accountExists: false } });
    }
    if (url.startsWith('/me')) {
      meCallCount += 1;
      const betaAccess = meCallCount === 1 ? signupBetaAccess : redeemBetaAccess;
      return Promise.resolve({
        data: { id: 'user-1', email: 'aluno@example.com', betaAccess, roles: ['trainer'] },
      });
    }
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });
};

const submitSignup = async (user) => {
  await waitFor(() => {
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
  });

  if (!screen.getByLabelText(/e-mail/i).readOnly) {
    await user.type(screen.getByLabelText(/e-mail/i), 'aluno@example.com');
  }
  await user.type(screen.getByLabelText(/^senha$/i), 'senha1234');
  await user.click(screen.getByRole('button', { name: /^criar conta e ativar convite$/i }));
  await user.type(await screen.findByLabelText(/código de verificação/i), '123456');
};

describe('Invite signup flow (integration reproduction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('carries the invite code from /signup to /invite and auto-redeems exactly once', async () => {
    mockApi({ signupBetaAccess: false, redeemBetaAccess: true });
    const user = userEvent.setup();

    renderFlow(`/signup?code=${INVITE_CODE}`);
    await submitSignup(user);

    // Guards bug #1 (see file header): if Signup's isAuthenticated guard
    // ever regresses back to a hardcoded "/", the code is dropped and
    // /invite/redeem is never called at all.
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/invite/redeem', { code: INVITE_CODE });
    });
    // /auth/signup, /auth/signup/verify, /invite/redeem — never called twice
    expect(api.post).toHaveBeenCalledTimes(3);
    expect(api.post).toHaveBeenCalledWith('/auth/signup', { email: 'aluno@example.com', password: 'senha1234' });
    expect(api.post).toHaveBeenCalledWith('/auth/signup/verify', {
      email: 'aluno@example.com',
      code: '123456',
      password: 'senha1234',
    });
  });

  it('does not authenticate after signup alone — stays on the code step', async () => {
    mockApi();
    const user = userEvent.setup();

    renderFlow(`/signup?code=${INVITE_CODE}`);
    await waitFor(() => expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/e-mail/i), 'aluno@example.com');
    await user.type(screen.getByLabelText(/^senha$/i), 'senha1234');
    await user.click(screen.getByRole('button', { name: /^criar conta e ativar convite$/i }));

    expect(await screen.findByLabelText(/código de verificação/i)).toBeInTheDocument();
    expect(screen.getByTestId('route-label')).toHaveTextContent('signup');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(api.get).not.toHaveBeenCalledWith(expect.stringMatching(/^\/me/));
  });

  it('signs up a locked invited email in one step: stores the tokens and lands home without redeeming', async () => {
    mockApi({ previewEmail: 'convidado@teufit.com.br', signupBetaAccess: true });
    const user = userEvent.setup();

    renderFlow(`/signup?code=${INVITE_CODE}`);
    await waitFor(() => expect(screen.getByLabelText(/e-mail/i)).toHaveValue('convidado@teufit.com.br'));
    await user.type(screen.getByLabelText(/^senha$/i), 'senha1234');
    await user.click(screen.getByRole('button', { name: /^criar conta e ativar convite$/i }));

    await waitFor(() => expect(screen.getByTestId('route-label')).toHaveTextContent('home'));
    expect(screen.getByText('HOME PAGE')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/signup/invite', { code: INVITE_CODE, password: 'senha1234' });
    expect(localStorage.getItem('accessToken')).toBe('invite-token');
    expect(localStorage.getItem('refreshToken')).toBe('invite-refresh');
    expect(screen.queryByLabelText(/código de verificação/i)).not.toBeInTheDocument();
  });

  it('trusts the 201 over a stale /me (betaAccess false) and still lands home', async () => {
    mockApi({ previewEmail: 'convidado@teufit.com.br', signupBetaAccess: false });
    const user = userEvent.setup();

    renderFlow(`/signup?code=${INVITE_CODE}`);
    await waitFor(() => expect(screen.getByLabelText(/e-mail/i)).toHaveValue('convidado@teufit.com.br'));
    await user.type(screen.getByLabelText(/^senha$/i), 'senha1234');
    await user.click(screen.getByRole('button', { name: /^criar conta e ativar convite$/i }));

    await waitFor(() => expect(screen.getByTestId('route-label')).toHaveTextContent('home'));
    expect(screen.getByText('HOME PAGE')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('user')).betaAccess).toBe(true);
    expect(api.post).not.toHaveBeenCalledWith('/invite/redeem', expect.anything());
  });

  it('shows the sign-in CTA and stores nothing when the invite signup answers 409 accountExists', async () => {
    mockApi({
      previewEmail: 'convidado@teufit.com.br',
      inviteSignupError: {
        userMessage: 'Já existe uma conta com este e-mail.',
        errorInfo: { messageCode: 'trainerInvite.accountExists', status: 409 },
        response: {
          status: 409,
          data: { error: 'INVITE_ACCOUNT_EXISTS', messageCode: 'trainerInvite.accountExists' },
        },
      },
    });
    const user = userEvent.setup();

    renderFlow(`/signup?code=${INVITE_CODE}`);
    await waitFor(() => expect(screen.getByLabelText(/e-mail/i)).toHaveValue('convidado@teufit.com.br'));
    await user.type(screen.getByLabelText(/^senha$/i), 'senha1234');
    await user.click(screen.getByRole('button', { name: /^criar conta e ativar convite$/i }));

    expect(await screen.findByRole('link', { name: /entrar e ativar convite/i })).toHaveAttribute(
      'href',
      `/login?code=${INVITE_CODE}`
    );
    expect(screen.getByTestId('route-label')).toHaveTextContent('signup');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('keeps the user on the code step when the code is wrong', async () => {
    mockApi({
      verifyError: {
        userMessage: 'Código inválido. Confira o código e tente novamente.',
        errorInfo: { messageCode: 'emailVerification.invalidCode', status: 400 },
        response: { status: 400, data: { messageCode: 'emailVerification.invalidCode' } },
      },
    });
    const user = userEvent.setup();

    renderFlow(`/signup?code=${INVITE_CODE}`);
    await submitSignup(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/código inválido/i);
    expect(screen.getByTestId('route-label')).toHaveTextContent('signup');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(api.post).not.toHaveBeenCalledWith('/invite/redeem', expect.anything());
  });

  it('lands on the success state and then home when the post-redeem /me reports betaAccess true', async () => {
    mockApi({ signupBetaAccess: false, redeemBetaAccess: true });
    const user = userEvent.setup();

    renderFlow(`/signup?code=${INVITE_CODE}`);
    await submitSignup(user);

    // Explicit headroom: InviteRedeem's auto-redeem loading card now has a
    // ~600ms minimum display duration (see InviteRedeem.jsx), which, added
    // to real userEvent typing time and the signup->invite navigation, can
    // exceed waitFor's default 1000ms timeout.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acesso liberado/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId('route-label')).toHaveTextContent('home');
    }, { timeout: 3000 });
    expect(screen.getByText('HOME PAGE')).toBeInTheDocument();
  });

  it('regression guard: a stale betaAccess:false on the post-redeem /me no longer bounces the user to a bare, empty /invite form', async () => {
    // Before the fix, this reproduced the reported bug: the 900ms
    // success-state timer fires navigate('/', {replace:true}), and if the
    // /me call inside refreshUser() still reported betaAccess:false (a
    // lagging backend read path, or refreshUser failing outright),
    // ProtectedRoute would bounce the user to a bare /invite — no ?code=,
    // no error, just an empty form after they had already redeemed
    // successfully. The fix: InviteRedeem now trusts the /invite/redeem
    // POST's own success as authoritative and force-syncs betaAccess:true
    // locally instead of deferring to a possibly-stale /me read.
    mockApi({ signupBetaAccess: false, redeemBetaAccess: false });
    const user = userEvent.setup();

    renderFlow(`/signup?code=${INVITE_CODE}`);
    await submitSignup(user);

    // Explicit headroom: InviteRedeem's auto-redeem loading card now has a
    // ~600ms minimum display duration (see InviteRedeem.jsx), which, added
    // to real userEvent typing time and the signup->invite navigation, can
    // exceed waitFor's default 1000ms timeout.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acesso liberado/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByTestId('route-label')).toHaveTextContent('home');
    }, { timeout: 3000 });
    expect(screen.getByText('HOME PAGE')).toBeInTheDocument();
  });
});
