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
    api.get.mockReset();

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
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected'));
    });

    renderWithRouter(<Dashboard />);

    expect(screen.getByText('Criar Rotina para um Aluno')).toBeInTheDocument();
    expect(screen.getByText('Personalize sua Marca')).toBeInTheDocument();
  });

  it('shows Campeonatos card for trainer', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected'));
    });

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
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected'));
    });

    renderWithRouter(<Dashboard />);

    expect(screen.getByText('iArnold')).toBeInTheDocument();
    expect(screen.getByText(/linguagem natural/i)).toBeInTheDocument();
  });

  it('hides AI assistant card when user is not TRAINER', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText('iArnold')).not.toBeInTheDocument();
  });

  it('renders stats section with counts when user is TRAINER and counts > 0', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 1 }, { id: 2 }] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [{ id: 1 }] });
      return Promise.reject(new Error('unexpected'));
    });

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    expect(screen.getByText('Alunos')).toBeInTheDocument();
    expect(screen.getAllByText('Rotinas').length).toBeGreaterThanOrEqual(1);
  });

  it('stats are clickable links when counts > 0', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 1 }] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [{ id: 1 }] });
      return Promise.reject(new Error('unexpected'));
    });

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Alunos')).toBeInTheDocument();
    });

    const statLinks = document.querySelectorAll('.dashboard-stat-link');
    expect(statLinks).toHaveLength(2);
    expect(statLinks[0]).toHaveAttribute('href', '/trainer/students');
    expect(statLinks[1]).toHaveAttribute('href', '/trainer/protocols');
  });

  it('hides stats when both counts are 0', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected'));
    });

    renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('Alunos')).not.toBeInTheDocument();
    });
  });

  it('renders skeleton loaders while stats are loading', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithRouter(<Dashboard />);

    const skeletons = container.querySelectorAll('.stat-card-skeleton');
    expect(skeletons).toHaveLength(2);
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('marks stats section as aria-busy while loading', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Dashboard />);

    const statsSection = screen.getByRole('region', { name: /estatísticas/i });
    expect(statsSection).toHaveAttribute('aria-busy', 'true');
  });

  it('removes skeleton loaders and aria-busy after stats load', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 1 }] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected'));
    });

    const { container } = renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(container.querySelectorAll('.stat-card-skeleton')).toHaveLength(0);
    });

    const statsSection = screen.getByRole('region', { name: /estatísticas/i });
    expect(statsSection).toHaveAttribute('aria-busy', 'false');
  });

  it('shows zero counts on API error without skeletons and hides stats', async () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    api.get.mockRejectedValue(new Error('network error'));

    const { container } = renderWithRouter(<Dashboard />);

    await waitFor(() => {
      expect(container.querySelectorAll('.stat-card-skeleton')).toHaveLength(0);
    });

    // Both counts become 0 on error → stats section is hidden (showStats = false)
    expect(screen.queryByText('Alunos')).not.toBeInTheDocument();
  });

  it('does not render stats section when user is not TRAINER', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText('Alunos')).not.toBeInTheDocument();
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

  it('shows alert banner when user status is pending', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', status: 'pending', roles: [] },
      hasRole: mockHasRole,
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.getByText(/seu perfil está incompleto/i)).toBeInTheDocument();
    expect(screen.getByText('COMPLETAR →')).toBeInTheDocument();
  });

  it('alert banner links to /profile', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', status: 'pending', roles: [] },
      hasRole: mockHasRole,
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    const banner = screen.getByText(/seu perfil está incompleto/i).closest('a');
    expect(banner).toHaveAttribute('href', '/profile');
  });

  it('hides alert banner when user status is not pending', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    expect(screen.queryByText(/seu perfil está incompleto/i)).not.toBeInTheDocument();
    expect(screen.queryByText('COMPLETAR →')).not.toBeInTheDocument();
  });

  it('does not render hero CTA link inside hero when status is pending', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', status: 'pending', roles: [] },
      hasRole: mockHasRole,
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Dashboard />);

    // The old in-hero "Completar perfil →" link should not exist — replaced by banner
    expect(screen.queryByText(/completar perfil →/i)).not.toBeInTheDocument();
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

  describe('Onboarding stepper', () => {
    it('shows onboarding stepper when trainer has status pending', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, firstName: 'João', status: 'pending', roles: [] },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      api.get.mockImplementation((url) => {
        if (url === '/trainer/students') return Promise.resolve({ data: [] });
        if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
        return Promise.reject(new Error('unexpected'));
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Primeiros passos')).toBeInTheDocument();
      });

      expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
      expect(screen.getByText('Adicione um aluno')).toBeInTheDocument();
      expect(screen.getByText('Crie uma rotina')).toBeInTheDocument();
    });

    it('shows onboarding stepper when trainer has no students yet', async () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      api.get.mockImplementation((url) => {
        if (url === '/trainer/students') return Promise.resolve({ data: [] });
        if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
        return Promise.reject(new Error('unexpected'));
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Primeiros passos')).toBeInTheDocument();
      });
    });

    it('hides onboarding stepper when all steps are done', async () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      api.get.mockImplementation((url) => {
        if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 1 }] });
        if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [{ id: 1 }] });
        return Promise.reject(new Error('unexpected'));
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Primeiros passos')).not.toBeInTheDocument();
      });
    });

    it('does not show onboarding stepper while stats are loading', () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      api.get.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<Dashboard />);

      expect(screen.queryByText('Primeiros passos')).not.toBeInTheDocument();
    });

    it('does not show onboarding stepper for non-trainer users', () => {
      mockHasRole.mockReturnValue(false);

      renderWithRouter(<Dashboard />);

      expect(screen.queryByText('Primeiros passos')).not.toBeInTheDocument();
    });

    it('marks profile step as done when user status is not pending', async () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      api.get.mockImplementation((url) => {
        if (url === '/trainer/students') return Promise.resolve({ data: [] });
        if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
        return Promise.reject(new Error('unexpected'));
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Primeiros passos')).toBeInTheDocument();
      });

      // Step 1 number shows ✓ when status is not pending (user is 'active' in default mock)
      const stepNumbers = document.querySelectorAll('.onboarding-step-number');
      expect(stepNumbers[0].textContent).toBe('✓');
    });

    it('marks students step as done when studentsCount > 0', async () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      api.get.mockImplementation((url) => {
        if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 1 }] });
        if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
        return Promise.reject(new Error('unexpected'));
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Primeiros passos')).toBeInTheDocument();
      });

      const stepNumbers = document.querySelectorAll('.onboarding-step-number');
      expect(stepNumbers[1].textContent).toBe('✓');
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
