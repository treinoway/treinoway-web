import PropTypes from 'prop-types';
import { render, screen } from '@testing-library/react';
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

// Shows the pathname and search so redirects can be asserted.
const LocationProbe = ({ label }) => {
  const location = useLocation();
  return <div data-testid={label}>{`${location.pathname}${location.search}`}</div>;
};

LocationProbe.propTypes = { label: PropTypes.string.isRequired };

// Mocks the auth context with a logged-in or logged-out user.
const setAuth = ({ authenticated = true } = {}) => {
  vi.mocked(useAuth).mockReturnValue({
    user: authenticated ? { email: 'tania@example.com', firstName: 'Tania', betaAccess: true } : null,
    isAuthenticated: authenticated,
    updateTokens: vi.fn(),
    refreshUser: vi.fn().mockResolvedValue(null),
    updateUser: vi.fn(),
    logout: vi.fn(),
  });
};

// Renders InviteRedeem at the route with probes for the redirect targets.
const renderInvite = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/invite" element={<InviteRedeem />} />
        <Route path="/login" element={<LocationProbe label="login" />} />
        <Route path="/signup" element={<LocationProbe label="signup" />} />
        <Route path="/" element={<LocationProbe label="home" />} />
      </Routes>
    </MemoryRouter>
  );

// Rejects the redeem call with an invite error.
const rejectWith = (messageCode, userMessage) =>
  api.post.mockRejectedValue(Object.assign(new Error('x'), { errorInfo: { messageCode }, userMessage }));

describe('InviteRedeem - errors for a trainer who already has betaAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
  });

  it('shows the mismatch card on invite.emailMismatch', async () => {
    rejectWith('invite.emailMismatch', 'Convite de outro e-mail.');

    renderInvite('/invite?code=TF-8F3K-2Q7M-04');

    expect(await screen.findByText('Este convite é de outro e-mail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar com outra conta' })).toBeInTheDocument();
    expect(screen.queryByTestId('home')).not.toBeInTheDocument();
  });

  it.each(['invite.expired', 'invite.notFound'])('shows the alert and form on %s instead of going home', async (code) => {
    rejectWith(code, 'Convite inválido.');

    renderInvite('/invite?code=TF-8F3K-2Q7M-04');

    expect(await screen.findByRole('alert')).toHaveTextContent('Convite inválido.');
    expect(screen.getByLabelText('Código do convite')).toBeInTheDocument();
    expect(screen.queryByTestId('home')).not.toBeInTheDocument();
  });

  it('still goes home silently on invite.alreadyAccepted', async () => {
    rejectWith('invite.alreadyAccepted', 'Já utilizado.');

    renderInvite('/invite?code=TF-8F3K-2Q7M-04');

    expect(await screen.findByTestId('home')).toBeInTheDocument();
  });
});

describe('InviteRedeem - logged out with an empty normalized code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth({ authenticated: false });
  });

  it.each(['-', '%20'])('says no invite is needed for ?code=%s, without redirecting or previewing', (value) => {
    renderInvite(`/invite?code=${value}`);

    expect(screen.getByRole('heading', { name: 'Você não precisa mais de convite' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/signup');
    expect(screen.queryByTestId('login')).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
