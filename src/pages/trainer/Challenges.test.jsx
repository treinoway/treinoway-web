import { screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import Challenges from './Challenges';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockChallenges = [
  {
    id: 'ch-1',
    name: 'Verao 2026',
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    status: 'active',
    participantCount: 10,
    participantMode: 'all',
    filterCriteria: null,
    cancelledAt: null,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: null,
  },
];

describe('Challenges', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
  });

  it('shows skeleton then list of challenges', async () => {
    api.get.mockResolvedValue({ data: mockChallenges });
    renderWithRouter(<Challenges />);
    expect(await screen.findByText('Verao 2026')).toBeInTheDocument();
    expect(screen.getByText('10 participantes')).toBeInTheDocument();
  });

  it('shows empty state when no challenges', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    expect(await screen.findByText(/Nenhum campeonato/i)).toBeInTheDocument();
  });

  it('defaults to active status filter', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/challenges?status=active');
    });
  });

  it('renders filter chips for status', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ativos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Encerrados' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelados' })).toBeInTheDocument();
    });
  });

  it('renders Criar button', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Criar/i })).toBeInTheDocument();
    });
  });

  it('shows info banner when trainer has no challenges at all', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);
    expect(await screen.findByRole('note')).toBeInTheDocument();
  });

  it('hides info banner when trainer has at least one challenge', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/challenges') return Promise.resolve({ data: mockChallenges });
      return Promise.resolve({ data: mockChallenges });
    });
    renderWithRouter(<Challenges />);
    await screen.findByText('Verao 2026');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
