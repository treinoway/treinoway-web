import { screen, within } from '@testing-library/react';
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
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  status: 'scheduled',
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

const mockConfig = {
  ptsWorkoutCompleted: 10,
  ptsStreak7Days: 50,
  ptsStreak30Days: 250,
  ptsDailyCheckin: 2,
  ptsEvolutionRecord: 15,
  ptsWorkoutFeedback: 5,
  dailyPointsCap: null,
};

const mockRanking = [
  { position: 1, studentId: 's1', firstName: 'Ana', lastName: 'X', avatarUrl: null, points: 80 },
  { position: 2, studentId: 's2', firstName: 'Bob', lastName: 'Y', avatarUrl: null, points: 50 },
];

describe('ChallengeDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({ hasRole: () => false });
    api.get.mockReset();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/challenges/ch-1') return Promise.resolve({ data: mockChallenge });
      if (url === '/trainer/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
      if (url === '/trainer/challenges/ch-1/participants') return Promise.resolve({ data: [] });
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
  });

  it('renders challenge details and 3 tabs', async () => {
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    expect(await screen.findByText('Verao 2026')).toBeInTheDocument();
    expect(screen.getByText('Agendado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ranking' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Participantes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('renders ranking entries on ranking tab', async () => {
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    expect(await screen.findByText('Ana X')).toBeInTheDocument();
    expect(screen.getByText('Bob Y')).toBeInTheDocument();
  });

  it('shows danger zone with Excluir campeonato and points summary when challenge is scheduled', async () => {
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    const user = userEvent.setup();
    await screen.findByText('Verao 2026');
    await user.click(screen.getByRole('button', { name: 'Configurações' }));
    expect(await screen.findByText('Zona de perigo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir campeonato' })).toBeInTheDocument();
    expect(screen.getByText('Pontuação')).toBeInTheDocument();
  });

  it('disables save button when no config changes have been made', async () => {
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    const user = userEvent.setup();
    await screen.findByText('Verao 2026');
    await user.click(screen.getByRole('button', { name: 'Configurações' }));
    const saveBtn = await screen.findByRole('button', { name: 'Salvar configuração' });
    expect(saveBtn).toBeDisabled();
  });

  it('enables save button when name is changed', async () => {
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    const user = userEvent.setup();
    await screen.findByText('Verao 2026');
    await user.click(screen.getByRole('button', { name: 'Configurações' }));
    const nameInput = await screen.findByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Novo nome');
    const saveBtn = screen.getByRole('button', { name: 'Salvar configuração' });
    expect(saveBtn).not.toBeDisabled();
  });

  it('shows points summary without chevron for active challenge (not editable)', async () => {
    const activeChallenge = { ...mockChallenge, status: 'active' };
    api.get.mockImplementation((url) => {
      if (url === '/trainer/challenges/ch-1') return Promise.resolve({ data: activeChallenge });
      if (url === '/trainer/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
      if (url === '/trainer/challenges/ch-1/participants') return Promise.resolve({ data: [] });
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
    const user = userEvent.setup();
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    await screen.findByText('Verao 2026');
    await user.click(screen.getByRole('button', { name: 'Configurações' }));
    expect(await screen.findByText('Pontuação')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pontuação/i })).not.toBeInTheDocument();
  });

  it('does not show danger zone for completed challenge', async () => {
    const completedChallenge = { ...mockChallenge, status: 'completed' };
    api.get.mockImplementation((url) => {
      if (url === '/trainer/challenges/ch-1') return Promise.resolve({ data: completedChallenge });
      if (url === '/trainer/challenges/ch-1/ranking') return Promise.resolve({ data: [] });
      if (url === '/trainer/challenges/ch-1/participants') return Promise.resolve({ data: [] });
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
    const user = userEvent.setup();
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    await screen.findByText('Verao 2026');
    await user.click(screen.getByRole('button', { name: 'Configurações' }));
    await screen.findByRole('button', { name: 'Salvar configuração' });
    expect(screen.queryByText('Zona de perigo')).not.toBeInTheDocument();
  });

  it('opens StudentBonusSheet when tapping a ranking row', async () => {
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    const user = userEvent.setup();
    const anaRow = await screen.findByText('Ana X');
    await user.click(anaRow.closest('.ranking-row'));
    expect(await screen.findByText('Conceder bônus')).toBeInTheDocument();
  });

  it('shows participants tab with add and select buttons', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/challenges/ch-1') return Promise.resolve({ data: mockChallenge });
      if (url === '/trainer/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
      if (url === '/trainer/challenges/ch-1/participants') return Promise.resolve({
        data: [{ id: 'p1', studentId: 's1', firstName: 'Ana', lastName: 'X', points: 80 }],
      });
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
    const user = userEvent.setup();
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    await screen.findByText('Verao 2026');
    await user.click(screen.getByRole('button', { name: 'Participantes' }));
    expect(await screen.findByText('Ana X')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar' })).toBeInTheDocument();
  });

  it('shows row menu for each participant', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/challenges/ch-1') return Promise.resolve({ data: mockChallenge });
      if (url === '/trainer/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
      if (url === '/trainer/challenges/ch-1/participants') return Promise.resolve({
        data: [{ id: 'p1', studentId: 's1', firstName: 'Ana', lastName: 'X', points: 80 }],
      });
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
    const user = userEvent.setup();
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    await screen.findByText('Verao 2026');
    await user.click(screen.getByRole('button', { name: 'Participantes' }));
    await screen.findByText('Ana X');
    const menuTrigger = screen.getByRole('button', { name: 'Ações para Ana X' });
    expect(menuTrigger).toBeInTheDocument();
    await user.click(menuTrigger);
    expect(screen.getByRole('button', { name: 'Remover do campeonato' })).toBeInTheDocument();
  });

  it('shows remove confirm dialog when remove action is selected', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/challenges/ch-1') return Promise.resolve({ data: mockChallenge });
      if (url === '/trainer/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
      if (url === '/trainer/challenges/ch-1/participants') return Promise.resolve({
        data: [{ id: 'p1', studentId: 's1', firstName: 'Ana', lastName: 'X', points: 80 }],
      });
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
    const user = userEvent.setup();
    renderWithRoute(<ChallengeDetail />, {
      route: '/trainer/challenges/ch-1',
      path: '/trainer/challenges/:id',
    });
    await screen.findByText('Verao 2026');
    await user.click(screen.getByRole('button', { name: 'Participantes' }));
    await screen.findByText('Ana X');
    await user.click(screen.getByRole('button', { name: 'Ações para Ana X' }));
    await user.click(screen.getByRole('button', { name: 'Remover do campeonato' }));
    expect(await screen.findByText('Remover Ana X do campeonato?')).toBeInTheDocument();
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
    if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
};

// Renders the detail page of the weekly championship
const renderWeekly = () => renderWithRoute(<ChallengeDetail />, { route: '/trainer/challenges/w-1', path: '/trainer/challenges/:id' });

// Labels of the detail tabs in order
const tabLabels = () => screen.getAllByRole('button').filter((button) => button.className.includes('segmented-toggle-btn')).map((button) => button.textContent);

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

  it('CAMP-50 opens a weekly championship on Classificação with four tabs', async () => {
    renderWeekly();

    expect(await screen.findByRole('button', { name: 'Ana L.' })).toBeInTheDocument();
    expect(tabLabels()).toEqual(['Classificação', 'Pontos', 'Participantes', 'Configuração']);
    expect(screen.getByRole('button', { name: 'Classificação' })).toHaveClass('segmented-toggle-btn--active');
    expect(screen.getByText('3 de 4')).toBeInTheDocument();
    expect(requested('/trainer/challenges/w-1/consistency')).toBe(true);
    expect(requested('/trainer/challenges/w-1/ranking')).toBe(false);
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

  it('CAMP-54 shows the points ranking without podium medals', async () => {
    const user = userEvent.setup();
    renderWeekly();
    await screen.findByRole('button', { name: 'Ana L.' });

    await user.click(screen.getByRole('button', { name: 'Pontos' }));

    expect(await screen.findByText('Ana X')).toBeInTheDocument();
    expect(screen.getByText('80 pts')).toBeInTheDocument();
    expect(screen.getByText('Bob Y')).toBeInTheDocument();
    const rows = within(screen.getByRole('list', { name: 'Ranking' })).getAllByRole('button');
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row.querySelector('.ranking-position svg')).toBeNull());
    expect(requested('/trainer/challenges/w-1/ranking')).toBe(true);
  });

  it('CAMP-58 keeps the dates championship without Classificação', async () => {
    mockWeeklyApi({ ...weeklyChallenge, format: 'dates', weeks: null, currentWeek: null, minPodiumWeeks: null });
    renderWeekly();

    expect(await screen.findByText('Ana X')).toBeInTheDocument();
    expect(tabLabels()).toEqual(['Ranking', 'Participantes', 'Configurações']);
    expect(screen.queryByRole('button', { name: 'Classificação' })).not.toBeInTheDocument();
    expect(requested('/trainer/challenges/w-1/consistency')).toBe(false);
  });

  it('CAMP-69 shows a weekly championship without Classificação to a non-admin in production', async () => {
    vi.stubEnv('DEV', false);
    globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/' });
    renderWeekly();

    expect(await screen.findByText('Ana X')).toBeInTheDocument();
    expect(tabLabels()).toEqual(['Ranking', 'Participantes', 'Configurações']);
    expect(requested('/trainer/challenges/w-1/consistency')).toBe(false);
  });

  it('CAMP-42 ends a running weekly championship early from Configuração', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { ...weeklyChallenge, closeRequestedAt: '2026-11-18T12:00:00Z', endDate: '2026-11-22', weeks: 3, closesAt: '2026-11-23T00:00:00Z' } });
    renderWeekly();
    await screen.findByRole('button', { name: 'Ana L.' });

    await user.click(screen.getByRole('button', { name: 'Configuração' }));
    await user.click(screen.getByRole('button', { name: 'Encerrar campeonato' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Encerrar campeonato' }));

    expect(api.post).toHaveBeenCalledWith('/trainer/challenges/w-1/close');
    expect(await screen.findByText('Encerra no fechamento de 22/11, às 21h.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar campeonato' })).not.toBeInTheDocument();
  });

  it('CAMP-42 shows the hour of the close when the detail opens on Configuração after an early close', async () => {
    mockWeeklyApi({ ...weeklyChallenge, closeRequestedAt: '2026-11-18T12:00:00Z', endDate: '2026-11-22', weeks: 3 });
    renderWithRoute(<ChallengeDetail />, { route: '/trainer/challenges/w-1?tab=config', path: '/trainer/challenges/:id' });

    expect(await screen.findByText('Encerra no fechamento de 22/11, às 21h.')).toBeInTheDocument();
    expect(screen.queryByText('Encerra no fechamento de 22/11.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar campeonato' })).not.toBeInTheDocument();
  });

  it('CAMP-59 asks before leaving Configuração with unsaved changes', async () => {
    const user = userEvent.setup();
    renderWeekly();
    await screen.findByRole('button', { name: 'Ana L.' });
    await user.click(screen.getByRole('button', { name: 'Configuração' }));

    await user.type(screen.getByLabelText('Nome'), ' editado');
    await user.click(screen.getByRole('button', { name: 'Pontos' }));

    expect(screen.getByText('Há mudanças não salvas. Descartar e sair?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Verão Semanal editado');

    await user.click(screen.getByRole('button', { name: 'Pontos' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Ana X')).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });
});
