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
    api.post.mockResolvedValue({ data: { count: 5 } });
  });

  it('renders template cards on open', async () => {
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    expect(await screen.findByText('Sprint de 7 dias')).toBeInTheDocument();
    expect(screen.getByText('Desafio quinzenal')).toBeInTheDocument();
    expect(screen.getByText('Campeonato mensal')).toBeInTheDocument();
    expect(screen.getByText('Criar do zero')).toBeInTheDocument();
  });

  it('navigates to full form on "Criar do zero" click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<QuickCreateChallengeSheet onClose={onClose} />);
    await user.click(await screen.findByRole('button', { name: 'Criar do zero' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows confirmation step after selecting a template', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Sprint de 7 dias' }));
    expect(screen.getByLabelText('Nome do campeonato')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sprint Semanal')).toBeInTheDocument();
    expect(screen.getByText('Regras de pontuação')).toBeInTheDocument();
    expect(screen.getByText('Como vai funcionar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lançar campeonato/i })).toBeInTheDocument();
  });

  it('back button returns to selection', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Sprint de 7 dias' }));
    expect(screen.getByLabelText('Nome do campeonato')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Desafio quinzenal')).toBeInTheDocument();
    expect(screen.getByText('Campeonato mensal')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome do campeonato')).not.toBeInTheDocument();
  });

  it('shows participant count', async () => {
    api.post.mockImplementation((url) => {
      if (url === '/trainer/challenges/preview-participants') return Promise.resolve({ data: { count: 8 } });
      return Promise.reject(new Error('unexpected'));
    });
    const user = userEvent.setup();
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Sprint de 7 dias' }));
    expect(await screen.findByText('8 alunos participam')).toBeInTheDocument();
  });

  it('shows reassuring message when 0 students', async () => {
    api.post.mockImplementation((url) => {
      if (url === '/trainer/challenges/preview-participants') return Promise.resolve({ data: { count: 0 } });
      return Promise.reject(new Error('unexpected'));
    });
    const user = userEvent.setup();
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Sprint de 7 dias' }));
    expect(await screen.findByText('Você poderá adicionar alunos após criar o campeonato')).toBeInTheDocument();
  });

  it('creates challenge on CTA click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreated = vi.fn();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/challenges/preview-participants') return Promise.resolve({ data: { count: 5 } });
      if (url === '/trainer/challenges') return Promise.resolve({ data: { id: 'ch-99' } });
      return Promise.reject(new Error('unexpected'));
    });
    renderWithRouter(<QuickCreateChallengeSheet onClose={onClose} onCreated={onCreated} />);
    await user.click(await screen.findByRole('button', { name: 'Sprint de 7 dias' }));
    await user.click(await screen.findByRole('button', { name: /lançar campeonato/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/challenges', expect.objectContaining({
        name: 'Sprint Semanal',
        participantMode: 'all',
      }));
    });
    expect(onCreated).toHaveBeenCalledWith('ch-99');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows name validation error', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Sprint de 7 dias' }));
    const nameInput = await screen.findByLabelText('Nome do campeonato');
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /lançar campeonato/i }));
    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalledWith('/trainer/challenges', expect.anything());
  });

  it('opens points editor when clicking Editar', async () => {
    const user = userEvent.setup();
    renderWithRouter(<QuickCreateChallengeSheet onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Sprint de 7 dias' }));
    await user.click(await screen.findByRole('button', { name: /editar regras de pontuação/i }));
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restaurar padrão/i })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<QuickCreateChallengeSheet onClose={onClose} />);
    await user.click(await screen.findByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
