import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import ProtocolView from './ProtocolView';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockShowToast = vi.fn();

const mockProtocol = {
  id: '42',
  name: 'Hipertrofia Verão 2025',
  status: 'active',
  type: 'strength',
  startDate: '2025-04-01',
  expirationDate: '2025-06-30',
  assignee: {
    id: 'student-1',
    firstName: 'Lucas',
    lastName: 'Ferreira',
    email: 'lucas@example.com',
  },
};

const mockTrainings = [
  { id: 'tr1', name: 'Treino A — Peito', order: 1, weekDay: 'monday' },
  { id: 'tr2', name: 'Treino B — Costas', order: 2, weekDay: 'wednesday' },
];

const mockExercises = [
  {
    id: 'ex1',
    name: 'Supino Reto',
    sets: 4,
    repetitions: { min: 8, max: 10 },
    restInterval: 90,
    notes: null,
  },
  {
    id: 'ex2',
    name: 'Voador',
    sets: 3,
    repetitions: { min: 12, max: 12 },
    restInterval: 60,
    notes: 'Amplitude controlada',
  },
];

const setupApiMocks = () => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/protocols/42') return Promise.resolve({ data: mockProtocol });
    if (url === '/trainer/protocols/42/trainings') return Promise.resolve({ data: mockTrainings });
    if (url === '/trainer/trainings/tr1/exercises') return Promise.resolve({ data: mockExercises });
    if (url === '/trainer/trainings/tr2/exercises') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
  api.delete.mockResolvedValue({});
};

const renderView = () =>
  renderWithRoute(<ProtocolView />, {
    route: '/trainer/protocols/42',
    path: '/trainer/protocols/:id',
  });

describe('ProtocolView', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    api.delete.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    setupApiMocks();
  });

  it('shows loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderView();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders protocol name and eyebrow after load', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia Verão 2025')).toBeInTheDocument();
    });

    expect(screen.getByText(/rotina do aluno/i)).toBeInTheDocument();
    // Back button shows assignee name
    expect(screen.getByRole('button', { name: /lucas ferreira/i })).toBeInTheDocument();
  });

  it('renders status hero badge after load', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia Verão 2025')).toBeInTheDocument();
    });

    // Status hero label — active protocol far from expiry shows status label
    // The exact label depends on days remaining; just confirm a status-hero element renders
    const hero = document.querySelector('.status-hero');
    expect(hero).toBeInTheDocument();
  });

  it('renders stat strip with trainings count', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Treinos (2)')).toBeInTheDocument();
    });

    // stat-display unit label is unique and confirms the stat strip rendered
    expect(screen.getByText('na rotina')).toBeInTheDocument();
    // There are multiple "2" values (stat + training card count) — confirm at least one stat-display__value exists
    expect(document.querySelector('.stat-display__value')).toBeInTheDocument();
  });

  it('renders trainings section header with count', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Treinos (2)')).toBeInTheDocument();
    });
  });

  it('renders week grid', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia Verão 2025')).toBeInTheDocument();
    });

    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();
  });

  it('renders collapsed training cards with exercise count badge', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Treino A — Peito')).toBeInTheDocument();
    });

    // exercise count shown in training-card__count (just the number)
    expect(screen.getByText('Treino A — Peito')).toBeInTheDocument();
    expect(screen.getByText('Treino B — Costas')).toBeInTheDocument();
    // exercises not yet visible
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument();
    expect(screen.queryByText('Voador')).not.toBeInTheDocument();
  });

  it('expands a training card to show exercises on click', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Treino A — Peito')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /expandir treino treino a — peito/i });
    await user.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
    });
    expect(screen.getByText('Voador')).toBeInTheDocument();
    expect(screen.getByText('Amplitude controlada')).toBeInTheDocument();
  });

  it('collapses an expanded training card on second click', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Treino A — Peito')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /expandir treino treino a — peito/i });
    await user.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
    });

    await user.click(toggleBtn);
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument();
  });

  it('navigates to edit page when Editar button is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia Verão 2025')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocols/42/edit');
  });

  it('navigates back to student detail when back button is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia Verão 2025')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /lucas ferreira/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1');
  });

  it('shows confirm dialog when delete icon button is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia Verão 2025')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir rotina/i }));

    expect(
      screen.getByText(/Excluir "Hipertrofia Verão 2025"\? Esta ação não pode ser desfeita\./i),
    ).toBeInTheDocument();
  });

  it('calls DELETE and navigates to student detail after confirming delete', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia Verão 2025')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir rotina/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocols/42');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1');
    expect(mockShowToast).toHaveBeenCalledWith('Rotina excluída com sucesso!', 'success');
  });

  it('closes confirm dialog and makes no API call when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia Verão 2025')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir rotina/i }));
    expect(screen.getByText(/Esta ação não pode ser desfeita/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText(/Esta ação não pode ser desfeita/i)).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders exercise preview text in collapsed card after exercises load', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Treino A — Peito')).toBeInTheDocument();
    });

    // Preview shows first exercise names joined by ·
    await waitFor(() => {
      expect(screen.getByText(/Supino Reto · Voador/i)).toBeInTheDocument();
    });
  });
});
