import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import Challenges from './Challenges';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';
import { CHALLENGE_STATUS } from '../../constants/challenge';
import useConsistencyRankingAccess from '../../hooks/useConsistencyRankingAccess';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useConsistencyRankingAccess', () => ({ default: vi.fn(() => true) }));
vi.mock('../../components/CreateChampionshipModal', () => ({
  default: ({ isOpen, onCreated, onClose }) => (isOpen ? (
    <div role="dialog" aria-label="Criar Campeonato">
      <button type="button" onClick={() => onCreated('weekly-9')}>Confirmar criação</button>
      <button type="button" onClick={onClose}>Fechar</button>
    </div>
  ) : null),
}));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

const activeChallenge = {
  id: 'ch-1',
  name: 'Verao 2026',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: CHALLENGE_STATUS.ACTIVE,
  participantCount: 10,
  participantMode: 'all',
  filterCriteria: null,
  cancelledAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
};

const scheduledChallenge = {
  id: 'ch-2',
  name: 'Desafio Futuro',
  startDate: '2030-01-01',
  endDate: '2030-01-31',
  status: CHALLENGE_STATUS.SCHEDULED,
  participantCount: 5,
  participantMode: 'all',
  filterCriteria: null,
  cancelledAt: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: null,
};

const completedChallenge = {
  id: 'ch-3',
  name: 'Campeonato Passado',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  status: CHALLENGE_STATUS.COMPLETED,
  participantCount: 20,
  participantMode: 'all',
  filterCriteria: null,
  cancelledAt: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: null,
};

const cancelledChallenge = {
  id: 'ch-4',
  name: 'Old Challenge',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  status: CHALLENGE_STATUS.CANCELLED,
  participantCount: 0,
  participantMode: 'all',
  filterCriteria: null,
  cancelledAt: '2025-01-15T00:00:00Z',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: null,
};

// Reads of the championship list (the trainer's ranking config is read apart for the time zone)
const challengeListCalls = () => api.get.mock.calls.filter(([url]) => url.startsWith('/trainer/challenges'));

