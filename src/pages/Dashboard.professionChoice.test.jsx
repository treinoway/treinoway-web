import { renderWithRouter, screen } from '../test/test-utils';
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

// Mocks an authenticated user holding exactly the given roles.
const setupUser = (roles, extra = {}) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1', firstName: 'Ana', email: 'ana@example.com', roles, betaAccess: true, ...extra },
    isAuthenticated: true,
    hasRole: (role) => roles.some((owned) => owned.toUpperCase() === role.toUpperCase()),
    refreshUser: vi.fn().mockResolvedValue(null),
    updateTokens: vi.fn(),
    updateUser: vi.fn(),
  });
};

describe('Dashboard profession choice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
  });

  it('shows "Como você atende?" with both switches for a user with no professional role', () => {
    setupUser([]);

    renderWithRouter(<Dashboard />);

    expect(screen.getByRole('heading', { name: 'Como você atende?' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Treino' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Nutrição' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('shows the card to a user stuck at the old wall (betaAccess false)', () => {
    setupUser([], { betaAccess: false });

    renderWithRouter(<Dashboard />);

    expect(screen.getByRole('heading', { name: 'Como você atende?' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Nutrição' })).toBeInTheDocument();
  });

  it('does not render the old "Seja um Treinador" / "Seja nutricionista" cards for a user with no role', () => {
    setupUser([]);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText('Seja um Treinador')).not.toBeInTheDocument();
    expect(screen.queryByText('Seja nutricionista')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Comece a atender' })).not.toBeInTheDocument();
  });

  it('shows no choice card to a trainer and keeps the "Seja nutricionista" card', () => {
    setupUser(['TRAINER']);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByRole('heading', { name: 'Como você atende?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Treino' })).not.toBeInTheDocument();
    expect(screen.getByText('Seja nutricionista')).toBeInTheDocument();
    expect(screen.queryByText('Seja um Treinador')).not.toBeInTheDocument();
  });

  it('shows no choice card to a nutritionist and keeps the "Seja um Treinador" card', () => {
    setupUser(['NUTRITIONIST']);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByRole('heading', { name: 'Como você atende?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Nutrição' })).not.toBeInTheDocument();
    expect(screen.getByText('Seja um Treinador')).toBeInTheDocument();
    expect(screen.queryByText('Seja nutricionista')).not.toBeInTheDocument();
  });

  it('shows neither the choice card nor the old cards to a user with both roles', () => {
    setupUser(['TRAINER', 'NUTRITIONIST']);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByRole('heading', { name: 'Como você atende?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText('Seja um Treinador')).not.toBeInTheDocument();
    expect(screen.queryByText('Seja nutricionista')).not.toBeInTheDocument();
  });
});
