import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor, within } from '../../test/test-utils';
import MyChallenges from './MyChallenges';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const TRAINER_ID = '6f1c1f5e-2222-4a5b-9c1d-000000000002';

const protocols = [{ id: 'p1', trainer: { userId: TRAINER_ID, firstName: 'Gabriel', lastName: 'Araújo' } }];

const weeklyRunning = {
  id: '6f1c1f5e-1111-4a5b-9c1d-000000000001', trainerId: TRAINER_ID, name: 'Verão 2027',
  startDate: '2026-11-02', endDate: '2026-12-20', status: 'active', statusLabel: 'Ativo',
  participantMode: 'all', participantCount: 18, format: 'weeks', weeks: 7, currentWeek: 4,
  visibility: 'full', anonymousRanking: false,
  consistency: { visibility: 'full', position: 3, total: 18, faixa: 'constant', average: 92.6 },
};

const datesClosed = {
  id: '6f1c1f5e-1111-4a5b-9c1d-000000000003', trainerId: TRAINER_ID, name: 'Campeonato do Mês — Agosto',
  startDate: '2026-08-01', endDate: '2026-08-31', status: 'completed', statusLabel: 'Concluído',
  participantMode: 'all', participantCount: 6, format: 'dates', weeks: null, currentWeek: null, consistency: null,
};

const xpRanking = {
  [weeklyRunning.id]: { entries: [], myPosition: 5, myPoints: 355 },
  [datesClosed.id]: { entries: [], myPosition: 2, myPoints: 498 },
};

// API mock: protocols for the trainer names, the list, and the XP ranking of each championship
const mockApi = (challenges) => {
  api.get.mockImplementation((url) => {
    if (url === '/my/protocols') return Promise.resolve({ data: protocols });
    if (url === '/my/challenges') return Promise.resolve({ data: challenges });
    const ranking = /^\/my\/challenges\/([^/]+)\/ranking$/.exec(url);
    if (ranking) return Promise.resolve({ data: xpRanking[ranking[1]] });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
};

// Value shown under a metric card label
const metricValue = (label) => screen.getByText(label).closest('.metric-card').querySelector('.metric-card-value');

describe('MyChallenges', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    localStorage.clear();
  });

  it('shows skeleton while loading then renders challenges', async () => {
    mockApi([weeklyRunning, datesClosed]);
    renderWithRouter(<MyChallenges />);
    expect(screen.getByRole('status', { name: 'Carregando campeonatos' })).toBeInTheDocument();
    const weeklyCard = await screen.findByRole('article', { name: 'Verão 2027' });
    expect(within(weeklyCard).getByText('3º')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Campeonato do Mês — Agosto' })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Carregando campeonatos' })).not.toBeInTheDocument();
  });

  it('shows empty state when no challenges', async () => {
    mockApi([]);
    renderWithRouter(<MyChallenges />);
    expect(await screen.findByText(/Nenhum campeonato ativo/i)).toBeInTheDocument();
  });

  it('renders filter chips', async () => {
    mockApi([weeklyRunning]);
    renderWithRouter(<MyChallenges />);
    const tabs = await screen.findByRole('tablist', { name: 'Filtrar por status' });
    expect(within(tabs).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Todos', 'Ativos', 'Encerrados']);
  });

  it('renders aggregate summary card when challenges have points', async () => {
    mockApi([weeklyRunning, datesClosed]);
    renderWithRouter(<MyChallenges />);
    await screen.findByText('Pontos totais');
    expect(metricValue('Pontos totais')).toHaveTextContent('853');
  });

  it('APP-71 shows Pontos totais, Melhor posição and the Todos, Ativos and Encerrados tabs', async () => {
    const user = userEvent.setup();
    mockApi([weeklyRunning, datesClosed]);
    renderWithRouter(<MyChallenges />);

    await screen.findByRole('article', { name: 'Verão 2027' });
    expect(screen.getByRole('heading', { level: 1, name: 'Campeonatos' })).toBeInTheDocument();
    expect(metricValue('Pontos totais')).toHaveTextContent('853');
    expect(metricValue('Melhor posição')).toHaveTextContent('2º');
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(2);

    const weeklyCard = screen.getByRole('article', { name: 'Verão 2027' });
    expect(within(weeklyCard).getByText('Treinador: Gabriel Araújo · 02/11 – 20/12/2026')).toBeInTheDocument();
    expect(within(weeklyCard).getByText('Sua média')).toBeInTheDocument();
    const datesCard = screen.getByRole('article', { name: 'Campeonato do Mês — Agosto' });
    expect(within(datesCard).getByText('498 pts')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Encerrados' }));
    expect(screen.getByRole('tab', { name: 'Encerrados' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent)).toEqual(['Campeonato do Mês — Agosto']);

    await user.click(screen.getByRole('tab', { name: 'Ativos' }));
    expect(screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent)).toEqual(['Verão 2027']);
  });

  it('APP-72 shows the empty state without championships', async () => {
    mockApi([]);
    const { container } = renderWithRouter(<MyChallenges />);

    expect(await screen.findByRole('heading', { name: 'Nenhum campeonato ativo.' })).toBeInTheDocument();
    expect(screen.getByText('Quando seu treinador criar um campeonato, ele aparece aqui.')).toBeInTheDocument();
    expect(container.querySelector('.empty-block')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('tablist')).not.toBeInTheDocument());
    expect(screen.queryByText('Pontos totais')).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
