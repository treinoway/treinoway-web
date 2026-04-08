import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import CreateChallenge from './CreateChallenge';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockConfig = {
  ptsWorkoutCompleted: 10,
  ptsStreak7Days: 50,
  ptsStreak30Days: 250,
  ptsDailyCheckin: 2,
  ptsEvolutionRecord: 15,
  ptsWorkoutFeedback: 5,
  dailyPointsCap: null,
};

describe('CreateChallenge', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
  });

  it('renders the form with points summary card', async () => {
    renderWithRouter(<CreateChallenge />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Novo campeonato', level: 1 })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Pontuação')).toBeInTheDocument();
  });

  it('renders "Informações básicas" card heading', async () => {
    renderWithRouter(<CreateChallenge />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Informações básicas', level: 2 })).toBeInTheDocument();
    });
  });

  it('renders "Participantes" card heading', async () => {
    renderWithRouter(<CreateChallenge />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Participantes', level: 2 })).toBeInTheDocument();
    });
  });

  it('fetches gamification config on mount', async () => {
    renderWithRouter(<CreateChallenge />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/gamification/config');
    });
  });

  it('shows warning toast when config fetch fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/gamification/config') return Promise.reject(new Error('fail'));
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<CreateChallenge />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('preferências de pontuação'),
        'warning'
      );
    });
  });

  it('opens PointsBottomSheet when clicking the points summary card', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CreateChallenge />);
    await waitFor(() => {
      expect(screen.getByText('Pontuação')).toBeInTheDocument();
    });
    const card = screen.getByRole('button', { name: /pontuação/i });
    await user.click(card);
    expect(screen.getByText('Treino completo')).toBeInTheDocument();
  });

  it('allows submission with explicit mode and no students selected', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 's1', firstName: 'Ana', lastName: 'Silva', email: 'ana@test.com' }] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
    api.post.mockResolvedValue({ data: { id: 'ch-new' } });
    renderWithRouter(<CreateChallenge />);
    await screen.findByRole('heading', { name: 'Novo campeonato', level: 1 });
    await user.selectOptions(screen.getByLabelText('Modo de seleção'), 'explicit');
    expect(screen.getByText(/adicionar participantes depois/i)).toBeInTheDocument();
  });

  it('hides helper text when students are selected in explicit mode', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [{ id: 's1', firstName: 'Ana', lastName: 'Silva', email: 'ana@test.com' }] });
      if (url === '/trainer/gamification/config') return Promise.resolve({ data: mockConfig });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<CreateChallenge />);
    await screen.findByRole('heading', { name: 'Novo campeonato', level: 1 });
    await user.selectOptions(screen.getByLabelText('Modo de seleção'), 'explicit');
    expect(screen.getByText(/adicionar participantes depois/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Ana Silva/i));
    expect(screen.queryByText(/adicionar participantes depois/i)).not.toBeInTheDocument();
  });

  it('calls preview endpoint when clicking pre-visualizar with filter mode', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { studentIds: [], count: 0 } });
    renderWithRouter(<CreateChallenge />);
    await screen.findByRole('heading', { name: 'Novo campeonato', level: 1 });
    await user.selectOptions(screen.getByLabelText('Modo de seleção'), 'filter');
    await user.click(screen.getByRole('button', { name: /pré-visualizar/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/challenges/preview-participants',
        expect.objectContaining({ mode: 'filter' })
      );
    });
    expect(await screen.findByText(/Nenhum aluno corresponde/i)).toBeInTheDocument();
  });
});
