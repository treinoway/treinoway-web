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
const mockApi = ({ signupBetaAccess = false, redeemBetaAccess = true } = {}) => {
  let meCallCount = 0;

  api.post.mockImplementation((url) => {
    if (url === '/auth/signup') {
      return Promise.resolve({
        data: { token: { accessToken: 'signup-token' }, refreshToken: 'signup-refresh' },
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
      return Promise.resolve({ data: { email: null, invitedByName: null, accountExists: false } });
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

  await user.type(screen.getByLabelText(/e-mail/i), 'aluno@example.com');
  await user.type(screen.getByLabelText(/^senha$/i), 'senha1234');
  await user.click(screen.getByRole('button', { name: /^criar conta e ativar convite$/i }));
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
    expect(api.post).toHaveBeenCalledTimes(2); // /auth/signup, /invite/redeem — never called twice
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
