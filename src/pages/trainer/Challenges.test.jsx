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

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
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

describe('Challenges', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({ hasRole: () => false });
    api.get.mockReset();
  });

  it('makes a single unfiltered API call on mount', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/trainer/challenges');
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
    expect(screen.getByText('Ver ranking →')).toBeInTheDocument();
  });

  it('shows alert banner for active challenge with zero participants', async () => {
    const noParticipants = { ...activeChallenge, participantCount: 0 };
    api.get.mockResolvedValue({ data: [noParticipants] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(screen.getByText('Nenhum participante — campeonato inativo')).toBeInTheDocument();
    expect(screen.getByText('Adicionar alunos →')).toBeInTheDocument();
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
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('shows empty state subtitle for scheduled filter', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    await screen.findByText(/Nenhum campeonato/i);

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    await user.click(scheduledTab);
    expect(await screen.findByText(/Campeonatos agendados para o futuro/i)).toBeInTheDocument();
  });

  it('shows empty state subtitle for completed filter', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    await screen.findByText(/Nenhum campeonato/i);

    const completedTab = screen.getByRole('tab', { name: /Encerrados/i });
    await user.click(completedTab);
    expect(await screen.findByText(/campeonatos encerrados ficarão registrados/i)).toBeInTheDocument();
  });

  it('shows empty state subtitle for cancelled filter', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    await screen.findByText(/Nenhum campeonato/i);

    const cancelledTab = screen.getByRole('tab', { name: /Cancelados/i });
    await user.click(cancelledTab);
    expect(await screen.findByText(/Campeonatos que foram cancelados/i)).toBeInTheDocument();
  });

  it('defaults to active status tab selected', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      const activeTab = screen.getByRole('tab', { name: /Ativos/i });
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('renders tab buttons for all statuses', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
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

  it('shows temporal info for scheduled challenge', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [scheduledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    await user.click(scheduledTab);

    await screen.findByText('Desafio Futuro');
    expect(screen.getByText(/Começa em \d+ dias/)).toBeInTheDocument();
  });

  it('shows date range and total days for scheduled challenge', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [scheduledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const scheduledTab = screen.getByRole('tab', { name: /Agendados/i });
    await user.click(scheduledTab);

    await screen.findByText('Desafio Futuro');
    expect(screen.getByText(/01\/01/)).toBeInTheDocument();
    expect(screen.getByText(/31\/01\/2030 · 31 dias/)).toBeInTheDocument();
  });

  it('renders completed challenge with badge-blue and "Ver ranking →"', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [completedChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const completedTab = screen.getByRole('tab', { name: /Encerrados/i });
    await user.click(completedTab);

    await screen.findByText('Campeonato Passado');
    expect(screen.getByText('Ver ranking →')).toBeInTheDocument();
  });

  it('renders cancelled challenge with strikethrough name', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [cancelledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const cancelledTab = screen.getByRole('tab', { name: /Cancelados/i });
    await user.click(cancelledTab);

    await screen.findByText('Old Challenge');
    const title = screen.getByText('Old Challenge');
    expect(title).toHaveStyle({ textDecoration: 'line-through' });
  });

  it('shows cancellation date for cancelled challenge', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [cancelledChallenge] });
    renderWithRouter(<Challenges />);
    await waitFor(() => { expect(api.get).toHaveBeenCalled(); });

    const cancelledTab = screen.getByRole('tab', { name: /Cancelados/i });
    await user.click(cancelledTab);

    await screen.findByText('Old Challenge');
    expect(screen.getByText(/Cancelado em 15\/01\/2025/)).toBeInTheDocument();
  });
});

// ---- Unit tests for getTemporalInfo helper (via rendered output) ----
describe('getTemporalInfo logic (via rendered output)', () => {
  beforeEach(() => {
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
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
    // Progress bar shows elapsed days = total days (no remaining)
    expect(screen.getByText('Progresso')).toBeInTheDocument();
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

  it('shows progress labels for active challenge', async () => {
    const challenge = {
      ...activeChallenge,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: CHALLENGE_STATUS.ACTIVE,
    };
    api.get.mockResolvedValue({ data: [challenge] });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    // Progress bar is always shown for active challenges
    expect(screen.getByText('Progresso')).toBeInTheDocument();
    // Shows elapsed/total days label
    expect(screen.getByText(/de 365 dias/)).toBeInTheDocument();
  });

  it('CAMP-49 shows Semana X de Y and Começa DD/MM', async () => {
    const user = userEvent.setup();
    const weeklyActive = { ...activeChallenge, id: 'w-1', name: 'Verão Semanal', format: 'weeks', weeks: 8, currentWeek: 3 };
    const weeklyScheduled = { ...scheduledChallenge, id: 'w-2', name: 'Inverno Semanal', format: 'weeks', weeks: 4, currentWeek: null, startDate: '2030-01-07', endDate: '2030-02-03' };
    const datesActive = { ...activeChallenge, format: 'dates', weeks: null, currentWeek: null };
    api.get.mockResolvedValue({ data: [weeklyActive, weeklyScheduled, datesActive] });
    renderWithRouter(<Challenges />);

    const weeklyCard = (await screen.findByText('Verão Semanal')).closest('button');
    expect(within(weeklyCard).getByText('Semana 3 de 8')).toBeInTheDocument();
    expect(within(weeklyCard).getByText('Progresso')).toBeInTheDocument();
    const datesCard = screen.getByText('Verao 2026').closest('button');
    expect(within(datesCard).queryByText(/Semana \d+ de \d+/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Agendados/ }));

    const scheduledCard = (await screen.findByText('Inverno Semanal')).closest('button');
    expect(within(scheduledCard).getByText('Começa 07/01')).toBeInTheDocument();
    expect(within(scheduledCard).getByText('5 participantes')).toBeInTheDocument();
  });

  it('CAMP-01 opens the create form from Criar campeonato and CAMP-04 opens the new championship', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    expect(screen.getByRole('dialog', { name: 'Criar Campeonato' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar criação' }));

    expect(await screen.findByText('Detalhe do campeonato')).toBeInTheDocument();
  });
});
