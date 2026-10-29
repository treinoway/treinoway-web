import PropTypes from 'prop-types';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import InviteRedeem from './InviteRedeem';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

const mockUpdateTokens = vi.fn();
const mockRefreshUser = vi.fn();
const mockUpdateUser = vi.fn();

// Shows the pathname and search so redirects can be asserted.
const LocationProbe = ({ label }) => {
  const location = useLocation();
  return <div data-testid={label}>{`${location.pathname}${location.search}`}</div>;
};

LocationProbe.propTypes = { label: PropTypes.string.isRequired };

// Mocks the auth context, defaulting to a logged-in trainer with beta access.
const setAuth = (overrides = {}) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { email: 'tania@example.com', firstName: 'Tania', betaAccess: true },
    isAuthenticated: true,
    updateTokens: mockUpdateTokens,
    refreshUser: mockRefreshUser,
    updateUser: mockUpdateUser,
    logout: vi.fn(),
    ...overrides,
  });
};

// Renders InviteRedeem at the route with probes for the redirect targets.
const renderInvite = (route, { strict = false } = {}) => {
  const tree = (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/invite" element={<InviteRedeem />} />
        <Route path="/login" element={<LocationProbe label="login" />} />
        <Route path="/signup" element={<LocationProbe label="signup" />} />
        <Route path="/" element={<LocationProbe label="home" />} />
      </Routes>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

describe('InviteRedeem - existing trainer (betaAccess already true)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshUser.mockResolvedValue(null);
    setAuth();
  });

  it('redeems the code once instead of redirecting to /', async () => {
    api.post.mockResolvedValue({ data: { token: { accessToken: 'a' }, refreshToken: 'r' } });

    renderInvite('/invite?code=TF-8F3K-2Q7M-04', { strict: true });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });
    expect(api.post).toHaveBeenCalledWith('/invite/redeem', { code: 'TF-8F3K-2Q7M-04' });
    expect(screen.queryByTestId('home')).not.toBeInTheDocument();
  });

  it('goes home without an error card when the invite was already accepted', async () => {
    api.post.mockRejectedValue(
      Object.assign(new Error('x'), {
        errorInfo: { messageCode: 'invite.alreadyAccepted' },
        userMessage: 'Este convite já foi utilizado.',
      })
    );

    renderInvite('/invite?code=TF-8F3K-2Q7M-04');

    expect(await screen.findByTestId('home')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/já foi utilizado/i)).not.toBeInTheDocument();
  });

  it('still redirects to / when betaAccess is true and there is no code', () => {
    renderInvite('/invite');

    expect(screen.getByTestId('home')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('InviteRedeem - logged out with an existing account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ isAuthenticated: false, user: null });
  });

  it('goes straight to /login?code=X when the preview says the account exists', async () => {
    api.get.mockResolvedValue({
      data: { email: 'tania@example.com', expiresAt: '2026-12-01T00:00:00Z', accountExists: true },
    });

    renderInvite('/invite?code=TF-8F3K-2Q7M-04');

    expect(await screen.findByTestId('login')).toHaveTextContent('/login?code=TF-8F3K-2Q7M-04');
    expect(screen.queryByTestId('signup')).not.toBeInTheDocument();
  });

  it('still goes to /signup?code=X when the account does not exist', async () => {
    api.get.mockResolvedValue({
      data: { email: 'novo@example.com', expiresAt: '2026-12-01T00:00:00Z', accountExists: false },
    });

    renderInvite('/invite?code=TF-8F3K-2Q7M-04');

    expect(await screen.findByTestId('signup')).toHaveTextContent('/signup?code=TF-8F3K-2Q7M-04');
  });
});
