import { act, renderWithRoute, screen, waitFor } from '../../test/test-utils';
import StudentDetail from './StudentDetail';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';
import { makePayment, makePlan, pinFinanceClock } from '../../test/financeFixtures';

/*
 * Page assembly: every endpoint is a deferred promise resolved by hand, with the real
 * data hooks (dashboard included). Asserts the page never mounts a section late, never
 * shows an empty / not-found state before its source answers, and that the
 * above-the-fold figures appear together whatever the response order.
 */

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../hooks/usePeriodPersistence', () => ({
  default: () => [{ presetKey: 'last-30-days', from: '2026-09-06', to: '2026-10-06' }, vi.fn()],
}));

vi.mock('../../components/PeriodPickerSheet', () => ({ default: () => null }));
vi.mock('../../components/IArnoldFAB', () => ({
  default: ({ label }) => <button type="button">{label}</button>,
}));

const STUDENT = '/trainer/students/student-1';
const SUMMARY = `${STUDENT}/dashboard/summary`;
const RECENT = `${STUDENT}/dashboard/recent-sessions`;
const PROGRESSION = `${STUDENT}/dashboard/exercise-progression`;
const DAILY = `${STUDENT}/dashboard/daily-activity`;
const ACTIVE = '/professional/students/student-1/subscriptions/active';
const PAYMENTS = '/professional/students/student-1/payments';
const PLANS = '/professional/subscription-plans';
const PROTOCOLS = '/trainer/protocols';
const ANAMNESES = `${STUDENT}/anamneses`;
const FEEDBACKS = `${STUDENT}/feedbacks`;

const RESPONSES = {
  [STUDENT]: { id: 'student-1', firstName: 'Aluno', lastName: 'Exemplo', email: 'aluno@example.com', lastWorkoutAt: null },
  [SUMMARY]: { adherence: 75, adherenceCompleted: 6, adherenceExpected: 8, previousAdherence: null, completionRate: 0.8 },
  [RECENT]: {
    data: [{ id: 'sess-1', trainingName: 'Upper', status: 'completed', startedAt: '2026-10-05T13:00:00Z', noteText: 'Semana corrida' }],
  },
  [PROGRESSION]: { data: [] },
  [DAILY]: { data: [] },
  [ACTIVE]: { id: 'sub-1', planId: 'plan-1', recurrence: 'monthly', price: '99.90', discountPercent: null, discountAmount: null, startDate: '2026-01-31' },
  [PAYMENTS]: { student: { id: 'student-1', name: 'Aluno Exemplo' }, summary: null, payments: [makePayment()] },
  [PLANS]: [makePlan()],
  [PROTOCOLS]: [{ id: 'proto-1', name: 'Rotina Ativa', status: 'active', startDate: '2026-09-01', expirationDate: '2026-12-31' }],
  [ANAMNESES]: [],
  [FEEDBACKS]: { student: { id: 'student-1', name: 'Aluno Exemplo', avatarUrl: null }, hasPending: false, feedbacks: [] },
};

const ALL_URLS = Object.keys(RESPONSES);
const DASHBOARD_URLS = [SUMMARY, RECENT, PROGRESSION, DAILY];
/** Sources of the hero context line + metrics row (plans aren't: payments carry the plan name). */
const OVERVIEW_URLS = [STUDENT, ...DASHBOARD_URLS, ACTIVE, PAYMENTS, PROTOCOLS];

const SECTION_TITLES = ['Aderência e relacionamento', 'Assinatura', 'Diagnóstico e prescrição', 'Treino no período'];
const CARD_TITLES = ['Rotinas', 'Anamneses', /Volume por sessão|Atividade por dia/, 'Última observação do aluno', 'Sessões recentes', /^Progressão de carga/];
const SKELETONS_IN_ORDER = [
  'Carregando indicadores',
  'Carregando assinatura',
  'Carregando rotinas',
  'Carregando anamneses',
  'Carregando atividade',
  'Carregando observação',
  'Carregando sessões',
  'Carregando progressão',
];
const EMPTY_OR_MISSING_TEXTS = [
  'Aluno não encontrado',
  'Nunca',
  'Sem plano',
  'Sem plano ativo',
  'Sem rotinas ainda',
  'Sem anamneses vinculadas',
  'Sem sessões no período.',
  'Sem cargas registradas no período.',
  'Nenhuma observação nas sessões recentes.',
  'Sem rotina ativa',
];

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
};

let pending;

const setupMocks = () => {
  vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'trainer-1', firstName: 'João', lastName: 'Lucas' }, hasRole: (role) => role === 'TRAINER' });
  vi.mocked(useAiChat).mockReturnValue({ startConversation: vi.fn() });
  pending = new Map();
  api.get.mockImplementation((url) => {
    const request = deferred();
    pending.set(url, request);
    return request.promise;
  });
};

const renderDetail = async () => {
  const view = renderWithRoute(<StudentDetail />, { route: STUDENT, path: '/trainer/students/:id' });
  // The dashboard hook fires one microtask after mount.
  await waitFor(() => expect([...pending.keys()].sort()).toEqual([...ALL_URLS].sort()));
  return view;
};

