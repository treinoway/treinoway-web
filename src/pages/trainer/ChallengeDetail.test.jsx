import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import ChallengeDetail from './ChallengeDetail';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../components/consistency/StudentPanel', () => ({
  default: ({ studentId, studentName, onClose }) => (
    <div role="dialog" aria-label="Painel do aluno">
      <span>{`${studentId} · ${studentName}`}</span>
      <button type="button" onClick={onClose}>Fechar painel</button>
    </div>
  ),
}));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockChallenge = {
  id: 'ch-1',
  name: 'Verao 2026',
  startDate: '2099-06-01',
  endDate: '2099-06-30',
  status: 'scheduled',
  format: 'dates',
  participantMode: 'all',
  filterCriteria: null,
  cancelledAt: null,
  participantCount: 5,
  ptsWorkoutCompleted: 10,
  ptsStreak7Days: 50,
  ptsStreak30Days: 250,
  ptsDailyCheckin: 2,
  ptsEvolutionRecord: 15,
  ptsWorkoutFeedback: 5,
  dailyPointsCap: null,
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: null,
};

const mockRanking = [
  { position: 1, studentId: 's1', firstName: 'Ana', lastName: 'X', avatarUrl: null, points: 80, workouts: 8, bonusPoints: 0, pointsThisWeek: 10, streakDays: 3 },
  { position: 2, studentId: 's2', firstName: 'Bob', lastName: 'Y', avatarUrl: null, points: 50, workouts: 5, bonusPoints: 0, pointsThisWeek: 0, streakDays: 0 },
];

const mockParticipants = [{ id: 'p1', studentId: 's1', firstName: 'Ana', lastName: 'X', avatarUrl: null, addedAt: '2026-05-02T12:00:00Z' }];

