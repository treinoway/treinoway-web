import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import MyChallengeDetail from './MyChallengeDetail';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockChallenge = {
  id: 'ch-1', name: 'Verao', startDate: '2026-06-01', endDate: '2026-06-30', status: 'active',
  participantMode: 'all', filterCriteria: null, cancelledAt: null, participantCount: 3,
  createdAt: '2026-05-01T00:00:00Z', updatedAt: null,
};

const mockRanking = {
  entries: [
    { position: 1, studentId: 'me', firstName: 'Eu', lastName: 'X', avatarUrl: null, points: 50 },
    { position: 2, studentId: 's2', firstName: 'Aluno', lastName: 'B', avatarUrl: null, points: 30 },
  ],
  myPosition: 1,
  myPoints: 50,
};

describe('MyChallengeDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'me' } });
    api.get.mockReset();
  });

  it('renders challenge detail with ranking tab by default', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/my/challenges/ch-1') return Promise.resolve({ data: mockChallenge });
      if (url === '/my/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRoute(<MyChallengeDetail />, { route: '/my/challenges/ch-1', path: '/my/challenges/:id' });
    expect(await screen.findByText('Verao')).toBeInTheDocument();
    expect(screen.getByText('Eu X')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ranking' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Meus Pontos' })).toBeInTheDocument();
  });

  it('shows my position summary', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/my/challenges/ch-1') return Promise.resolve({ data: mockChallenge });
      if (url === '/my/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRoute(<MyChallengeDetail />, { route: '/my/challenges/ch-1', path: '/my/challenges/:id' });
    expect(await screen.findByText(/Sua posição:/)).toBeInTheDocument();
    expect(screen.getByText(/Seus pontos:/)).toBeInTheDocument();
  });

  it('shows forbidden state on 403', async () => {
    api.get.mockImplementation(() => Promise.reject({ response: { status: 403, data: {} } }));
    renderWithRoute(<MyChallengeDetail />, { route: '/my/challenges/ch-1', path: '/my/challenges/:id' });
    expect(await screen.findByText(/não participa/i)).toBeInTheDocument();
  });

  it('loads points tab when clicked', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/my/challenges/ch-1') return Promise.resolve({ data: mockChallenge });
      if (url === '/my/challenges/ch-1/ranking') return Promise.resolve({ data: mockRanking });
      if (url.startsWith('/my/points/summary')) return Promise.resolve({ data: { totalPoints: 50, breakdown: { workout_completed: 50 } } });
      if (url.startsWith('/my/points?')) return Promise.resolve({ data: { data: [], total: 0 } });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRoute(<MyChallengeDetail />, { route: '/my/challenges/ch-1', path: '/my/challenges/:id' });
    await screen.findByText('Verao');
    await user.click(screen.getByRole('button', { name: 'Meus Pontos' }));
    expect(await screen.findByText('50 pontos')).toBeInTheDocument();
  });
});
