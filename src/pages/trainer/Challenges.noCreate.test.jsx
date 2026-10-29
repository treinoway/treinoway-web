import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import Challenges from './Challenges';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const activeChallenge = {
  id: 'ch-1',
  name: 'Verao 2026',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'active',
  participantCount: 10,
  participantMode: 'all',
  filterCriteria: null,
  cancelledAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
};

describe('Challenges - no championship creation entry points', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('has no create button in the header when there are championships', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);

    await screen.findByText('Verao 2026');

    expect(screen.queryByRole('button', { name: /^criar$/i })).not.toBeInTheDocument();
  });

  it('has no create button in the empty state nor the create hint', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);

    await screen.findByText(/nenhum campeonato/i);

    expect(screen.queryByRole('button', { name: /criar/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/crie campeonatos|crie um campeonato/i)).not.toBeInTheDocument();
  });
});
