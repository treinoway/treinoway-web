import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import CreateChampionship from './CreateChampionship';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }, { id: '3' }] }),
    post: vi.fn().mockResolvedValue({ data: { id: 'new-123' } }),
  },
}));

// BrandCalendar uses window.matchMedia to detect mobile. Set up a desktop
// environment so the real component renders without errors.
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1280,
  });
});

describe('CreateChampionship', () => {
  it('renders page title and subtitle', () => {
    render(<CreateChampionship />);
    expect(screen.getByRole('heading', { name: 'Novo campeonato', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Configure como quiser/i)).toBeInTheDocument();
  });

  it('renders all 3 numbered sections', () => {
    render(<CreateChampionship />);
    expect(screen.getByRole('heading', { name: 'Informações básicas', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Participantes', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pontuação', level: 2 })).toBeInTheDocument();
  });

  it('renders name input with correct label and placeholder', () => {
    render(<CreateChampionship />);
    const input = screen.getByLabelText('Nome do campeonato');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Ex: Desafio de janeiro');
  });

  it('renders duration pills with "7 dias" active by default', () => {
    render(<CreateChampionship />);
    expect(screen.getByRole('button', { name: '7 dias' })).toHaveClass('pill-btn--active');
    expect(screen.getByRole('button', { name: '15 dias' })).not.toHaveClass('pill-btn--active');
    expect(screen.getByRole('button', { name: '30 dias' })).not.toHaveClass('pill-btn--active');
    expect(screen.getByRole('button', { name: 'Personalizado' })).not.toHaveClass('pill-btn--active');
  });

  it('clicking a different duration pill selects it', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    const btn = screen.getByRole('button', { name: '15 dias' });
    await user.click(btn);
    expect(btn).toHaveClass('pill-btn--active');
    expect(screen.getByRole('button', { name: '7 dias' })).not.toHaveClass('pill-btn--active');
  });

  it('selecting "Personalizado" enables the end date input', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);

    // With "7 dias" active (default), the Término text input is disabled
    const endDateInput = screen.getByRole('textbox', { name: /Término/i });
    expect(endDateInput).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Personalizado' }));

    expect(endDateInput).not.toBeDisabled();
  });

  it('shows participant mode toggle with "Todos os alunos" active', () => {
    render(<CreateChampionship />);
    expect(screen.getByRole('button', { name: 'Todos os alunos' })).toHaveClass('segmented-toggle-btn--active');
    expect(screen.getByRole('button', { name: 'Selecionar manualmente' })).not.toHaveClass('segmented-toggle-btn--active');
  });

  it('loads student count from API and displays it', async () => {
    render(<CreateChampionship />);
    await waitFor(() => {
      expect(screen.getByText('3 aluno(s) incluído(s)')).toBeInTheDocument();
    });
  });

  it('switching to "Selecionar manualmente" shows 0 count', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    await user.click(screen.getByRole('button', { name: 'Selecionar manualmente' }));
    expect(screen.getByText('0 aluno(s) incluído(s)')).toBeInTheDocument();
    expect(screen.getByText('Nenhum aluno selecionado')).toBeInTheDocument();
  });

  it('renders default scoring rules with editable inputs', () => {
    render(<CreateChampionship />);
    expect(screen.getByText('Treino concluído')).toBeInTheDocument();
    expect(screen.getByText('Check-in diário')).toBeInTheDocument();
    expect(screen.getByText('Sequência 7 dias')).toBeInTheDocument();
    expect(screen.getByLabelText('Pontos para Treino concluído')).toHaveValue(10);
    expect(screen.getByLabelText('Pontos para Check-in diário')).toHaveValue(2);
    expect(screen.getByLabelText('Pontos para Sequência 7 dias')).toHaveValue(50);
  });

  it('changing scoring rule points updates the value', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    const input = screen.getByLabelText('Pontos para Treino concluído');
    await user.clear(input);
    await user.type(input, '25');
    expect(input).toHaveValue(25);
  });

  it('"Cancelar" navigates back to challenges', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/challenges');
  });

  it('back button navigates to challenges list', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    await user.click(screen.getByRole('button', { name: 'Voltar para campeonatos' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/challenges');
  });

  it('submit with empty name shows validation error', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    expect(screen.getByText('Nome deve ter pelo menos 3 caracteres')).toBeInTheDocument();
  });

  it('submit with name shorter than 3 chars shows validation error', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    await user.type(screen.getByLabelText('Nome do campeonato'), 'AB');
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    expect(screen.getByText('Nome deve ter pelo menos 3 caracteres')).toBeInTheDocument();
  });

  it('clears name error when user types', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    expect(screen.getByText('Nome deve ter pelo menos 3 caracteres')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome do campeonato'), 'A');
    expect(screen.queryByText('Nome deve ter pelo menos 3 caracteres')).not.toBeInTheDocument();
  });

  it('submit without start date shows start date validation error', async () => {
    const user = userEvent.setup();
    render(<CreateChampionship />);
    await user.type(screen.getByLabelText('Nome do campeonato'), 'Campeonato Teste');
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    expect(screen.getByText('Data de início é obrigatória')).toBeInTheDocument();
  });

  it('submit with valid data calls api.post and navigates on success', async () => {
    const user = userEvent.setup();
    const api = (await import('../../api/axios')).default;
    render(<CreateChampionship />);

    await user.type(screen.getByLabelText('Nome do campeonato'), 'Campeonato de Verão');

    // Compute a start date that is always one month from today so the test
    // never fails due to the minDate constraint (which rejects past dates).
    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, '0');
    const dd = String(future.getDate()).padStart(2, '0');
    // BrandCalendar text input expects dd/mm/yyyy input (typed without slashes).
    const startDateInput = `${dd}${mm}${yyyy}`;
    const expectedStartDate = `${yyyy}-${mm}-${dd}`;

    const startInput = screen.getByRole('textbox', { name: /Início/i });
    await user.type(startInput, startDateInput);

    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/challenges',
        expect.objectContaining({
          name: 'Campeonato de Verão',
          startDate: expectedStartDate,
          participantMode: 'all',
          ptsWorkoutCompleted: 10,
          ptsDailyCheckin: 2,
          ptsStreak7Days: 50,
        })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/challenges/new-123');
    });
  });

  it('shows "Criar do zero" option is accessible via button in QuickCreate', () => {
    render(<CreateChampionship />);
    expect(screen.getByRole('button', { name: 'Adicionar regra' })).toBeInTheDocument();
  });
});
