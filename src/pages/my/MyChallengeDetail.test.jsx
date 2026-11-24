import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, renderWithRoute, screen, waitFor, within } from '../../test/test-utils';
import MyChallengeDetail from './MyChallengeDetail';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), put: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const ME = 'me';

const mockChallenge = {
  id: 'ch-1', name: 'Verao', startDate: '2026-06-01', endDate: '2026-06-30', status: 'active',
  participantMode: 'all', filterCriteria: null, cancelledAt: null, participantCount: 3,
  createdAt: '2026-05-01T00:00:00Z', updatedAt: null,
};

const mockRanking = {
  entries: [
    { position: 1, studentId: 's2', firstName: 'Juliana', lastName: 'Martins', avatarUrl: null, points: 486 },
    { position: 2, studentId: 's3', firstName: 'Pedro', lastName: 'Souza', avatarUrl: null, points: 412 },
    { position: 3, studentId: ME, firstName: 'Lucas', lastName: 'Ferreira', avatarUrl: null, points: 355 },
    { position: 4, studentId: 's4', firstName: 'Aluno #4', lastName: null, avatarUrl: null, points: 298 },
  ],
  myPosition: 3,
  myPoints: 355,
};

const weeklyChallenge = {
  ...mockChallenge, id: 'ch-2', name: 'Verão 2027', startDate: '2026-11-02', endDate: '2026-11-29',
  format: 'weeks', weeks: 4, currentWeek: 3, visibility: 'full', anonymousRanking: false, participantCount: 4,
};

// Peer row as GET /my/challenges/:id/consistency returns it
const peer = (key, displayName, position, average, faixa, isMe = false) => ({
  key, displayName, initials: displayName.slice(0, 2).toUpperCase(), avatarUrl: null, position, average, faixa, streak: 1, isMe,
});

const classified = [
  peer('k1', 'Ana B.', 1, 100, 'full'),
  peer('k2', 'Bruno S.', 2, 96.5, 'constant'),
  peer('k3', 'Lucas F.', 3, 88.4, 'constant', true),
];

// Consistency board of the weekly championship with the given privacy choice
const consistencyWith = (appearAs) => ({
  challenge: {
    id: 'ch-2', name: 'Verão 2027', description: null, status: 'active', statusLabel: 'Ativo',
    startDate: '2026-11-02', endDate: '2026-11-29', weeks: 4, currentWeek: 3, participantCount: 4, closedAt: null,
  },
  visibility: 'full',
  closesAt: '2026-11-30T00:00:00.000Z',
  me: {
    appearsAs: appearAs === 'name' ? 'Lucas F.' : 'Aluno do time', position: 3, total: 3, faixa: 'constant', average: 88.4,
    weeks100: { done: 1, of: 2 }, streak: 1, entering: null, firstPlaceShared: null, week: null, weekStrip: [], effectiveWeights: [],
  },
  board: {
    podium: classified.slice(0, 3).map((row) => ({ ...row, shared: false })),
    club100: null,
    tieSentence: null,
    neighbors: classified,
    entering: [],
    total: 3,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    items: classified,
  },
  privacy: { appearAs, termVersion: '2026-11-v1', acceptedAt: appearAs === 'pending' ? null : '2026-11-20T10:00:00.000Z' },
});

