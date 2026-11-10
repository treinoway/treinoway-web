import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Dashboard from './Dashboard';
import { TRAINER_ROSTER_CACHE_KEY as ROSTER_CACHE_KEY } from '../hooks/useTrainerRoster';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import getGreeting from '../utils/getGreeting';

const ACTIVE_MODE_KEY = 'treinoway.activeMode';
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
    firstAnamnesisSent: true,
  },
};

const buildStudents = ({ ativo = 0, pendente = 0, vencido = 0 } = {}) => [
  ...Array.from({ length: ativo }, (_, i) => ({ id: `a${i}`, billingStatus: 'ok' })),
  ...Array.from({ length: pendente }, (_, i) => ({ id: `p${i}`, billingStatus: 'due_soon' })),
  ...Array.from({ length: vencido }, (_, i) => ({ id: `v${i}`, billingStatus: 'overdue' })),
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

// Auth mock carrying an explicit AI quota, mirroring what /me returns in
// `platformPlan.limits.aiActionsPerStudent` (0 = FREE, 3 = PRO/PLATINUM,
// null = DIAMOND/unlimited).
const mockAuthWithAiQuota = (aiActionsPerStudent) => {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 1,
      firstName: 'João',
      status: 'active',
      roles: ['TRAINER'],
      platformPlan: { tier: 'PRO', limits: { aiActionsPerStudent } },
    },
    hasRole: mockHasRole,
    refreshUser: mockRefreshUser,
    updateTokens: mockUpdateTokens,
  });
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
      expect(screen.getByText('iArnold')).toBeInTheDocument();
      expect(screen.queryByText('Sua marca')).not.toBeInTheDocument();
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

    it('shows the iArnold AI card', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByText('iArnold')).toBeInTheDocument();
      expect(screen.getByText(/linguagem natural/i)).toBeInTheDocument();
    });

    it('hides the iArnold card when the plan quota is an explicit 0 (FREE)', () => {
      mockAuthWithAiQuota(0);

      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('iArnold')).not.toBeInTheDocument();
    });

    it('shows the iArnold card when the plan quota is null (DIAMOND = unlimited)', () => {
      mockAuthWithAiQuota(null);

      renderWithRouter(<Dashboard />);
      expect(screen.getByText('iArnold')).toBeInTheDocument();
    });

    it('shows the iArnold card when the plan quota is 3 (PRO/PLATINUM)', () => {
      mockAuthWithAiQuota(3);

      renderWithRouter(<Dashboard />);
      expect(screen.getByText('iArnold')).toBeInTheDocument();
    });

    // Fail-open: a stale cached user or a partial /me must not silently remove
    // the card — the backend still enforces the plan with a 403.
    it('shows the iArnold card when platformPlan is missing (fail-open)', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByText('iArnold')).toBeInTheDocument();
    });

    it('no longer suppresses the iArnold card by hardcoded email', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 9, firstName: 'Gabriel', email: 'gabriel.araujo.lima2011@gmail.com', roles: ['TRAINER'] },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });

      renderWithRouter(<Dashboard />);
      expect(screen.getByText('iArnold')).toBeInTheDocument();
    });

    it('does not show a "Sua marca" card in the Ações grid', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.queryByRole('link', { name: /sua marca/i })).not.toBeInTheDocument();
      expect(document.querySelector('a[href="/trainer/branding"]')).toBeNull();
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

    it('hides "Seja nutricionista" when the user already is a nutritionist', () => {
      mockHasRole.mockImplementation((role) => role === 'NUTRITIONIST');
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 1, firstName: 'João', status: 'active', roles: ['NUTRITIONIST'], betaAccess: true },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });
      mockApiGet();
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('Seja nutricionista')).not.toBeInTheDocument();
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

  describe('Dual-role users (TRAINER + NUTRITIONIST) — no mode switching', () => {
    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER' || role === 'NUTRITIONIST');
      mockApiGet();
    });

    it('shows trainer quick actions and the Control Tower regardless of any stored mode', () => {
      localStorage.setItem(ACTIVE_MODE_KEY, 'nutritionist');
      renderWithRouter(<Dashboard />);

      expect(screen.getByRole('button', { name: 'Criar rotina' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Tua semana em foco' })).toBeInTheDocument();
    });

    it('never asks the nutritionist API for the removed onboarding card', async () => {
      renderWithRouter(<Dashboard />);

      await waitFor(() => expect(api.get).toHaveBeenCalled());
      expect(api.get).not.toHaveBeenCalledWith('/nutritionist');
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
      localStorage.setItem(`${ROSTER_CACHE_KEY}:1`, JSON.stringify({ total: 1, ativo: 1, pendente: 0, vencido: 0 }));
      mockApiGet({
        '/trainer/students': () => Promise.resolve({ data: buildStudents({ ativo: 1 }) }),
      });

      renderWithRouter(<Dashboard />);
      await user.click(screen.getByRole('button', { name: 'Criar rotina' }));

      expect(screen.queryByRole('heading', { name: 'Nenhum aluno cadastrado' })).not.toBeInTheDocument();
    });

    it('shows the "Vincular primeiro aluno" link instead of a clickable "Criar rotina" button when the cached roster is empty', () => {
      localStorage.setItem(`${ROSTER_CACHE_KEY}:1`, JSON.stringify({ total: 0, ativo: 0, pendente: 0, vencido: 0 }));
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
      localStorage.setItem(`${ROSTER_CACHE_KEY}:1`, JSON.stringify({ total: 4, ativo: 4, pendente: 0, vencido: 0 }));
      mockApiGet({ '/trainer/students': () => Promise.resolve({ data: buildStudents({ ativo: 4 }) }) });

      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('button', { name: 'Criar rotina' })).toBeInTheDocument();
    });

    it('shows "Vincular primeiro aluno" linking to /trainer/students when the cached roster is empty', () => {
      localStorage.setItem(`${ROSTER_CACHE_KEY}:1`, JSON.stringify({ total: 0, ativo: 0, pendente: 0, vencido: 0 }));
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
      localStorage.setItem(`${DASHBOARD_CACHE_KEY}:1`, JSON.stringify({
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

  describe('Onboarding placement (criteria 1-4)', () => {
    const STATUS_CACHE_KEY = 'treinoway:onboardingStatus:1';
    const pendingOnboarding = {
      profileCompleted: true,
      firstStudentLinked: false,
      firstProtocolCreated: false,
      firstStudentInvited: false,
      firstAnamnesisSent: false,
      brandingConfigured: false,
    };
    const doneOnboarding = {
      ...pendingOnboarding,
      firstStudentLinked: true,
      firstProtocolCreated: true,
      firstAnamnesisSent: true,
    };

    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
    });

    const isBefore = (first, second) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    it('renders "Primeiros passos" before "Tua semana em foco" while steps are incomplete', async () => {
      mockApiGet({
        [ME_URL]: () => Promise.resolve({ data: { ...meAllDone, trainerOnboarding: pendingOnboarding } }),
      });

      renderWithRouter(<Dashboard />);

      const onboarding = await screen.findByRole('heading', { name: 'Primeiros passos' });
      const controlTower = screen.getByRole('heading', { name: 'Tua semana em foco' });
      expect(isBefore(onboarding, controlTower)).toBe(true);
    });

    it('renders the all-done card after "Tua semana em foco"', async () => {
      mockApiGet({
        [ME_URL]: () => Promise.resolve({ data: { ...meAllDone, trainerOnboarding: doneOnboarding } }),
      });

      renderWithRouter(<Dashboard />);

      const allDone = await screen.findByText('Tudo pronto!');
      const controlTower = screen.getByRole('heading', { name: 'Tua semana em foco' });
      expect(isBefore(controlTower, allDone)).toBe(true);
    });

    it('shows no onboarding skeleton above the Control Tower when the cached status is all done and /me is still loading', () => {
      localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({ onboarding: doneOnboarding, brandingAllowed: false }));
      mockApiGet({ [ME_URL]: () => new Promise(() => {}) });

      renderWithRouter(<Dashboard />);

      expect(screen.queryByRole('region', { name: 'Primeiros passos' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Tua semana em foco' })).toBeInTheDocument();
    });

    it('shows no onboarding skeleton when the card was dismissed and /me is still loading', () => {
      localStorage.setItem('treinoway:onboardingDismissed:1', '1');
      mockApiGet({ [ME_URL]: () => new Promise(() => {}) });

      renderWithRouter(<Dashboard />);

      expect(screen.queryByRole('region', { name: 'Primeiros passos' })).not.toBeInTheDocument();
    });
  });

  describe('New-trainer Control Tower (criterion 8)', () => {
    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
    });

    it('shows a welcome state with a CTA instead of zeroed tiles when the trainer has 0 linked students', async () => {
      mockApiGet({ '/trainer/students': () => Promise.resolve({ data: [] }) });

      renderWithRouter(<Dashboard />);

      expect(await screen.findByText('Seu painel ganha vida com o primeiro aluno')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Convidar primeiro aluno' })).toHaveAttribute('href', '/trainer/students');
      expect(screen.queryByText('Nada exige ação agora')).not.toBeInTheDocument();
    });

    it('keeps the regular panel when the trainer already has students', async () => {
      mockApiGet({ '/trainer/students': () => Promise.resolve({ data: buildStudents({ ativo: 2 }) }) });

      renderWithRouter(<Dashboard />);

      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/trainer/students'));
      expect(screen.queryByText('Seu painel ganha vida com o primeiro aluno')).not.toBeInTheDocument();
    });
  });

  describe('Per-user dashboard caches (criterion 9)', () => {
    const cachedDashboard = {
      plans: { expiredCount: 3, renewingSoonCount: 0 },
      routines: { expiredCount: 0, expiringSoonCount: 0 },
      finance: { monthReceived: 2500, totalReceived: 12000, overdueCount: 0, overdueAmount: 0 },
      engagement: { inactiveStudentsCount: 0, adherenceMonthPct: 78.5, adherenceDeltaPp: null, weekPrCount: 0 },
      generatedAt: '2026-07-14T12:00:00.000Z',
    };

    beforeEach(() => {
      mockHasRole.mockImplementation((role) => role === 'TRAINER');
    });

    it('never paints another user\'s cached panel data', () => {
      localStorage.setItem('treinoway.trainerDashboardData:1', JSON.stringify(cachedDashboard));
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 2, firstName: 'Bia', status: 'active', roles: ['TRAINER'] },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });
      mockApiGet({ '/trainer/dashboard': () => new Promise(() => {}) });

      renderWithRouter(<Dashboard />);

      expect(screen.queryByRole('link', { name: '3 planos expirados, ver detalhes' })).not.toBeInTheDocument();
    });

    it('never reads another user\'s cached roster counts', () => {
      localStorage.setItem(`${ROSTER_CACHE_KEY}:1`, JSON.stringify({ total: 0, ativo: 0, pendente: 0, vencido: 0 }));
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 2, firstName: 'Bia', status: 'active', roles: ['TRAINER'] },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });
      mockApiGet({ '/trainer/students': () => new Promise(() => {}) });

      renderWithRouter(<Dashboard />);

      expect(screen.getByRole('button', { name: 'Criar rotina' })).toBeInTheDocument();
    });

    it('writes the fetched dashboard payload under the current user\'s key only', async () => {
      mockApiGet();

      renderWithRouter(<Dashboard />);

      await waitFor(() => {
        expect(localStorage.getItem('treinoway.trainerDashboardData:1')).not.toBeNull();
      });
      expect(localStorage.getItem('treinoway.trainerDashboardData')).toBeNull();
    });
  });

  describe('Non-trainer user (former student-only email)', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 2, firstName: 'Aluno', status: 'active', email: 'n.santos1897@gmail.com', roles: [] },
        hasRole: mockHasRole,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });
      mockHasRole.mockReturnValue(false);
    });

    it('does not show student-only quick action cards', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.queryByRole('link', { name: /meus treinos/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /\/my\/challenges/i })).not.toBeInTheDocument();
    });

    it('does not show the Control Tower for a non-trainer user', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.queryByRole('heading', { name: 'Tua semana em foco' })).not.toBeInTheDocument();
    });

    it('shows the activation zone like any other non-trainer user', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.getByRole('heading', { name: 'Comece a atender' })).toBeInTheDocument();
    });

    it('does not show trainer quick actions', () => {
      renderWithRouter(<Dashboard />);
      expect(screen.queryByText('Sua marca')).not.toBeInTheDocument();
    });
  });

  describe('Admin entry points', () => {
    it('renders no admin cards on the Dashboard, even for an admin', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 3, firstName: 'Admin', status: 'active', roles: ['admin'] },
        hasRole: mockHasRole,
        isAdmin: true,
        refreshUser: mockRefreshUser,
        updateTokens: mockUpdateTokens,
      });
      mockHasRole.mockReturnValue(false);
      mockApiGet();

      renderWithRouter(<Dashboard />);

      expect(screen.queryByRole('heading', { name: 'Administração' })).not.toBeInTheDocument();
      ['Convites do beta', 'Trainers e planos', 'Uso do iArnold'].forEach((name) => {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      });
    });
  });
});
