import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import ChallengeDetail from './ChallengeDetail';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
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
