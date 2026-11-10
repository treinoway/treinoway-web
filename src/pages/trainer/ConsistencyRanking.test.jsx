import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false, hasRole: () => false })),
}));
vi.mock('../../contexts/AiChatContext', () => ({
  AiChatProvider: ({ children }) => children,
  useAiChat: () => ({ loading: false, hasNewResponse: false }),
}));
vi.mock('../Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('../Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));

import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import App from '../../App';
import ConsistencyRanking from './ConsistencyRanking';

const BASE_URL = '/trainer/consistency-ranking';

const SEASON = {
  number: 3,
  status: 'active',
  startWeek: '2026-10-19',
  endWeek: '2026-11-09',
  weeks: 4,
  currentWeek: 3,
  closesAt: '2026-11-09T00:00:00.000Z',
};

const PILLARS = [
  { pillar: 'workouts', done: 4, expected: 4, adherence: 100 },
  { pillar: 'cardio', done: 2, expected: 4, adherence: 50 },
];

// Standings row with the fields of the trainer API; overrides replace any of them
const buildRow = (overrides = {}) => ({
  studentId: 'student-1',
  displayName: 'Ana Beatriz S.',
  initials: 'AS',
  position: 1,
  faixa: 'full',
  average: 100,
  currentWeekScore: 100,
  weeks100: 2,
  streak: 9,
  seasonPillars: PILLARS,
  risk: null,
  signals: [],
  pause: null,
  entering: null,
  ...overrides,
});

const ANA = buildRow();
const MARCOS = buildRow({ studentId: 'student-2', displayName: 'Marcos T.', position: 6, faixa: 'constant', average: 96, currentWeekScore: 50, weeks100: 0, streak: 0 });
const JOAO = buildRow({ studentId: 'student-3', displayName: 'João V.', position: 17, faixa: 'restarting', average: 61, currentWeekScore: 21, weeks100: 0, streak: 0, risk: { weeks: 2, scores: [64, 58] } });

// Standings payload of the service for the given rows
const buildStandings = (rows, counts = {}) => ({
  season: SEASON,
  summary: { teamAverage: 85, lastClosedWeekAverage: 84, fullLastWeek: 4, validLastWeek: 17, atRisk: 1, withSignal: 0 },
  counts: { all: 3, risk: 1, signal: 0, entering: 0, paused: 0, ...counts },
  rows,
  entering: [],
});

const PANEL = {
  studentId: 'student-3',
  firstName: 'João',
  whatsapp: '+55 11 99999-8888',
  displayName: 'João V.',
  initials: 'JV',
  position: 17,
  total: 18,
  average: 61,
  faixa: 'restarting',
  risk: { weeks: 2, scores: [64, 58] },
  pause: null,
  signals: [],
  seasonPillars: PILLARS,
  weakestPillar: 'cardio',
  riskLimit: 70,
  weeks: [
    { weekStart: '2026-10-19', number: 1, state: 'closed', status: 'valid', score: 64 },
    { weekStart: '2026-10-26', number: 2, state: 'closed', status: 'valid', score: 58 },
    { weekStart: '2026-11-02', number: 3, state: 'current', status: 'valid', score: 21 },
    { weekStart: '2026-11-09', number: 4, state: 'future', status: null, score: null },
  ],
  previousSeasons: [],
  lastContact: null,
};

const CONFIG = {
  weights: { workouts: 30, diet: 30, cardio: 15, feedback: 15, hydration: 10 },
  activePillars: ['workouts', 'cardio', 'feedback', 'hydration'],
  seasonWeeks: 4,
  minPodiumWeeks: 2,
  closeWeekday: 0,
  closeHour: 21,
  timeZone: 'America/Sao_Paulo',
  minWorkoutMinutes: 10,
  riskLimit: 70,
  riskWeeks: 2,
  batchCount: 5,
  batchMinutes: 30,
};

const HISTORY = { rows: [{ studentId: 'student-1', displayName: 'Ana Beatriz S.', validWeeks: 6, average: 97, weeks100: 4, longestStreak: 9 }] };
const SEASONS = { seasons: [{ number: 2, startWeek: '2026-09-21', endWeek: '2026-10-18', participants: 17, average: 82 }] };

