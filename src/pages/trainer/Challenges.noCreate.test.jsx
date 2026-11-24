import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import Challenges from './Challenges';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const ORIGINAL_URL = window.location.href;
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

// why: since CAMP-01/AD-049 the create entry exists only where the weekly format is released; a non-admin in production keeps today's screen (CAMP-69)
describe('Challenges - no championship creation entry points for a non-admin in production', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAuth).mockReturnValue({ hasRole: () => false });
    vi.stubEnv('DEV', false);
    globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
  });

  it('has no create button in the header when there are championships', async () => {
    api.get.mockResolvedValue({ data: [activeChallenge] });
    renderWithRouter(<Challenges />);

    await screen.findByText('Verao 2026');

    expect(screen.queryByRole('button', { name: /^criar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo campeonato/i })).not.toBeInTheDocument();
  });

  it('has no create button in the empty state nor the create hint', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Challenges />);

    await screen.findByText(/nenhum campeonato/i);

    expect(screen.queryByRole('button', { name: /criar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /novo campeonato/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/crie campeonatos|crie um campeonato|crie a partir de um modelo/i)).not.toBeInTheDocument();
  });
});