describe('Challenges', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({ hasRole: () => false });
    vi.mocked(useConsistencyRankingAccess).mockReturnValue(true);
    api.get.mockReset();
  });

  it('CPD-60 opens on Todos with a count on every tab', async () => {
    const user = userEvent.setup();
    const secondActive = { ...activeChallenge, id: 'ch-5', name: 'Primavera 2026' };
    api.get.mockResolvedValue({ data: [activeChallenge, secondActive, scheduledChallenge, completedChallenge] });
    renderWithRouter(<Challenges />);

    expect(await screen.findByText('Verao 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Campeonatos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo campeonato' })).toHaveClass('btn--primary');
    expect(screen.queryByRole('button', { name: /Criar campeonato/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent))
      .toEqual(['Todos 4', 'Ativos 2', 'Agendados 1', 'Encerrados 1', 'Cancelados 0']);
    expect(screen.getByRole('tab', { name: 'Todos 4' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent))
      .toEqual(['Verao 2026', 'Primavera 2026', 'Desafio Futuro', 'Campeonato Passado']);

    await user.click(screen.getByRole('tab', { name: 'Ativos 2' }));

    expect(screen.getByRole('tab', { name: 'Ativos 2' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByText('Desafio Futuro')).not.toBeInTheDocument();
  });

  it('CPD-64 drops the template sentence from the empty state for a weekly-format trainer', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    const { unmount } = renderWithRouter(<Challenges />);

    expect(await screen.findByRole('heading', { name: 'Nenhum campeonato ainda' })).toBeInTheDocument();
    expect(screen.getByText('Seus campeonatos ativos aparecerão aqui.')).toBeInTheDocument();
    expect(screen.queryByText(/Crie a partir de um modelo pronto\./)).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    const createButtons = screen.getAllByRole('button', { name: 'Novo campeonato' });
    expect(createButtons).toHaveLength(2);

    await user.click(createButtons[1]);

    expect(screen.getByRole('dialog', { name: 'Criar Campeonato' })).toBeInTheDocument();
    unmount();

    vi.mocked(useConsistencyRankingAccess).mockReturnValue(false);
    renderWithRouter(<Challenges />);

    expect(await screen.findByText('Seus campeonatos ativos aparecerão aqui.')).toBeInTheDocument();
    expect(screen.queryByText(/Crie a partir de um modelo pronto\./)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo campeonato' })).not.toBeInTheDocument();
  });

  it('makes a single unfiltered API call on mount', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(challengeListCalls()).toEqual([['/trainer/challenges']]);
  });

  it("CPD-62 tags the cards on today's date in the trainer's time zone, not the browser's", async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-22T12:00:00Z'));
    const endsTomorrowHere = { ...activeChallenge, id: 'tz-1', name: 'Termina em Kiritimati', startDate: '2026-11-02', endDate: '2026-11-23' };
    const startsInTwoDaysHere = { ...scheduledChallenge, id: 'tz-2', name: 'Começa em Kiritimati', startDate: '2026-11-24', endDate: '2026-12-21' };
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/trainer/consistency-ranking/config' ? { timeZone: 'Pacific/Kiritimati' } : [endsTomorrowHere, startsInTwoDaysHere],
    }));
    try {
      renderWithRouter(<Challenges />);

      const activeCard = (await screen.findByText('Termina em Kiritimati')).closest('article');
      await waitFor(() => expect(within(activeCard).getByText('Último dia')).toBeInTheDocument());
      expect(within(activeCard).queryByText('Em andamento')).not.toBeInTheDocument();
      await user.click(screen.getByRole('tab', { name: /Agendados/ }));
      const scheduledCard = screen.getByText('Começa em Kiritimati').closest('article');
      expect(within(scheduledCard).getByText('Começa amanhã')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows skeleton then list of challenges', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    expect(await screen.findByText('Verao 2026')).toBeInTheDocument();
  });

  it('shows participant count for active challenge with participants', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(screen.getByText('10 participantes')).toBeInTheDocument();
  });

  it('shows progress section for active challenge', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(screen.getByText('Progresso')).toBeInTheDocument();
  });

  it('shows "Ver ranking →" for active challenge with participants', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(screen.getByRole('button', { name: 'Ver ranking' })).toHaveTextContent('Ver ranking →');
  });

  it('shows alert banner for active challenge with zero participants', async () => {
    const noParticipants = { ...activeChallenge, participantCount: 0 };
    api.get.mockResolvedValue({ data: [noParticipants] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(screen.getByText('Nenhum participante — campeonato inativo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar alunos' })).toHaveTextContent('Adicionar alunos →');
  });

  it('shows empty state when no challenges match current filter', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    expect(await screen.findByText(/Nenhum campeonato/i)).toBeInTheDocument();
  });

  it('shows empty state subtitle for active filter', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    expect(await screen.findByText(/Seus campeonatos ativos aparecerão aqui/i)).toBeInTheDocument();
  });

  it('switches to scheduled tab and shows scheduled challenges client-side', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [activeChallenge, scheduledChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    await user.click(scheduledTab);

    expect(screen.getByText('Desafio Futuro')).toBeInTheDocument();
    expect(screen.queryByText('Verao 2026')).not.toBeInTheDocument();
    // Only one API call, no second call on tab switch
    expect(challengeListCalls()).toHaveLength(1);
  });

  it('shows empty state subtitle for scheduled filter', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    await user.click(scheduledTab);
    expect(await screen.findByText(/Campeonatos agendados para o futuro/i)).toBeInTheDocument();
  });

  it('shows empty state subtitle for completed filter', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');

    const completedTab = screen.getByRole('tab', { name: /Encerrados/i });
    await user.click(completedTab);
    expect(await screen.findByText(/campeonatos encerrados ficarão registrados/i)).toBeInTheDocument();
  });

  it('shows empty state subtitle for cancelled filter', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');

    const cancelledTab = screen.getByRole('tab', { name: /Cancelados/i });
    await user.click(cancelledTab);
    expect(await screen.findByText(/Campeonatos que foram cancelados/i)).toBeInTheDocument();
  });

  it('defaults to the Todos tab selected', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Todos/i })).toHaveAttribute('aria-selected', 'true');
    });
    expect(screen.getByRole('tab', { name: /Ativos/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders tab buttons for all statuses', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Todos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Ativos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Agendados/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Encerrados/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Cancelados/i })).toBeInTheDocument();
    });
  });

  it('hides info banner when trainer has at least one challenge', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('shows tab badge with count for active challenges', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    // The active tab should have a badge showing "1"
    const activeTab = screen.getByRole('tab', { name: /Ativos/i });
    expect(within(activeTab).getByText('1')).toBeInTheDocument();
  });

  it('shows tab badges for multiple statuses', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge, scheduledChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    expect(within(scheduledTab).getByText('1')).toBeInTheDocument();
  });

  it('shows error toast when API fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro de conexão' });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro de conexão', 'error');
    });
  });

  it('shows the Agendado tag for a scheduled challenge', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [scheduledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    await user.click(scheduledTab);

    const card = (await screen.findByText('Desafio Futuro')).closest('article');
    expect(within(card).getByText('Agendado')).toHaveClass('badge--tag');
  });

  it('shows the date range for scheduled challenge', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [scheduledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    await user.click(scheduledTab);

    await screen.findByText('Desafio Futuro');
    expect(screen.getByText('01/01 – 31/01/2030')).toBeInTheDocument();
  });

  it('renders completed challenge with the Encerrado tag and "Ver ranking →"', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [completedChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const completedTab = screen.getByRole('tab', { name: /Encerrados/i });
    await user.click(completedTab);

    await screen.findByText('Campeonato Passado');
    expect(screen.getByText('Encerrado')).toHaveClass('badge--success');
    expect(screen.getByRole('button', { name: 'Ver ranking' })).toBeInTheDocument();
  });

  it('renders cancelled challenge with the Cancelado tag', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [cancelledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const cancelledTab = screen.getByRole('tab', { name: /Cancelados/i });
    await user.click(cancelledTab);

    const card = (await screen.findByText('Old Challenge')).closest('article');
    expect(within(card).getByText('Cancelado')).toHaveClass('badge--error');
  });

  it('shows the dates of a cancelled challenge without progress', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [cancelledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const cancelledTab = screen.getByRole('tab', { name: /Cancelados/i });
    await user.click(cancelledTab);

    await screen.findByText('Old Challenge');
    expect(screen.getByText('01/01 – 31/01/2025')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('CAMP-49 shows Semana X de Y and Começa DD/MM', async () => {
    const user = userEvent.setup();
    const weeklyActive = { ...activeChallenge, id: 'w-1', name: 'Verão Semanal', format: 'weeks', weeks: 8, currentWeek: 3 };
    const weeklyScheduled = { ...scheduledChallenge, id: 'w-2', name: 'Inverno Semanal', format: 'weeks', weeks: 4, currentWeek: null, startDate: '2030-01-07', endDate: '2030-02-03' };
    const datesActive = { ...activeChallenge, format: 'dates', weeks: null, currentWeek: null };
    api.get.mockResolvedValue({ data: [weeklyActive, weeklyScheduled, datesActive] });
    renderWithRouter(<Challenges />);

    const weeklyCard = (await screen.findByText('Verão Semanal')).closest('article');
    expect(within(weeklyCard).getByText('Semana 3 de 8')).toBeInTheDocument();
    expect(within(weeklyCard).getByText('Progresso')).toBeInTheDocument();
    const datesCard = screen.getByText('Verao 2026').closest('article');
    expect(within(datesCard).queryByText(/Semana \d+ de \d+/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Agendados/ }));

    const scheduledCard = (await screen.findByText('Inverno Semanal')).closest('article');
    expect(within(scheduledCard).getByText('Começa 07/01')).toBeInTheDocument();
    expect(within(scheduledCard).getByText('5 participantes')).toBeInTheDocument();
  });

  it('CAMP-01 opens the create form from Novo campeonato and CAMP-04 opens the new championship', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    render(
      <MemoryRouter initialEntries={['/trainer/challenges']}>
        <Routes>
          <Route path="/trainer/challenges" element={<Challenges />} />
          <Route path="/trainer/challenges/:id" element={<p>Detalhe do campeonato</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText(/Nenhum campeonato/);

    await user.click(screen.getAllByRole('button', { name: 'Novo campeonato' })[0]);
    expect(screen.getByRole('dialog', { name: 'Criar Campeonato' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar criação' }));

    expect(await screen.findByText('Detalhe do campeonato')).toBeInTheDocument();
  });
});

// ---- Unit tests for getTemporalInfo helper (via rendered output) ----
describe('getTemporalInfo logic (via rendered output)', () => {
  beforeEach(() => {
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useConsistencyRankingAccess).mockReturnValue(true);
    api.get.mockReset();
  });

  it('shows 100% progress when active challenge ends today', async () => {
    const challenge = {
      ...activeChallenge,
      startDate: '2020-01-01',
      endDate: todayStr,
      status: CHALLENGE_STATUS.ACTIVE,
    };
    api.get.mockResolvedValue({ data: [challenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(screen.getByRole('progressbar', { name: 'Progresso' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Último dia')).toBeInTheDocument();
  });

  it('shows "Começa amanhã" when scheduled challenge starts tomorrow', async () => {
    const user = userEvent.setup();
    const challenge = {
      ...activeChallenge,
      id: 'ch-tomorrow',
      name: 'Challenge Tomorrow',
      startDate: tomorrowStr,
      endDate: '2030-12-31',
      status: CHALLENGE_STATUS.SCHEDULED,
    };
    api.get.mockResolvedValue({ data: [challenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    await user.click(scheduledTab);

    await screen.findByText('Challenge Tomorrow');
    expect(screen.getByText('Começa amanhã')).toBeInTheDocument();
  });

  it('shows no temporal info for cancelled challenge', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [cancelledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const cancelledTab = screen.getByRole('tab', { name: /Cancelados/i });
    await user.click(cancelledTab);

    await screen.findByText('Old Challenge');
    expect(screen.queryByText(/dias restantes|Começa/i)).not.toBeInTheDocument();
  });

  it('shows no temporal info for completed challenge', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [completedChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const completedTab = screen.getByRole('tab', { name: /Encerrados/i });
    await user.click(completedTab);

    await screen.findByText('Campeonato Passado');
    expect(screen.queryByText(/dias restantes|Começa/i)).not.toBeInTheDocument();
  });

  it('shows the elapsed share of the days on the progress bar of an active challenge', async () => {
    const challenge = {
      ...activeChallenge,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: CHALLENGE_STATUS.ACTIVE,
    };
    api.get.mockResolvedValue({ data: [challenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    const elapsedDays = Math.min(Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(2026, 0, 1)) / 86400000) + 1, 365);
    expect(screen.getByText('Progresso')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso' })).toHaveAttribute('aria-valuenow', String(Math.round((elapsedDays / 365) * 100)));
  });
});