const resolveUrl = async (url) => {
  await act(async () => { pending.get(url).resolve({ data: RESPONSES[url] }); });
};

const statusNames = () => screen.queryAllByRole('status').map((status) => status.getAttribute('aria-label'));

const expectEverySectionInPlace = () => {
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(SECTION_TITLES);
  CARD_TITLES.forEach((name) => expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument());
};

const isOverviewSettled = (resolved) => OVERVIEW_URLS.every((url) => resolved.has(url));

/** Metrics + hero context resolve all at once: skeleton until the last overview source answers. */
const expectOverviewAllOrNothing = (resolved) => {
  const settled = isOverviewSettled(resolved);
  expect(statusNames().includes('Carregando indicadores')).toBe(!settled);
  expect(Boolean(screen.queryByText('Aderência do mês'))).toBe(settled);
  expect(Boolean(screen.queryByText('Última sessão'))).toBe(settled);
  expect(Boolean(screen.queryByText('Rotina Ativa · Consultoria Mensal'))).toBe(settled);
};

/** Empty states only once their own source answered. */
const expectNoEarlyEmptyState = (resolved) => {
  if (!isOverviewSettled(resolved)) expect(screen.queryByText('Nunca')).not.toBeInTheDocument();
  if (!resolved.has(ANAMNESES)) expect(screen.queryByText('Sem anamneses vinculadas')).not.toBeInTheDocument();
  if (!DASHBOARD_URLS.every((url) => resolved.has(url))) {
    expect(screen.queryByText('Sem cargas registradas no período.')).not.toBeInTheDocument();
  }
  expect(screen.queryByText('Aluno não encontrado')).not.toBeInTheDocument();
};

// 4 orders × 11 steps of full-page queries: well above the 5s default on a loaded CI box.
const ORDER_TEST_TIMEOUT_MS = 60000;

const ORDERS = {
  'declaration order': ALL_URLS,
  'reverse order': [...ALL_URLS].reverse(),
  'billing first, student profile last': [PAYMENTS, ACTIVE, PLANS, FEEDBACKS, ANAMNESES, SUMMARY, PROTOCOLS, RECENT, DAILY, PROGRESSION, STUDENT],
  'dashboard last': [STUDENT, PROTOCOLS, ACTIVE, ANAMNESES, PAYMENTS, PLANS, FEEDBACKS, DAILY, RECENT, PROGRESSION, SUMMARY],
};

describe('StudentDetail — page assembly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pinFinanceClock();
    setupMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('fires every independent request in parallel on mount (no waterfall)', async () => {
    await renderDetail();
    expect(api.get).toHaveBeenCalledTimes(ALL_URLS.length);
  });

  it('shows every section with its skeleton, in order, while requests are pending', async () => {
    await renderDetail();

    expectEverySectionInPlace();
    expect(screen.getByRole('heading', { level: 1, name: 'Carregando aluno' })).toBeInTheDocument();
    expect(statusNames()).toEqual(SKELETONS_IN_ORDER);
    EMPTY_OR_MISSING_TEXTS.forEach((text) => expect(screen.queryByText(text)).not.toBeInTheDocument());
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });

  it('reaches the same final DOM in any response order, with no section missing in between', async () => {
    const finalDoms = [];

    for (const order of Object.values(ORDERS)) {
      setupMocks();
      const { container, unmount } = await renderDetail();
      const resolved = new Set();
      for (const url of order) {
        await resolveUrl(url);
        resolved.add(url);
        expectEverySectionInPlace();
        expectOverviewAllOrNothing(resolved);
        expectNoEarlyEmptyState(resolved);
      }
      expect(statusNames()).toEqual([]);
      expect(screen.getByRole('heading', { level: 1, name: 'Aluno Exemplo' })).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('“Semana corrida”')).toBeInTheDocument();
      finalDoms.push(container.innerHTML);
      unmount();
    }

    finalDoms.slice(1).forEach((dom) => expect(dom).toBe(finalDoms[0]));
  }, ORDER_TEST_TIMEOUT_MS);

  it('keeps the metrics on skeletons until the plan name is final when payments do not carry it', async () => {
    RESPONSES[PAYMENTS] = { ...RESPONSES[PAYMENTS], payments: [] };
    try {
      await renderDetail();
      for (const url of OVERVIEW_URLS) await resolveUrl(url);
      expect(statusNames()).toContain('Carregando indicadores');
      expect(screen.queryByText(/Plano/)).not.toBeInTheDocument();

      await resolveUrl(PLANS);
      expect(statusNames()).not.toContain('Carregando indicadores');
      expect(screen.getByText('Rotina Ativa · Consultoria Mensal')).toBeInTheDocument();
    } finally {
      RESPONSES[PAYMENTS] = { ...RESPONSES[PAYMENTS], payments: [makePayment()] };
    }
  });
});
