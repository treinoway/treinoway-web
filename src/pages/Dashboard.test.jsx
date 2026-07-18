import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Dashboard from './Dashboard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import getGreeting from '../utils/getGreeting';

const ACTIVE_MODE_KEY = 'treinoway.activeMode';
const ROSTER_CACHE_KEY = 'treinoway.trainerRosterCounts';
const ME_URL = '/me?include=trainerOnboarding,address';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

// Dashboard's own greeting time-of-day boundaries are unit-tested in
// getGreeting.test.js. Here we pin it so "Hero greeting" assertions never
// flake depending on the real wall-clock time the test suite runs at.
vi.mock('../utils/getGreeting', () => ({
  default: vi.fn(() => 'Bom dia'),
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

// A fully-onboarded /me response so OnboardingChecklistCard renders its
// "all done" state instead of the pending checklist and stays out of the way
// of assertions that aren't about it.
const meAllDone = {
  id: 1,
  roles: ['TRAINER'],
  trainerOnboarding: {
    profileCompleted: true,
    firstStudentLinked: true,
    firstProtocolCreated: true,
  },
};

const buildStudents = ({ ativo = 0, pendente = 0, vencido = 0 } = {}) => [
  ...Array.from({ length: ativo }, (_, i) => ({ id: `a${i}`, status: 'ativo' })),
  ...Array.from({ length: pendente }, (_, i) => ({ id: `p${i}`, status: 'pendente' })),
  ...Array.from({ length: vencido }, (_, i) => ({ id: `v${i}`, status: 'vencido' })),
];

// Neutral zero-everywhere ControlTower payload — the default /trainer/dashboard
// response for tests that aren't specifically about the panel's content.
const zeroDashboardData = {
  plans: { expiredCount: 0, renewingSoonCount: 0 },
  routines: { expiredCount: 0, expiringSoonCount: 0 },
  finance: { monthReceived: 0, totalReceived: 0, overdueCount: 0, overdueAmount: 0 },
  engagement: { inactiveStudentsCount: 0, adherenceMonthPct: 0, adherenceDeltaPp: null, weekPrCount: 0 },
  generatedAt: '2026-07-14T12:00:00.000Z',
};

const mockApiGet = (overrides = {}) => {
  api.get.mockImplementation((url) => {
    if (overrides[url]) return overrides[url]();
    if (url === '/trainer/students') return Promise.resolve({ data: [] });
    if (url === '/trainer/dashboard') return Promise.resolve({ data: zeroDashboardData });
    if (url === ME_URL) return Promise.resolve({ data: meAllDone });
    if (url === '/nutritionist') return Promise.resolve({ data: { profileCompletedAt: '2026-01-01' } });
    return Promise.resolve({ data: [] });
  });
};

describe('Dashboard', () => {
  beforeEach(() => {
    mockRefreshUser.mockClear();
    mockRefreshUser.mockResolvedValue(null);
    mockShowToast.mockReset();
    mockHasRole.mockReset();
    api.get.mockReset();
    api.patch.mockReset();
    localStorage.clear();
    vi.mocked(getGreeting).mockReturnValue('Bom dia');

    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, firstName: 'João', status: 'active', roles: [] },
      hasRole: mockHasRole,
      refreshUser: mockRefreshUser,
      updateTokens: mockUpdateTokens,
    });
  });

  describe('Hero greeting', () => {
    it('renders personalized greeting with user first name', () => {
      mockHasRole.mockReturnValue(false);
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('heading', { name: 'Bom dia, João' })).toBeInTheDocument();
    });

    it('renders generic greeting when user has no first name', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, status: 'active', roles: [] },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });
      mockHasRole.mockReturnValue(false);

      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('heading', { name: 'Bem-vindo' })).toBeInTheDocument();
    });

    it('renders the date eyebrow', () => {
      mockHasRole.mockReturnValue(false);
      renderWithRouter(<Dashboard />);
      // Any uppercase "WEEKDAY, D DE MONTH" string is acceptable — exact
      // date depends on the test run date.
      expect(screen.getByText(/^[A-ZÇÁÉÍÓÚÂÊÔÃÕ]+, \d{1,2} DE [A-ZÇÁÉÍÓÚÂÊÔÃÕ]+$/)).toBeInTheDocument();
    });

    it('uses whatever time-of-day prefix getGreeting() returns (time-aware wiring)', () => {
      vi.mocked(getGreeting).mockReturnValue('Boa tarde');
      mockHasRole.mockReturnValue(false);

      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('heading', { name: 'Boa tarde, João' })).toBeInTheDocument();
    });

    it('switches to "Boa noite" when getGreeting() returns it', () => {
      vi.mocked(getGreeting).mockReturnValue('Boa noite');
      mockHasRole.mockReturnValue(false);

      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('heading', { name: 'Boa noite, João' })).toBeInTheDocument();
    });

    it('calls refreshUser on mount', async () => {
      mockHasRole.mockReturnValue(false);
      renderWithRouter(<Dashboard />);
      await waitFor(() => expect(mockRefreshUser).toHaveBeenCalledTimes(1));
    });
  });

  describe('Trainer mode — ActionGrid', () => {
    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      mockApiGet();
    });

    it('shows trainer quick actions', async () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByText('Sua marca')).toBeInTheDocument();
    });

    it('does not render a "Criar Rotina para um Aluno" card — the hero is the sole "Criar rotina" entry point', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('Criar Rotina para um Aluno')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Criar rotina' })).toHaveLength(1);
    });

    it('shows the "Ações" section heading', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('heading', { name: 'Ações' })).toBeInTheDocument();
    });

    it('shows Campeonatos card linking to /trainer/challenges', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('link', { name: /campeonatos/i })).toHaveAttribute('href', '/trainer/challenges');
    });

    it('shows the iArnold AI card', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByText('iArnold')).toBeInTheDocument();
      expect(screen.getByText(/linguagem natural/i)).toBeInTheDocument();
    });

    it('hides the iArnold card for the suppressed AI user', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 9, firstName: 'Gabriel', email: 'gabriel.araujo.lima2011@gmail.com', roles: [] },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });

      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('iArnold')).not.toBeInTheDocument();
    });

    it('links "Sua marca" to /trainer/branding', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('link', { name: /sua marca/i })).toHaveAttribute('href', '/trainer/branding');
    });

    it('shows "Seja um Nutricionista" for a trainer-only user (missing NUTRITIONIST role)', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByText('Seja um Nutricionista')).toBeInTheDocument();
    });

    it('hides "Seja um Nutricionista" for a user who already has the NUTRITIONIST role', () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER' || role === 'NUTRITIONIST');
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('Seja um Nutricionista')).not.toBeInTheDocument();
    });

    it('opens the NutritionistActivationSheet when "Seja um Nutricionista" is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Dashboard />);

      await user.click(screen.getByRole('button', { name: /Seja um Nutricionista/ }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('never ranks "Seja um Nutricionista" above iArnold in the "Ações" grid', () => {
      renderWithRouter(<Dashboard />);
      const labels = screen.getAllByText(/iArnold|Seja um Nutricionista/, { exact: false })
        .map((el) => el.textContent);
      const aiIndex = labels.findIndex((t) => t.includes('iArnold'));
      const nutritionistIndex = labels.findIndex((t) => t.includes('Seja um Nutricionista'));
      expect(aiIndex).toBeGreaterThanOrEqual(0);
      expect(nutritionistIndex).toBeGreaterThan(aiIndex);
    });
  });

  describe('Non-trainer users', () => {
    it('hides trainer quick actions when user does not have TRAINER role', () => {
      mockHasRole.mockReturnValue(false);
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('Sua marca')).not.toBeInTheDocument();
    });

    it('hides the iArnold card when user is not TRAINER', () => {
      mockHasRole.mockReturnValue(false);
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('iArnold')).not.toBeInTheDocument();
    });
  });

  describe('Activation mode (no TRAINER role)', () => {
    beforeEach(() => {
      mockHasRole.mockReturnValue(false);
    });

    it('shows the "Comece a atender" activation zone', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('heading', { name: 'Comece a atender' })).toBeInTheDocument();
    });

    it('shows "Seja um Treinador" as the primary activation action', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByText('Seja um Treinador')).toBeInTheDocument();
    });

    it('shows "Seja um Nutricionista" when the user lacks the NUTRITIONIST role', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByText('Seja um Nutricionista')).toBeInTheDocument();
    });

    it('hides "Seja um Nutricionista" when the user already is a nutritionist', () => {
      mockHasRole.mockImplementation((role) => role === 'NUTRITIONIST');
      mockApiGet();
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('Seja um Nutricionista')).not.toBeInTheDocument();
      expect(screen.getByText('Seja um Treinador')).toBeInTheDocument();
    });

    it('hides the activation zone entirely once the user is a trainer', () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      mockApiGet();
      renderWithRouter(<Dashboard />);
      expect(screen.queryByRole('heading', { name: 'Comece a atender' })).not.toBeInTheDocument();
      expect(screen.queryByText('Seja um Treinador')).not.toBeInTheDocument();
    });

    it('calls become-trainer API and shows success toast', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({
        data: { token: { accessToken: 'new-token' }, refreshToken: 'new-refresh' },
      });

      renderWithRouter(<Dashboard />);
      await user.click(screen.getByRole('button', { name: /Seja um Treinador/ }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/become-trainer');
        expect(mockShowToast).toHaveBeenCalledWith('Conta de treinador ativada.', 'success');
      });
    });
  });

  describe('Onboarding checklist card', () => {
    it('renders the checklist card for trainers with pending onboarding', async () => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
      mockApiGet({
        [ME_URL]: () => Promise.resolve({
          data: {
            id: 1,
            roles: ['TRAINER'],
            trainerOnboarding: {
              profileCompleted: false,
              firstStudentLinked: false,
              firstProtocolCreated: false,
            },
          },
        }),
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Primeiros passos' })).toBeInTheDocument();
      });
      expect(screen.getByText('Complete seu perfil')).toBeInTheDocument();
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
      mockApiGet();
    });

    it('hides trainer quick actions and the Control Tower when activeMode is nutritionist', () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'nutritionist');
      renderWithRouter(<Dashboard />);

      expect(screen.queryByRole('button', { name: 'Criar rotina' })).not.toBeInTheDocument();
      expect(screen.queryByText('Sua marca')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Tua semana em foco' })).not.toBeInTheDocument();
    });

    it('shows trainer quick actions and the Control Tower when activeMode is trainer (default)', () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'trainer');
      renderWithRouter(<Dashboard />);

      expect(screen.getByRole('button', { name: 'Criar rotina' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Tua semana em foco' })).toBeInTheDocument();
    });

    it('shows NutritionistOnboardingCard when activeMode is nutritionist and profile is incomplete', async () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'nutritionist');
      mockApiGet({
        '/nutritionist': () => Promise.resolve({ data: { profileCompletedAt: null } }),
      });

      renderWithRouter(<Dashboard />);

      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/nutritionist'));
      expect(await screen.findByText('Perfil de nutricionista incompleto')).toBeInTheDocument();
    });

    it('hides NutritionistOnboardingCard when activeMode is trainer', () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'trainer');
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('Perfil de nutricionista incompleto')).not.toBeInTheDocument();
    });
  });

  describe('Create Routine — roster-driven guard', () => {
    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
    });

    it('navigates directly when localStorage skip flag is true, without fetching or showing the modal', async () => {
      const user = userEvent.setup();
      localStorage.setItem('treinoway.skipNoStudentsWarning', 'true');
      mockApiGet();

      renderWithRouter(<Dashboard />);
      await user.click(screen.getByRole('button', { name: 'Criar rotina' }));

      expect(screen.queryByRole('heading', { name: 'Nenhum aluno cadastrado' })).not.toBeInTheDocument();
    });

    it('navigates instantly using cached roster counts (no extra fetch needed to decide)', async () => {
      const user = userEvent.setup();
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify({ total: 1, ativo: 1, pendente: 0, vencido: 0 }));
      mockApiGet({
        '/trainer/students': () => Promise.resolve({ data: buildStudents({ ativo: 1 }) }),
      });

      renderWithRouter(<Dashboard />);
      await user.click(screen.getByRole('button', { name: 'Criar rotina' }));

      expect(screen.queryByRole('heading', { name: 'Nenhum aluno cadastrado' })).not.toBeInTheDocument();
    });

    it('shows the "Vincular primeiro aluno" link instead of a clickable "Criar rotina" button when the cached roster is empty', () => {
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify({ total: 0, ativo: 0, pendente: 0, vencido: 0 }));
      mockApiGet();

      renderWithRouter(<Dashboard />);

      expect(screen.queryByRole('button', { name: 'Criar rotina' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Vincular primeiro aluno' })).toHaveAttribute('href', '/trainer/students');
    });

    // The hero "Criar rotina" button only renders while roster.hasCounts is
    // false. useTrainerRoster's own background fetch (fired on mount) hits
    // the same `/trainer/students` endpoint as handleCreateRoutine's manual
    // fallback fetch. Leaving the roster's own (first) call pending keeps the
    // hero stable as a clickable button throughout the test, so only the
    // *second* call — the manual fallback triggered by the click itself —
    // resolves, matching the real "cache miss at click time" scenario.
    const mockPendingRosterThenEmptyFallback = () => {
      let callCount = 0;
      mockApiGet({
        '/trainer/students': () => {
          callCount += 1;
          return callCount === 1 ? new Promise(() => {}) : Promise.resolve({ data: [] });
        },
      });
    };

    it('falls back to a fresh check when no roster counts are known yet (cache miss)', async () => {
      const user = userEvent.setup();
      mockPendingRosterThenEmptyFallback();

      renderWithRouter(<Dashboard />);
      await user.click(screen.getByRole('button', { name: 'Criar rotina' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Nenhum aluno cadastrado' })).toBeInTheDocument();
      });
    });

    it('closes the modal when "Agora não" is clicked', async () => {
      const user = userEvent.setup();
      mockPendingRosterThenEmptyFallback();

      renderWithRouter(<Dashboard />);
      await user.click(screen.getByRole('button', { name: 'Criar rotina' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Nenhum aluno cadastrado' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Agora não' }));
      expect(screen.queryByRole('heading', { name: 'Nenhum aluno cadastrado' })).not.toBeInTheDocument();
    });

    it('shows an error toast when the fallback fetch fails (cache miss + click)', async () => {
      const user = userEvent.setup();
      mockApiGet({
        '/trainer/students': () => Promise.reject({ userMessage: 'Erro de conexão' }),
      });

      renderWithRouter(<Dashboard />);
      await user.click(screen.getByRole('button', { name: 'Criar rotina' }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Erro de conexão', 'error');
      });
    });
  });

  describe('Hero CTA', () => {
    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
    });

    it('shows "Criar rotina" when the roster is not known to be empty', () => {
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify({ total: 4, ativo: 4, pendente: 0, vencido: 0 }));
      mockApiGet({ '/trainer/students': () => Promise.resolve({ data: buildStudents({ ativo: 4 }) }) });

      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('button', { name: 'Criar rotina' })).toBeInTheDocument();
    });

    it('shows "Vincular primeiro aluno" linking to /trainer/students when the cached roster is empty', () => {
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify({ total: 0, ativo: 0, pendente: 0, vencido: 0 }));
      mockApiGet();

      renderWithRouter(<Dashboard />);
      const ctas = screen.getAllByRole('link', { name: 'Vincular primeiro aluno' });
      expect(ctas.length).toBeGreaterThan(0);
      ctas.forEach((cta) => expect(cta).toHaveAttribute('href', '/trainer/students'));
    });
  });

  // ControlTower's own states (skeleton, retry, bands, deep-links, etc.) are
  // covered in depth in ControlTower.test.jsx. These tests only verify that
  // Dashboard wires useTrainerDashboard → ControlTower correctly.
  describe('Control Tower', () => {
    const DASHBOARD_CACHE_KEY = 'treinoway.trainerDashboardData';

    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
    });

    it('renders the panel and fetches from /trainer/dashboard for a trainer', async () => {
      mockApiGet();
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('heading', { name: 'Tua semana em foco' })).toBeInTheDocument();
      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/trainer/dashboard'));
    });

    it('does not render the panel for a non-trainer user', () => {
      mockHasRole.mockReturnValue(false);
      renderWithRouter(<Dashboard />);
      expect(screen.queryByRole('heading', { name: 'Tua semana em foco' })).not.toBeInTheDocument();
    });

    it('paints cached panel data instantly, before the network refresh resolves', () => {
      localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
        plans: { expiredCount: 3, renewingSoonCount: 0 },
        routines: { expiredCount: 0, expiringSoonCount: 0 },
        finance: { monthReceived: 2500, totalReceived: 12000, overdueCount: 0, overdueAmount: 0 },
        engagement: { inactiveStudentsCount: 0, adherenceMonthPct: 78.5, adherenceDeltaPp: null, weekPrCount: 0 },
        generatedAt: '2026-07-14T12:00:00.000Z',
      }));
      mockApiGet({ '/trainer/dashboard': () => new Promise(() => {}) });

      renderWithRouter(<Dashboard />);

      expect(screen.getByRole('link', { name: '3 planos expirados, ver detalhes' }))
        .toHaveAttribute('href', '/trainer/students?status=vencido');
    });

    it('shows a discreet retry affordance when the fetch fails and there is no prior cache (e.g. 404 — endpoint not shipped yet)', async () => {
      mockApiGet({ '/trainer/dashboard': () => Promise.reject({ userMessage: 'Erro de conexão' }) });

      renderWithRouter(<Dashboard />);

      await waitFor(() => expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument());
      // No toast is fired for a silent background/panel failure.
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Student-only user', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 2, firstName: 'Aluno', status: 'active', email: 'n.santos1897@gmail.com', roles: [] },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });
      mockHasRole.mockReturnValue(false);
    });

    it('shows Campeonatos card linking to /my/challenges', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('link', { name: /campeonatos/i })).toHaveAttribute('href', '/my/challenges');
    });

    it('shows a "Meus treinos" card linking to an existing student route', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('link', { name: /meus treinos/i })).toHaveAttribute('href', '/my/protocols');
    });

    it('does not show the Control Tower for a student-only user', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.queryByRole('heading', { name: 'Tua semana em foco' })).not.toBeInTheDocument();
    });

    it('does not show the activation zone for a student-only user', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.queryByRole('heading', { name: 'Comece a atender' })).not.toBeInTheDocument();
    });

    it('does not show trainer quick actions', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('Sua marca')).not.toBeInTheDocument();
    });
  });
});
