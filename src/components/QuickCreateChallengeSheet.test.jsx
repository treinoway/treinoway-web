import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import QuickCreateChallengeSheet from './QuickCreateChallengeSheet';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
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

describe('QuickCreateChallengeSheet', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.post.mockReset();
    api.get.mockReset();
    api.get.mockResolvedValue({ data: mockConfig });
  });

  it('renders presets', async () => {
    api.post.mockResolvedValue({ data: { count: 10 } });
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    expect(await screen.findByText('Sprint de 7 dias')).toBeInTheDocument();
    expect(screen.getByText('Desafio quinzenal')).toBeInTheDocument();
    expect(screen.getByText('Campeonato mensal')).toBeInTheDocument();
  });

  it('expands preset details on click and shows participant count and points line', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { count: 8 } });
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/challenges/preview-participants',
        { mode: 'all' }
      );
    });
    await user.click(screen.getByText('Sprint de 7 dias'));
    expect(await screen.findByText(/8 aluno\(s\) ativo\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/preferências padrão/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar regras de pontuação/i })).toBeInTheDocument();
  });

  it('opens points editor when clicking Editar', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { count: 5 } });
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByText('Sprint de 7 dias'));
    await user.click(await screen.findByRole('button', { name: /editar regras de pontuação/i }));
    expect(screen.getByText('Regras de pontuação')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
  });

  it('creates challenge from preset', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreated = vi.fn();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/challenges/preview-participants') return Promise.resolve({ data: { count: 5 } });
      if (url === '/trainer/challenges') return Promise.resolve({ data: { id: 'ch-99' } });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<QuickCreateChallengeSheet onClose={onClose} onCreated={onCreated} />);
    await user.click(await screen.findByText('Sprint de 7 dias'));
    await user.click(await screen.findByRole('button', { name: 'Criar' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/challenges', expect.objectContaining({
        name: 'Sprint Semanal',
        participantMode: 'all',
      }));
    });
    expect(onCreated).toHaveBeenCalledWith('ch-99');
    expect(onClose).toHaveBeenCalled();
  });

  it('sends edited name when creating preset challenge', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/challenges/preview-participants') return Promise.resolve({ data: { count: 5 } });
      if (url === '/trainer/challenges') return Promise.resolve({ data: { id: 'ch-99' } });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByText('Sprint de 7 dias'));
    const nameInput = await screen.findByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Meu Sprint Customizado');
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/challenges', expect.objectContaining({
        name: 'Meu Sprint Customizado',
      }));
    });
  });

  it('shows error when trying to create with empty name', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { count: 5 } });
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByText('Sprint de 7 dias'));
    const nameInput = await screen.findByLabelText('Nome');
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(await screen.findByText('Nome é obrigatório.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalledWith('/trainer/challenges', expect.anything());
  });

  it('calls onClose when backdrop clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    api.post.mockResolvedValue({ data: { count: 0 } });
    const { container } = renderWithRouter(<QuickCreateChallengeSheet onClose={onClose} />);
    await user.click(container.querySelector('.overlay'));
    expect(onClose).toHaveBeenCalled();
  });
});
