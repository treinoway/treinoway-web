import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Dashboard from './Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const ACTIVE_MODE_KEY = 'treinoway.activeMode';

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
    api.get.mockReset();
    localStorage.clear();

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

  it('shows trainer quick actions when user has TRAINER role', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<Dashboard />);

    expect(screen.getByText('Criar Rotina para um Aluno')).toBeInTheDocument();
    expect(screen.getByText('Personalize sua Marca')).toBeInTheDocument();
  });

  it('shows Campeonatos card for trainer', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<Dashboard />);

    expect(screen.getByRole('link', { name: /campeonatos/i })).toHaveAttribute('href', '/trainer/challenges');
  });

  it('shows Campeonatos card for student user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 2, firstName: 'Aluno', status: 'active', email: 'n.santos1897@gmail.com', roles: [] },
      hasRole: mockHasRole,
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.getByRole('link', { name: /campeonatos/i })).toHaveAttribute('href', '/my/challenges');
  });

  it('shows AI assistant card when user is TRAINER', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<Dashboard />);

    expect(screen.getByText('iArnold')).toBeInTheDocument();
    expect(screen.getByText(/linguagem natural/i)).toBeInTheDocument();
  });

  it('hides AI assistant card when user is not TRAINER', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText('iArnold')).not.toBeInTheDocument();
  });

  it('hides trainer quick actions when user does not have TRAINER role', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText('Personalize sua Marca')).not.toBeInTheDocument();
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
        'Conta de treinador ativada.',
        'success'
      );
    });
  });

  describe('Onboarding checklist card', () => {
    it('renders the checklist card for trainers with pending onboarding', async () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      api.get.mockImplementation((url) => {
        if (url === '/me?include=trainerOnboarding,address') {
          return Promise.resolve({
            data: {
              id: 1,
              roles: ['TRAINER'],
              trainerOnboarding: {
                profileCompleted: false,
                firstStudentLinked: false,
                firstProtocolCreated: false,
              },
            },
          });
        }
        return Promise.resolve({ data: [] });
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Primeiros passos' })).toBeInTheDocument();
      });

      expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
      expect(screen.getByText('Vincule seu primeiro aluno')).toBeInTheDocument();
      expect(screen.getByText('Crie seu primeiro protocolo')).toBeInTheDocument();
    });

    it('does not show checklist card for non-trainer users', () => {
      mockHasRole.mockReturnValue(false);

      renderWithRouter(<Dashboard />);

      expect(screen.queryByRole('heading', { name: 'Primeiros passos' })).not.toBeInTheDocument();
    });
  });

  describe('Dual-role mode switching (TRAINER + NUTRITIONIST)', () => {
    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER' || role === 'NUTRITIONIST');
      api.get.mockResolvedValue({ data: { profileCompletedAt: null } });
      localStorage.clear();
    });

    it('hides trainer quick actions when activeMode is nutritionist', () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'nutritionist');

      renderWithRouter(<Dashboard />);

      expect(screen.queryByText('Criar Rotina para um Aluno')).not.toBeInTheDocument();
      expect(screen.queryByText('Personalize sua Marca')).not.toBeInTheDocument();
    });

    it('shows trainer quick actions when activeMode is trainer (default)', () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'trainer');
      api.get.mockResolvedValue({ data: [] });

      renderWithRouter(<Dashboard />);

      expect(screen.getByText('Criar Rotina para um Aluno')).toBeInTheDocument();
    });

    it('shows NutritionistOnboardingCard when activeMode is nutritionist and profile is incomplete', async () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'nutritionist');
      api.get.mockResolvedValue({ data: { profileCompletedAt: null } });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/nutritionist');
      });
    });

    it('hides NutritionistOnboardingCard when activeMode is trainer', async () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'trainer');

      renderWithRouter(<Dashboard />);

      // OnboardingChecklistCard for trainer should appear instead
      // Nutritionist-specific card should not appear regardless of profileCompletedAt
      // (the api.get for /nutritionist is still called but card won't render)
      expect(screen.queryByRole('link', { name: /completar perfil de nutricionista/i })).not.toBeInTheDocument();
    });
  });

  describe('Create Routine - student check', () => {
    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      localStorage.clear();
      api.get.mockReset();
    });

    it('navigates directly when localStorage skip is true without showing modal', async () => {
      const user = userEvent.setup();
      localStorage.setItem('treinoway.skipNoStudentsWarning', 'true');
      api.get.mockResolvedValue({ data: [] });

      renderWithRouter(<Dashboard />);

      await user.click(screen.getByRole('button', { name: /Criar Rotina para um Aluno/ }));

      expect(screen.queryByRole('heading', { name: 'Nenhum aluno cadastrado' })).not.toBeInTheDocument();
    });

    it('navigates when API returns students', async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: [{ id: 1, firstName: 'Ana' }] });

      renderWithRouter(<Dashboard />);

      await user.click(screen.getByRole('button', { name: /Criar Rotina para um Aluno/ }));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/trainer/students');
      });

      expect(screen.queryByRole('heading', { name: 'Nenhum aluno cadastrado' })).not.toBeInTheDocument();
    });

    it('opens modal when API returns no students', async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: [] });

      renderWithRouter(<Dashboard />);

      await user.click(screen.getByRole('button', { name: /Criar Rotina para um Aluno/ }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Nenhum aluno cadastrado' })).toBeInTheDocument();
      });
    });

    it('closes modal when "Agora não" is clicked', async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: [] });

      renderWithRouter(<Dashboard />);

      await user.click(screen.getByRole('button', { name: /Criar Rotina para um Aluno/ }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Nenhum aluno cadastrado' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Agora não' }));

      expect(screen.queryByRole('heading', { name: 'Nenhum aluno cadastrado' })).not.toBeInTheDocument();
    });

    it('shows error toast when API call fails', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValue({ userMessage: 'Erro de conexão' });

      renderWithRouter(<Dashboard />);

      await user.click(screen.getByRole('button', { name: /Criar Rotina para um Aluno/ }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Erro de conexão', 'error');
      });
    });
  });
});