// Routes every GET of the page by URL; `standings` may be a payload or a function of the request params
const mockApi = ({ standings = buildStandings([ANA, MARCOS, JOAO]), panel = PANEL } = {}) => {
  api.get.mockImplementation((url, options) => {
    if (url === `${BASE_URL}/standings`) {
      return Promise.resolve({ data: typeof standings === 'function' ? standings(options?.params ?? {}) : standings });
    }
    if (url === `${BASE_URL}/config`) return Promise.resolve({ data: CONFIG });
    if (url === `${BASE_URL}/history`) return Promise.resolve({ data: HISTORY });
    if (url === `${BASE_URL}/seasons`) return Promise.resolve({ data: SEASONS });
    if (url.startsWith(`${BASE_URL}/students/`)) return Promise.resolve({ data: panel });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Renders the page with a marker for the settings route
const renderPage = (route = '/trainer/consistency-ranking') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/trainer/consistency-ranking" element={<ConsistencyRanking />} />
        <Route path="/trainer/consistency-ranking/settings" element={<div>Settings Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for the first standings to be on screen
const waitForRows = () => screen.findByRole('button', { name: 'Ana Beatriz S.' });

describe('ConsistencyRanking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('PAN-01 shows the season, the summary and a row per student, and opens the settings', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitForRows();
    expect(screen.getByRole('heading', { level: 1, name: 'Ranking de Constância' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Temporada 3' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Resumo do time' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'João V.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pausar semana do time' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Configurar ranking' }));

    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('PAN-14 shows only the students at risk after "Ver lista"', async () => {
    mockApi({ standings: (params) => buildStandings(params.filter === 'risk' ? [JOAO] : [ANA, MARCOS, JOAO]) });
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Ver lista' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ana Beatriz S.' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'João V.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Em risco/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('PAN-27 keeps filter and search after closing the panel', async () => {
    mockApi({ standings: (params) => buildStandings(params.filter === 'risk' ? [JOAO] : [ANA, MARCOS, JOAO]) });
    const user = userEvent.setup();
    renderPage();
    await waitForRows();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar aluno' }), 'jo');
    await user.click(screen.getByRole('button', { name: /Em risco/ }));
    await user.click(await screen.findByRole('button', { name: 'João V.' }));

    const panel = await screen.findByRole('dialog', { name: 'João V.' });
    expect(await within(panel).findByText(/fecha domingo às 21h/)).toBeInTheDocument();
    expect(within(panel).getByText(/Temporada 3/)).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('searchbox', { name: 'Buscar aluno' })).toHaveValue('jo');
    expect(screen.getByRole('button', { name: /Em risco/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('PAN-04 opens the panel of a student from the WhatsApp action of the row', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Mensagem no WhatsApp para João V.' }));

    expect(await screen.findByRole('dialog', { name: 'João V.' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/students/student-3`);
  });

  it('PAN-31 refreshes badges and counters after a pause', async () => {
    const paused = buildRow({ ...MARCOS, pause: { weekStart: '2026-11-02', reason: 'viagem' } });
    let pausedAlready = false;
    mockApi({ standings: () => (pausedAlready ? buildStandings([ANA, paused, JOAO], { paused: 1 }) : buildStandings([ANA, MARCOS, JOAO])) });
    api.post.mockImplementation(() => {
      pausedAlready = true;
      return Promise.resolve({ data: { paused: true } });
    });
    const user = userEvent.setup();
    renderPage();
    await waitForRows();
    expect(screen.getByRole('button', { name: /Com semana pausada/ })).toHaveTextContent('0');

    await user.click(screen.getByRole('button', { name: 'Pausar semana de Marcos T.' }));
    const modal = await screen.findByRole('dialog');
    await user.type(within(modal).getByLabelText('Motivo (opcional)'), 'viagem');
    await user.click(within(modal).getByRole('button', { name: 'Pausar semana' }));

    expect(await screen.findByText('Semana 3 pausada (viagem)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Com semana pausada/ })).toHaveTextContent('1');
    expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/pauses`, { weekStart: '2026-11-02', studentId: 'student-2', reason: 'viagem' });
  });

  it('PAN-30 pauses the whole team without a student id', async () => {
    api.post.mockResolvedValue({ data: { paused: true } });
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Pausar semana do time' }));
    const modal = await screen.findByRole('dialog');
    await user.type(within(modal).getByLabelText('Motivo (opcional)'), 'feriado');
    await user.click(within(modal).getByRole('button', { name: 'Pausar semana do time' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`${BASE_URL}/pauses`, { weekStart: '2026-11-02', reason: 'feriado' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('PAN-18 clears filter and search from the empty state', async () => {
    mockApi({ standings: (params) => buildStandings(params.filter === 'signal' ? [] : [ANA, MARCOS, JOAO]) });
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: /Com sinal/ }));
    await user.click(await screen.findByRole('button', { name: 'Limpar filtro e busca' }));

    expect(await screen.findByRole('button', { name: 'Ana Beatriz S.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Todos/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('PAN-16 lists the general history on its tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('tab', { name: 'Histórico geral' }));

    expect(await screen.findByRole('region', { name: 'Histórico geral do time' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/history`, { params: {} });
  });

  it('PAN-17 opens the frozen standings of the season chosen on the previous seasons tab', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('tab', { name: 'Temporadas anteriores' }));
    await user.click(await screen.findByRole('button', { name: 'Ver classificação da Temporada 2' }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/standings`, { params: { filter: 'all', q: '', season: 2 } }));
    expect(await screen.findByRole('tab', { name: 'Temporada atual', selected: true })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ana Beatriz S.' })).toBeInTheDocument();
  });

  it('PAN-17 opens the season named in the query string', async () => {
    renderPage('/trainer/consistency-ranking?season=2');

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(`${BASE_URL}/standings`, { params: { filter: 'all', q: '', season: 2 } }));
  });

  it('PAN-53 shows the no-student state with the season', async () => {
    mockApi({ standings: buildStandings([], { all: 0, risk: 0 }) });
    renderPage();

    expect(await screen.findByText('Teu ranking aparece quando um aluno tiver plano ativo.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Temporada 3' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('PAN-54 shows skeletons while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status', { name: 'Carregando classificação' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('PAN-55 shows the API error with retry', async () => {
    let failing = true;
    api.get.mockImplementation((url) => {
      if (url === `${BASE_URL}/config`) return Promise.resolve({ data: CONFIG });
      if (failing) return Promise.reject({ userMessage: 'Não foi possível carregar o ranking.' });
      return Promise.resolve({ data: buildStandings([ANA]) });
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Não foi possível carregar o ranking.')).toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('button', { name: 'Ana Beatriz S.' })).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar o ranking.')).not.toBeInTheDocument();
  });

  it('PAN-56 is wrapped in the trainer protected route', () => {
    window.history.pushState({}, '', '/trainer/consistency-ranking');

    render(<App />);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ranking de Constância' })).not.toBeInTheDocument();
  });

  it('PAN-01 opens the page from the "Ranking de Constância" menu item', async () => {
    useAuth.mockReturnValue({
      user: { id: 'trainer-1', firstName: 'Tamyres', lastName: 'Lima', betaAccess: true, platformPlan: { tier: 'BETA', limits: {} } },
      isAuthenticated: true,
      hasRole: (role) => role === 'TRAINER',
      logout: vi.fn(),
    });
    window.history.pushState({}, '', '/');
    Element.prototype.scrollTo = vi.fn();
    const user = userEvent.setup();

    render(<App />);
    await screen.findByText('Dashboard Page');
    await user.click(screen.getAllByRole('link', { name: 'Ranking de Constância' })[0]);

    expect(await screen.findByRole('heading', { level: 1, name: 'Ranking de Constância' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ana Beatriz S.' })).toBeInTheDocument();
  });
});