// GET responses of a dates championship page
const mockDatesApi = (challenge = mockChallenge, { participants = [] } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/challenges/ch-1') return Promise.resolve({ data: challenge });
    if (url === '/trainer/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
    if (url === '/trainer/challenges/ch-1/participants') return Promise.resolve({ data: participants });
    if (url === '/trainer/students') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
};

// Renders the detail page of the dates championship
const renderDates = (route = '/trainer/challenges/ch-1') => renderWithRoute(<ChallengeDetail />, { route, path: '/trainer/challenges/:id' });

// Labels of the detail tabs in order
const tabLabels = () => screen.getAllByRole('tab').map((tab) => tab.textContent);

// XP table of the ranking
const pointsTable = () => screen.getByRole('region', { name: 'Classificação por pontos' });

describe('ChallengeDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({ hasRole: () => false });
    api.get.mockReset();
    api.delete.mockReset();
    mockDatesApi();
  });

  it('renders challenge details and 3 tabs', async () => {
    renderDates();

    expect(await screen.findByRole('heading', { level: 1, name: 'Verao 2026' })).toBeInTheDocument();
    expect(screen.getByText('Agendado')).toBeInTheDocument();
    expect(tabLabels()).toEqual(['Ranking', 'Participantes', 'Configurações']);
    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders ranking entries on ranking tab', async () => {
    renderDates();

    await screen.findByRole('region', { name: 'Classificação por pontos' });
    expect(within(pointsTable()).getByText('Ana X')).toBeInTheDocument();
    expect(within(pointsTable()).getByText('Bob Y')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Pódio' })).toBeInTheDocument();
  });

  it('shows danger zone with Excluir campeonato and the scoring rules when challenge is scheduled', async () => {
    const user = userEvent.setup();
    renderDates();
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });

    await user.click(screen.getByRole('tab', { name: 'Configurações' }));

    expect(await screen.findByRole('heading', { name: 'Zona de perigo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir campeonato' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Regras de pontuação' })).toBeInTheDocument();
  });

  it('CPD-42 keeps the save button enabled before any config change, as the design system draws it', async () => {
    const user = userEvent.setup();
    renderDates();
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });

    await user.click(screen.getByRole('tab', { name: 'Configurações' }));

    expect(await screen.findByRole('button', { name: 'Salvar configuração' })).toBeEnabled();
  });

  it('enables save button when name is changed', async () => {
    const user = userEvent.setup();
    renderDates();
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });
    await user.click(screen.getByRole('tab', { name: 'Configurações' }));

    const nameInput = await screen.findByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Novo nome');

    expect(screen.getByRole('button', { name: 'Salvar configuração' })).toBeEnabled();
  });

  it('CPD-43 locks the scoring rules of an active challenge', async () => {
    const user = userEvent.setup();
    mockDatesApi({ ...mockChallenge, status: 'active' });
    renderDates();
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });

    await user.click(screen.getByRole('tab', { name: 'Configurações' }));

    expect(await screen.findByText('Não é possível alterar as regras com o campeonato em andamento.')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Treino concluído' })).toBeDisabled();
  });

  it('does not show danger zone for completed challenge', async () => {
    const user = userEvent.setup();
    mockDatesApi({ ...mockChallenge, status: 'completed' });
    renderDates();
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });

    await user.click(screen.getByRole('tab', { name: 'Configurações' }));

    expect(await screen.findByLabelText('Nome')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar configuração' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Zona de perigo' })).not.toBeInTheDocument();
  });

  it('CPD-46 shows the closed notice and the final ranking of a completed dates challenge', async () => {
    mockDatesApi({ ...mockChallenge, status: 'completed' });
    renderDates();

    expect(await screen.findByRole('note')).toHaveTextContent('Campeonato encerrado em 30/06. O ranking é final e não pode ser editado.');
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dar bônus' })).not.toBeInTheDocument();
    expect(await screen.findByText('Classificação final')).toBeInTheDocument();
  });

  it('opens StudentBonusSheet from the ranking row menu and gives the bonus', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: {} });
    renderDates();
    await screen.findByRole('region', { name: 'Classificação por pontos' });

    const menuTrigger = screen.getByRole('button', { name: 'Ações para Ana X' });
    await user.click(menuTrigger);
    await user.click(within(menuTrigger.parentElement).getByRole('button', { name: 'Dar bônus' }));
    expect(await screen.findByText('Conceder bônus')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Conceder 25 pontos' }));

    expect(api.post).toHaveBeenCalledWith('/trainer/challenges/ch-1/students/s1/bonus', { points: 25 });
    await waitFor(() => expect(screen.queryByText('Conceder bônus')).not.toBeInTheDocument());
    expect(mockShowToast).toHaveBeenCalledWith('Bônus de +25 pts enviado.', 'success');
  });

  it('CPD-39 opens the bulk selection from the header Dar bônus', async () => {
    const user = userEvent.setup();
    mockDatesApi({ ...mockChallenge, status: 'active' });
    renderDates('/trainer/challenges/ch-1?tab=participants');
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });

    await user.click(screen.getByRole('button', { name: 'Dar bônus' }));

    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Selecione quem recebe o bônus' })).toBeInTheDocument();
  });

  it('shows participants tab with the add button', async () => {
    const user = userEvent.setup();
    mockDatesApi(mockChallenge, { participants: mockParticipants });
    renderDates();
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });

    await user.click(screen.getByRole('tab', { name: 'Participantes' }));

    expect(await screen.findByText('Entrou em 02/05/2026 · 80 pts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar participantes' })).toBeInTheDocument();
  });

  it('shows the remove button for each participant', async () => {
    const user = userEvent.setup();
    mockDatesApi(mockChallenge, { participants: mockParticipants });
    renderDates();
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });

    await user.click(screen.getByRole('tab', { name: 'Participantes' }));

    expect(await screen.findByRole('button', { name: 'Remover Ana X' })).toBeInTheDocument();
  });

  it('shows remove confirm dialog when remove action is selected and removes the participant', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    mockDatesApi(mockChallenge, { participants: mockParticipants });
    renderDates();
    await screen.findByRole('heading', { level: 1, name: 'Verao 2026' });
    await user.click(screen.getByRole('tab', { name: 'Participantes' }));

    await user.click(await screen.findByRole('button', { name: 'Remover Ana X' }));
    expect(await screen.findByText('Remover Ana X do campeonato?')).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remover' }));

    expect(api.delete).toHaveBeenCalledWith('/trainer/challenges/ch-1/participants/s1');
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Participante removido.', 'success'));
  });

  it('CPD-49 shows the back link and skeleton rows while the championship loads', async () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderDates();

    expect(screen.getByRole('button', { name: 'Campeonatos' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando campeonato' })).toBeInTheDocument();
    expect(screen.queryByText('Campeonato não encontrado.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('CPD-49 shows the name and dates the list handed over while the championship loads', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const fromList = { id: 'ch-1', name: 'Campeonato do Mês', startDate: '2026-09-01', endDate: '2026-09-30', participantCount: 18 };
    renderDates({ pathname: '/trainer/challenges/ch-1', search: '?tab=ranking', state: { challenge: fromList } });

    expect(screen.getByRole('heading', { level: 1, name: 'Campeonato do Mês' })).toBeInTheDocument();
    expect(screen.getByText('01/09 – 30/09/2026 · 18 participantes')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando campeonato' })).toBeInTheDocument();
  });

  it('CPD-49 ignores a championship handed over for another id while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const other = { id: 'ch-9', name: 'Outro campeonato', startDate: '2026-09-01', endDate: '2026-09-30', participantCount: 3 };
    renderDates({ pathname: '/trainer/challenges/ch-1', state: { challenge: other } });

    expect(screen.queryByRole('heading', { name: 'Outro campeonato' })).not.toBeInTheDocument();
  });

  it('CPD-50 shows "Campeonato não encontrado." with Voltar para campeonatos', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValue({ response: { status: 404 }, userMessage: 'Recurso não encontrado.' });
    renderDates();

    expect(await screen.findByRole('heading', { name: 'Campeonato não encontrado.' })).toBeInTheDocument();
    expect(screen.getByText('Ele pode ter sido excluído ou o link está incorreto.')).toBeInTheDocument();
    expect(mockShowToast).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Voltar para campeonatos' }));
    expect(screen.queryByRole('heading', { name: 'Campeonato não encontrado.' })).not.toBeInTheDocument();
  });

  it("CPD-50 shows the not-found block without an error toast for another trainer's championship (403)", async () => {
    api.get.mockRejectedValue({ response: { status: 403 }, userMessage: 'Você não tem permissão para acessar este recurso.' });
    renderDates();

    expect(await screen.findByRole('heading', { name: 'Campeonato não encontrado.' })).toBeInTheDocument();
    expect(screen.getByText('Ele pode ter sido excluído ou o link está incorreto.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar para campeonatos' })).toBeInTheDocument();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

const ORIGINAL_URL = window.location.href;

const weeklyChallenge = {
  ...mockChallenge,
  id: 'w-1',
  name: 'Verão Semanal',
  status: 'active',
  format: 'weeks',
  startDate: '2026-11-02',
  endDate: '2026-11-29',
  weeks: 4,
  currentWeek: 3,
  minPodiumWeeks: 2,
  description: 'Prêmio: camiseta',
  visibility: 'full',
  ownerType: 'trainer',
  closeRequestedAt: null,
  closedAt: null,
  weights: { workouts: 30, diet: 30, cardio: 15, feedback: 15, hydration: 10 },
  activePillars: ['workouts', 'cardio', 'feedback', 'hydration'],
};

const weeklyConsistency = {
  challenge: { ...weeklyChallenge, participantCount: 2 },
  status: 'active',
  currentWeek: 3,
  closesAt: '2026-11-23T00:00:00Z',
  rows: [
    { studentId: 's1', name: 'Ana Lima', displayName: 'Ana L.', initials: 'AL', position: 1, eligible: true, faixa: 'constant', average: 95, validWeeks: 2, weeks100: 1, streak: 3, currentWeekScore: 80, weekStatus: 'valid', entering: null, weeksMissing: 0 },
  ],
  entering: [],
  summary: { classified: 1, entering: 0, leaderAverage: 95, leaderLead: null, championshipAverage: 95 },
  privacyCounts: { name: 1, anonymous: 0, pending: 1 },
};

// GET responses of a weekly championship page
const mockWeeklyApi = (challenge = weeklyChallenge) => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/challenges/w-1') return Promise.resolve({ data: challenge });
    if (url === '/trainer/challenges/w-1/consistency') return Promise.resolve({ data: weeklyConsistency });
    if (url === '/trainer/challenges/w-1/ranking') return Promise.resolve({ data: mockRanking });
    if (url === '/trainer/challenges/w-1/participants') return Promise.resolve({ data: [] });
    if (url === '/trainer/consistency-ranking/config') return Promise.resolve({ data: { timeZone: 'America/Sao_Paulo', minPodiumWeeks: 2 } });
    if (url === '/trainer/students') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
};

// Renders the detail page of the weekly championship
const renderWeekly = (route = '/trainer/challenges/w-1') => renderWithRoute(<ChallengeDetail />, { route, path: '/trainer/challenges/:id' });

// Whether the API was asked for the given URL
const requested = (url) => api.get.mock.calls.some(([calledUrl]) => calledUrl === url);

describe('ChallengeDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({ hasRole: () => false });
    mockWeeklyApi();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
  });

  it('CPD-31 shows Ranking, Pontos, Participantes and Configurações for a weekly championship and no Pontos for a dates one', async () => {
    const { unmount } = renderWeekly();

    expect(await screen.findByRole('button', { name: 'Ana L.' })).toBeInTheDocument();
    expect(tabLabels()).toEqual(['Ranking', 'Pontos', 'Participantes', 'Configurações']);
    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveClass('ds-tabs__item--active');
    expect(screen.getByText('3 de 4')).toBeInTheDocument();
    expect(screen.getByText('Prêmio: camiseta')).toBeInTheDocument();
    expect(requested('/trainer/challenges/w-1/consistency')).toBe(true);
    expect(requested('/trainer/challenges/w-1/ranking')).toBe(false);
    unmount();

    mockWeeklyApi({ ...weeklyChallenge, format: 'dates', weeks: null, currentWeek: null, minPodiumWeeks: null });
    renderWeekly();
    await screen.findByRole('region', { name: 'Classificação por pontos' });
    expect(tabLabels()).toEqual(['Ranking', 'Participantes', 'Configurações']);
  });

  it('CAMP-53 opens the student panel from a row', async () => {
    const user = userEvent.setup();
    renderWeekly();

    await user.click(await screen.findByRole('button', { name: 'Ana L.' }));

    const panel = await screen.findByRole('dialog', { name: 'Painel do aluno' });
    expect(panel).toHaveTextContent('s1');
    expect(panel).toHaveTextContent('Ana Lima');
    await user.click(within(panel).getByRole('button', { name: 'Fechar painel' }));
    expect(screen.queryByRole('dialog', { name: 'Painel do aluno' })).not.toBeInTheDocument();
  });

  it('CPD-38 shows the points ranking of a weekly championship without the podium', async () => {
    const user = userEvent.setup();
    renderWeekly();
    await screen.findByRole('button', { name: 'Ana L.' });

    await user.click(screen.getByRole('tab', { name: 'Pontos' }));

    await screen.findByRole('region', { name: 'Classificação por pontos' });
    expect(within(pointsTable()).getByText('Ana X')).toBeInTheDocument();
    expect(within(pointsTable()).getByText('Bob Y')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pódio' })).not.toBeInTheDocument();
    expect(requested('/trainer/challenges/w-1/ranking')).toBe(true);
  });

  it('CAMP-58 keeps the dates championship without the consistency standings', async () => {
    mockWeeklyApi({ ...weeklyChallenge, format: 'dates', weeks: null, currentWeek: null, minPodiumWeeks: null });
    renderWeekly();

    await screen.findByRole('region', { name: 'Classificação por pontos' });
    expect(tabLabels()).toEqual(['Ranking', 'Participantes', 'Configurações']);
    expect(screen.queryByRole('tab', { name: 'Pontos' })).not.toBeInTheDocument();
    expect(requested('/trainer/challenges/w-1/consistency')).toBe(false);
  });

  it('CAMP-69 shows a weekly championship without the consistency standings to a non-admin in production', async () => {
    vi.stubEnv('DEV', false);
    globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/' });
    renderWeekly();

    await screen.findByRole('region', { name: 'Classificação por pontos' });
    expect(tabLabels()).toEqual(['Ranking', 'Participantes', 'Configurações']);
    expect(requested('/trainer/challenges/w-1/consistency')).toBe(false);
  });

  it('CPD-51 shows the Cancelado tag and the cancelled notice with read-only tabs', async () => {
    const user = userEvent.setup();
    mockWeeklyApi({ ...weeklyChallenge, status: 'cancelled', cancelledAt: '2026-11-10T12:00:00Z' });
    renderWeekly();

    expect(await screen.findByRole('heading', { name: 'Campeonato cancelado, sem classificação.' })).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dar bônus' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pódio' })).not.toBeInTheDocument();
    expect(requested('/trainer/challenges/w-1/consistency')).toBe(false);

    await user.click(screen.getByRole('tab', { name: 'Pontos' }));
    await screen.findByRole('region', { name: 'Classificação por pontos' });
    expect(screen.queryByRole('button', { name: 'Seleção em massa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ações para/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Participantes' }));
    await screen.findByRole('heading', { name: '0 alunos no campeonato' });
    expect(screen.queryByRole('button', { name: 'Adicionar participantes' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Configurações' }));
    expect(await screen.findByLabelText('Nome')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar configuração' })).not.toBeInTheDocument();
  });

  it('CAMP-42 ends a running weekly championship early from Configurações', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { ...weeklyChallenge, closeRequestedAt: '2026-11-18T12:00:00Z', endDate: '2026-11-22', weeks: 3, closesAt: '2026-11-23T00:00:00Z' } });
    renderWeekly();
    await screen.findByRole('button', { name: 'Ana L.' });

    await user.click(screen.getByRole('tab', { name: 'Configurações' }));
    await user.click(screen.getByRole('button', { name: 'Encerrar campeonato' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Encerrar campeonato' }));

    expect(api.post).toHaveBeenCalledWith('/trainer/challenges/w-1/close');
    expect(await screen.findByText('Encerra no fechamento de 22/11, às 21h.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar campeonato' })).not.toBeInTheDocument();
  });

  it('CAMP-42 shows the hour of the close when the detail opens on Configurações after an early close', async () => {
    mockWeeklyApi({ ...weeklyChallenge, closeRequestedAt: '2026-11-18T12:00:00Z', endDate: '2026-11-22', weeks: 3 });
    renderWeekly('/trainer/challenges/w-1?tab=config');

    expect(await screen.findByText('Encerra no fechamento de 22/11, às 21h.')).toBeInTheDocument();
    expect(screen.queryByText('Encerra no fechamento de 22/11.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar campeonato' })).not.toBeInTheDocument();
  });

  it('CPD-42 saves the settings of a weekly championship and shows "Configuração salva."', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: { ...weeklyChallenge, name: 'Verão Semanal 2' } });
    renderWeekly('/trainer/challenges/w-1?tab=settings');

    await user.type(await screen.findByLabelText('Nome'), ' 2');
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(api.patch).toHaveBeenCalledWith('/trainer/challenges/w-1', { name: 'Verão Semanal 2' });
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    expect(screen.getByRole('heading', { level: 1, name: 'Verão Semanal 2' })).toBeInTheDocument();
  });

  it('APP-36 shows the privacy counts of the championship on Configurações', async () => {
    renderWeekly('/trainer/challenges/w-1?tab=settings');

    const group = await screen.findByRole('group', { name: 'Visibilidade no app' });
    await waitFor(() => expect(within(group).getByRole('note')).toHaveTextContent('Hoje: 1 escolheu aparecer com nome, 0 como Aluno do time, 1 ainda não respondeu.'));
    expect(requested('/trainer/challenges/w-1/consistency')).toBe(true);
  });

  it('CAMP-59 asks before leaving Configurações with unsaved changes', async () => {
    const user = userEvent.setup();
    renderWeekly();
    await screen.findByRole('button', { name: 'Ana L.' });
    await user.click(screen.getByRole('tab', { name: 'Configurações' }));

    await user.type(screen.getByLabelText('Nome'), ' editado');
    await user.click(screen.getByRole('tab', { name: 'Pontos' }));

    expect(screen.getByText('Há mudanças não salvas. Descartar e sair?')).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Verão Semanal editado');

    await user.click(screen.getByRole('tab', { name: 'Pontos' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));
    await screen.findByRole('region', { name: 'Classificação por pontos' });
    expect(within(pointsTable()).getByText('Ana X')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });
});
