import { screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import MyChallenges from './MyChallenges';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockChallenges = [
  {
    id: 'ch-1', name: 'Verao', startDate: '2026-06-01', endDate: '2026-06-30',
    status: 'active', participantMode: 'all', filterCriteria: null,
    cancelledAt: null, participantCount: 3, myPosition: 2, myPoints: 80,
    createdAt: '2026-05-01T00:00:00Z', updatedAt: null,
  },
];

describe('MyChallenges', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    localStorage.clear();
  });

  it('shows skeleton while loading then renders challenges', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/my/protocols') return Promise.resolve({ data: [{ id: 'p1', trainer: { userId: 'trainer-1', firstName: 'T' } }] });
      if (url.startsWith('/my/challenges')) return Promise.resolve({ data: mockChallenges });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<MyChallenges />);
    expect(await screen.findByText('Verao')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeTruthy();
  });

  it('shows empty state when no challenges', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/my/protocols') return Promise.resolve({ data: [{ id: 'p1', trainer: { userId: 'trainer-1', firstName: 'T' } }] });
      if (url.startsWith('/my/challenges')) return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<MyChallenges />);
    expect(await screen.findByText(/Nenhum campeonato ativo/i)).toBeInTheDocument();
  });

  it('renders filter chips', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/my/protocols') return Promise.resolve({ data: [{ id: 'p1', trainer: { userId: 'trainer-1', firstName: 'T' } }] });
      if (url.startsWith('/my/challenges')) return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<MyChallenges />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    });
  });

  it('renders aggregate summary card when challenges have points', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/my/protocols') return Promise.resolve({ data: [{ id: 'p1', trainer: { userId: 'trainer-1', firstName: 'T' } }] });
      if (url.startsWith('/my/challenges')) return Promise.resolve({ data: mockChallenges });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<MyChallenges />);
    expect(await screen.findByText('80')).toBeInTheDocument();
    expect(screen.getByText('Pontos totais')).toBeInTheDocument();
  });
});
