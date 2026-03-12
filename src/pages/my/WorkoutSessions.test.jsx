import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import WorkoutSessions from './WorkoutSessions';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockSessions = [
  {
    id: 'session-1',
    trainingId: 'training-1',
    status: 'completed',
    startedAt: '2026-03-08T10:00:00Z',
    finishedAt: '2026-03-08T11:00:00Z',
    durationSeconds: 3600,
    notes: null,
    training: { id: 'training-1', name: 'Peito e Tríceps', category: 'strength' },
  },
  {
    id: 'session-2',
    trainingId: 'training-2',
    status: 'in_progress',
    startedAt: '2026-03-08T12:00:00Z',
    finishedAt: null,
    durationSeconds: null,
    notes: null,
    training: { id: 'training-2', name: 'Costas e Bíceps', category: 'strength' },
  },
];

const mockPaginatedResponse = {
  data: mockSessions,
  total: 2,
  page: 1,
  limit: 20,
};

describe('WorkoutSessions', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<WorkoutSessions />);

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders the page title', async () => {
    api.get.mockResolvedValue({ data: mockPaginatedResponse });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(screen.getByText('Histórico de Treinos')).toBeInTheDocument();
    });
  });

  it('shows empty state when user has no sessions', async () => {
    api.get.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 20 } });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma sessão encontrada')).toBeInTheDocument();
    });
  });

  it('renders session cards with training name and date', async () => {
    api.get.mockResolvedValue({ data: mockPaginatedResponse });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(screen.getByText('Peito e Tríceps')).toBeInTheDocument();
      expect(screen.getByText('Costas e Bíceps')).toBeInTheDocument();
    });
  });

  it('renders status badges for each session', async () => {
    api.get.mockResolvedValue({ data: mockPaginatedResponse });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(screen.getByText('Concluído')).toBeInTheDocument();
      // "Em andamento" appears both in filter buttons and session badge — check there are at least 2
      const emAndamento = screen.getAllByText('Em andamento');
      expect(emAndamento.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders duration for completed sessions', async () => {
    api.get.mockResolvedValue({ data: mockPaginatedResponse });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(screen.getByText('60min')).toBeInTheDocument();
    });
  });

  it('calls GET /my/workout-sessions on mount', async () => {
    api.get.mockResolvedValue({ data: mockPaginatedResponse });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/my/workout-sessions', expect.objectContaining({
        params: expect.objectContaining({ page: 1, limit: 20 }),
      }));
    });
  });

  it('passes status filter to the API when a filter button is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 20 } });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(screen.getByText('Concluídos')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Concluídos'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/my/workout-sessions', expect.objectContaining({
        params: expect.objectContaining({ status: 'completed', page: 1 }),
      }));
    });
  });

  it('does not render pagination when there is only one page', async () => {
    api.get.mockResolvedValue({ data: mockPaginatedResponse });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(screen.queryByText(/Anterior/)).not.toBeInTheDocument();
    });
  });

  it('renders pagination controls when there are multiple pages', async () => {
    api.get.mockResolvedValue({
      data: { data: mockSessions, total: 25, page: 1, limit: 20 },
    });

    renderWithRouter(<WorkoutSessions />);

    await waitFor(() => {
      expect(screen.getByText('Anterior')).toBeInTheDocument();
      expect(screen.getByText('Próxima')).toBeInTheDocument();
      expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();
    });
  });
});