// API mock: the dates championship with its XP ranking, the weekly one with its consistency board, and the points routes
const mockApi = ({ privacy = 'name' } = {}) => {
  let currentPrivacy = privacy;
  api.put.mockImplementation((url, body) => {
    currentPrivacy = body.appearAs;
    return Promise.resolve({ data: { appearAs: body.appearAs, termVersion: body.termVersion, acceptedAt: '2026-11-24T10:00:00.000Z' } });
  });
  api.get.mockImplementation((url) => {
    if (url === '/my/challenges/ch-1') return Promise.resolve({ data: mockChallenge });
    if (url === '/my/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
    if (url === '/my/challenges/ch-2') return Promise.resolve({ data: weeklyChallenge });
    if (url === '/my/challenges/ch-2/consistency') return Promise.resolve({ data: consistencyWith(currentPrivacy) });
    if (url.startsWith('/my/points/summary')) return Promise.resolve({ data: { totalPoints: 50, breakdown: { workout_completed: 50 } } });
    if (url.startsWith('/my/points?')) return Promise.resolve({ data: { data: [], total: 0, page: 1, limit: 10 } });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
};

// Renders the detail of a championship id
const renderDetail = (id) => renderWithRoute(<MyChallengeDetail />, { route: `/my/challenges/${id}`, path: '/my/challenges/:id' });

// Value shown under a metric card label
const metricValue = (label) => screen.getByText(label).closest('.metric-card').querySelector('.metric-card-value');

// Text of each cell of a ranking row
const rowTexts = (row) => Array.from(row.children).map((cell) => cell.textContent);

describe('MyChallengeDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({ user: { id: ME, firstName: 'Lucas', lastName: 'Ferreira' } });
    api.get.mockReset();
    api.put.mockReset();
  });

  it('renders challenge detail with ranking tab by default', async () => {
    mockApi();
    renderDetail('ch-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Verao' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Meus Pontos' })).toHaveAttribute('aria-selected', 'false');
    const ownRow = within(screen.getByRole('region', { name: 'Ranking' })).getByText('Você').closest('li');
    expect(ownRow).toHaveAttribute('aria-current', 'true');
  });

  it('shows my position summary', async () => {
    mockApi();
    renderDetail('ch-1');
    expect(await screen.findByText(/Sua posição:/)).toBeInTheDocument();
    expect(screen.getByText(/Seus pontos:/)).toBeInTheDocument();
  });

  it('shows forbidden state on 403', async () => {
    api.get.mockImplementation(() => Promise.reject({ response: { status: 403, data: {} } }));
    renderDetail('ch-1');
    expect(await screen.findByText(/não participa/i)).toBeInTheDocument();
  });

  it('loads points tab when clicked', async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail('ch-1');
    await screen.findByRole('heading', { level: 1, name: 'Verao' });
    await user.click(screen.getByRole('tab', { name: 'Meus Pontos' }));
    const summary = screen.getByRole('region', { name: 'Resumo' });
    expect(await within(summary).findByText('Treino concluído')).toBeInTheDocument();
    expect(within(summary).getByText('50')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Ranking' })).not.toBeInTheDocument();
  });

  it('APP-65 opens a weekly championship on Ranking with Sua posição and Sua média', async () => {
    const user = userEvent.setup();
    mockApi();
    renderDetail('ch-2');

    expect(await screen.findByRole('heading', { level: 1, name: 'Verão 2027' })).toBeInTheDocument();
    expect(screen.getByText('02/11 – 29/11/2026 ·')).toBeInTheDocument();
    expect(metricValue('Sua posição:')).toHaveTextContent('3º');
    expect(metricValue('Sua média:')).toHaveTextContent('88%');
    expect(screen.queryByText('Seus pontos:')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveAttribute('aria-selected', 'true');

    const ranking = screen.getByRole('region', { name: 'Ranking' });
    expect(within(ranking).getAllByRole('listitem').map(rowTexts)).toEqual([
      ['1º', 'Ana B.', '100%', '100%'],
      ['2º', 'Bruno S.', 'Constante', '97%'],
      ['3º', 'Você', 'Constante', '88%'],
    ]);
    expect(screen.getByRole('list', { name: 'Pódio' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Meus Pontos' }));
    expect(await screen.findByRole('region', { name: 'Histórico' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pódio' })).not.toBeInTheDocument();
  });

  it('APP-67 asks for the privacy choice before the Ranking', async () => {
    const user = userEvent.setup();
    mockApi({ privacy: 'pending' });
    renderDetail('ch-2');

    const dialog = await screen.findByRole('dialog', { name: 'Como você quer aparecer no ranking do campeonato?' });
    expect(screen.queryByRole('region', { name: 'Ranking' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /Aparecer com meu nome/ })).not.toBeChecked();
    expect(within(dialog).getByRole('radio', { name: /Aparecer como Aluno do time/ })).not.toBeChecked();
    expect(within(within(dialog).getByRole('group', { name: 'Prévia' })).getByText('Lucas F.')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('radio', { name: /Aparecer com meu nome/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));

    expect(api.put).toHaveBeenCalledWith('/my/consistency-ranking/privacy', { appearAs: 'name', termVersion: '2026-11-v1' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const ranking = await screen.findByRole('region', { name: 'Ranking' });
    expect(within(ranking).getByText('Você')).toBeInTheDocument();
  });

  it('APP-68 shows a dates championship with the points ranking and Seus pontos', async () => {
    mockApi();
    renderDetail('ch-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Verao' })).toBeInTheDocument();
    expect(metricValue('Sua posição:')).toHaveTextContent('3º');
    expect(metricValue('Seus pontos:')).toHaveTextContent('355');
    expect(screen.queryByText('Sua média:')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ranking' })).toHaveAttribute('aria-selected', 'true');

    const ranking = screen.getByRole('region', { name: 'Ranking' });
    const rows = within(ranking).getAllByRole('listitem');
    expect(rows.map(rowTexts)).toEqual([
      ['1º', 'Juliana M.', '486 pts'],
      ['2º', 'Pedro S.', '412 pts'],
      ['3º', 'Você', '355 pts'],
      ['4º', 'Aluno #4', '298 pts'],
    ]);
    expect(rows[2]).toHaveClass('my-ranking-row--me');
    expect(screen.queryByRole('list', { name: 'Pódio' })).not.toBeInTheDocument();
  });

  it('APP-73 shows the not participating state', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation(() => Promise.reject({ response: { status: 403, data: { error: 'CHALLENGE_FORBIDDEN_NOT_OWNER', messageCode: 'challenge.forbiddenNotOwner' } } }));
    render(
      <MemoryRouter initialEntries={['/my/challenges/ch-9']}>
        <Routes>
          <Route path="/my/challenges/:id" element={<MyChallengeDetail />} />
          <Route path="/my/challenges" element={<h1>Lista de campeonatos</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Você não participa deste campeonato.' })).toBeInTheDocument();
    expect(screen.getByText('Fale com seu treinador para entrar no próximo.')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(mockShowToast).not.toHaveBeenCalled();
    const actions = screen.getAllByRole('button', { name: 'Voltar para campeonatos' });
    expect(actions).toHaveLength(2);
    const primary = actions.find((button) => button.classList.contains('btn--primary'));

    await user.click(primary);
    expect(screen.getByRole('heading', { name: 'Lista de campeonatos' })).toBeInTheDocument();
  });
});
