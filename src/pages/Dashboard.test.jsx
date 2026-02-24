import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Dashboard from './Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockRefreshUser = vi.fn();
const mockUpdateTokens = vi.fn();
const mockShowToast = vi.fn();
const mockHasRole = vi.fn();

describe('Dashboard', () => {
  beforeEach(() => {
    mockRefreshUser.mockClear();
    mockRefreshUser.mockResolvedValue(null);
    mockShowToast.mockReset();
    mockHasRole.mockReset();

    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', status: 'active', roles: [] },
      hasRole: mockHasRole,
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
  });

  it('renders personalized greeting with user first name', async () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.getByText(/olá, joão/i)).toBeInTheDocument();
  });

  it('renders generic greeting when user has no first name', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, status: 'active', roles: [] },
      hasRole: mockHasRole,
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.getByText(/bem-vindo/i)).toBeInTheDocument();
  });

  it('shows trainer quick actions when user has TRAINER role', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');

    renderWithRouter(<Dashboard />);

    expect(screen.getByText('Criar Rotina para um Aluno')).toBeInTheDocument();
    expect(screen.getByText('Modelos de Rotina')).toBeInTheDocument();
  });

  it('hides trainer quick actions when user does not have TRAINER role', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText('Criar Rotina para um Aluno')).not.toBeInTheDocument();
    expect(screen.queryByText('Modelos de Rotina')).not.toBeInTheDocument();
  });

  it('shows "Seja um Treinador" button when user is not a trainer', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.getByText('Seja um Treinador')).toBeInTheDocument();
  });

  it('hides "Seja um Treinador" button when user is already a trainer', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText('Seja um Treinador')).not.toBeInTheDocument();
  });

  it('shows "Completar perfil" link when user status is pending', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', status: 'pending', roles: [] },
      hasRole: mockHasRole,
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.getByText(/completar perfil/i)).toBeInTheDocument();
  });

  it('hides "Completar perfil" link when user status is not pending', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText(/completar perfil/i)).not.toBeInTheDocument();
  });

  it('calls refreshUser on mount', async () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    });
  });

  it('calls become-trainer API and shows success toast', async () => {
    const user = userEvent.setup();
    mockHasRole.mockReturnValue(false);
    api.patch.mockResolvedValue({
      data: { token: { accessToken: 'new-token' }, refreshToken: 'new-refresh' },
    });

    renderWithRouter(<Dashboard />);

    await user.click(screen.getByText('Seja um Treinador'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/become-trainer');
      expect(mockShowToast).toHaveBeenCalledWith(
        'Parabéns! Você agora é um treinador!',
        'success'
      );
    });
  });
});
