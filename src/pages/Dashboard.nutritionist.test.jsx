import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import Dashboard from './Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../utils/getGreeting', () => ({ default: vi.fn(() => 'Bom dia') }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockHasRole = vi.fn();
const mockRefreshUser = vi.fn();
const mockUpdateTokens = vi.fn();
const showToast = vi.fn();

// Test helper: setup user.
const setupUser = ({ roles = [], betaAccess = true } = {}) => {
  mockHasRole.mockImplementation((role) => roles.includes(role));
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, firstName: 'João', status: 'active', roles, betaAccess },
    hasRole: mockHasRole,
    refreshUser: mockRefreshUser,
    updateTokens: mockUpdateTokens,
  });
};

// Test helper: card.
const card = () => screen.queryByRole('button', { name: /Seja nutricionista/ });

describe('Dashboard — "Seja nutricionista" card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshUser.mockResolvedValue(null);
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockResolvedValue({ data: [] });
  });

  it('shows the profession choice instead of the card to a user with no role', () => {
    setupUser({ roles: [], betaAccess: true });
    renderWithRouter(<Dashboard />);
    expect(card()).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Como você atende?' })).toBeInTheDocument();
  });

  it('shows the card to a trainer with beta access who is not a nutritionist yet', () => {
    setupUser({ roles: ['TRAINER'], betaAccess: true });
    renderWithRouter(<Dashboard />);
    expect(card()).toBeInTheDocument();
  });

  it('shows the card to a trainer even without beta access', () => {
    setupUser({ roles: ['TRAINER'], betaAccess: false });
    renderWithRouter(<Dashboard />);
    expect(card()).toBeInTheDocument();
  });

  it('hides the card when the user already is a nutritionist', () => {
    setupUser({ roles: ['NUTRITIONIST'], betaAccess: true });
    renderWithRouter(<Dashboard />);
    expect(card()).not.toBeInTheDocument();
  });

  it('PATCHes /become-nutritionist, stores the new tokens, toasts and refreshes the user', async () => {
    const user = userEvent.setup();
    setupUser({ roles: ['TRAINER'], betaAccess: true });
    api.patch.mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
    renderWithRouter(<Dashboard />);

    await user.click(card());

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/become-nutritionist'));
    await waitFor(() => expect(mockUpdateTokens).toHaveBeenCalledWith('new-access', 'new-refresh'));
    expect(showToast).toHaveBeenCalledWith('Conta de nutricionista ativada.', 'success');
    await waitFor(() => expect(mockRefreshUser.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('shows "Carregando..." and ignores a second click while activating', async () => {
    const user = userEvent.setup();
    setupUser({ roles: ['TRAINER'], betaAccess: true });
    api.patch.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<Dashboard />);

    await user.click(card());

    expect(await screen.findAllByText('Carregando...')).not.toHaveLength(0);
    await user.click(screen.getByRole('button', { name: /Carregando/ }));
    expect(api.patch).toHaveBeenCalledTimes(1);
  });

  it('toasts the API error (INVITE_REQUIRED) and keeps the card when activation fails', async () => {
    const user = userEvent.setup();
    setupUser({ roles: ['TRAINER'], betaAccess: true });
    api.patch.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Convite necessário.' }));
    renderWithRouter(<Dashboard />);

    await user.click(card());

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Convite necessário.', 'error'));
    expect(mockUpdateTokens).not.toHaveBeenCalled();
    expect(card()).toBeInTheDocument();
  });
});
