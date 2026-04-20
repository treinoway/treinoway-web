import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import ProtocolTemplateView from './ProtocolTemplateView';
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

const mockTemplate = {
  id: '1',
  name: 'Hipertrofia 12 Semanas',
  description: 'Programa de hipertrofia focado em ganho de massa muscular.',
  type: 'strength',
  trainingLevel: 'intermediate',
  genderOrdination: 'male',
  defaultDurationWeeks: 12,
  trainings: [
    {
      id: 'st1',
      order: 1,
      weekDay: 'monday',
      trainingTemplate: {
        id: 'tt1',
        name: 'Peito e Tríceps',
        trainingTemplateExerciseTemplates: [
          {
            sets: 4,
            repetitions: { min: 8, max: 10 },
            restInterval: 90,
            notes: null,
            exerciseTemplate: { id: 'ex1', name: 'Supino Reto' },
          },
          {
            sets: 3,
            repetitions: { min: 12, max: 12 },
            restInterval: 60,
            notes: 'Manter cotovelos fixos',
            exerciseTemplate: { id: 'ex2', name: 'Tríceps Pulley' },
          },
        ],
      },
    },
    {
      id: 'st2',
      order: 2,
      weekDay: 'wednesday',
      trainingTemplate: {
        id: 'tt2',
        name: 'Costas e Bíceps',
        trainingTemplateExerciseTemplates: [],
      },
    },
  ],
};

const setupApiMocks = () => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/protocol-templates/1') {
      return Promise.resolve({ data: mockTemplate });
    }
    if (url === '/trainer/training-templates/tt1') {
      return Promise.resolve({
        data: {
          trainingTemplateExerciseTemplates:
            mockTemplate.trainings[0].trainingTemplate.trainingTemplateExerciseTemplates,
        },
      });
    }
    if (url === '/trainer/training-templates/tt2') {
      return Promise.resolve({ data: { trainingTemplateExerciseTemplates: [] } });
    }
    return Promise.resolve({ data: [] });
  });
  api.delete.mockResolvedValue({});
};

const renderView = () =>
  renderWithRoute(<ProtocolTemplateView />, {
    route: '/trainer/protocol-templates/1',
    path: '/trainer/protocol-templates/:id',
  });

describe('ProtocolTemplateView', () => {
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

  it('renders template name and eyebrow with type badge after load', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia 12 Semanas')).toBeInTheDocument();
    });

    // eyebrow div contains mixed text nodes + badge spans — query the div directly
    const eyebrow = document.querySelector('.page-header-eyebrow');
    expect(eyebrow).toBeInTheDocument();
    expect(eyebrow.textContent.toLowerCase()).toContain('template de rotina');
    // type badge inline
    expect(screen.getByText('Força')).toBeInTheDocument();
    // level badge inline — appears in both eyebrow and stat strip
    expect(screen.getAllByText('Intermediário').length).toBeGreaterThanOrEqual(1);
  });

  it('renders description as lead-description', async () => {
    renderView();

    await waitFor(() => {
      expect(
        screen.getByText('Programa de hipertrofia focado em ganho de massa muscular.'),
      ).toBeInTheDocument();
    });
  });

  it('renders stat strip with duration and trainings count', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia 12 Semanas')).toBeInTheDocument();
    });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('semanas')).toBeInTheDocument();
    expect(screen.getByText('por semana')).toBeInTheDocument();
    // level appears twice (eyebrow badge + stat value) — confirm both render
    expect(screen.getAllByText('Intermediário')).toHaveLength(2);
    // gender unit below the level stat
    expect(screen.getByText('masculino')).toBeInTheDocument();
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
      expect(screen.getByText('Hipertrofia 12 Semanas')).toBeInTheDocument();
    });

    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();
  });

  it('renders collapsed training cards without showing exercise names', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Peito e Tríceps')).toBeInTheDocument();
    });

    expect(screen.getByText('Costas e Bíceps')).toBeInTheDocument();
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument();
    expect(screen.queryByText('Tríceps Pulley')).not.toBeInTheDocument();
  });

  it('expands a training card to show exercises on click', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Peito e Tríceps')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /expandir treino peito e tríceps/i });
    await user.click(toggleBtn);

    expect(screen.getByText('Supino Reto')).toBeInTheDocument();
    expect(screen.getByText('Tríceps Pulley')).toBeInTheDocument();
    expect(screen.getByText('Manter cotovelos fixos')).toBeInTheDocument();
  });

  it('collapses an expanded training card on second click', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Peito e Tríceps')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /expandir treino peito e tríceps/i });
    await user.click(toggleBtn);
    expect(screen.getByText('Supino Reto')).toBeInTheDocument();

    await user.click(toggleBtn);
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument();
  });

  it('navigates to edit page when Editar button is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia 12 Semanas')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates/1/edit');
  });

  it('navigates back to list when back button is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia 12 Semanas')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /templates de rotina/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates');
  });

  it('shows confirm dialog when delete icon button is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia 12 Semanas')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir rotina/i }));

    expect(
      screen.getByText(/Excluir "Hipertrofia 12 Semanas"\? Esta ação não pode ser desfeita\./i),
    ).toBeInTheDocument();
  });

  it('calls DELETE and navigates away after confirming delete', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia 12 Semanas')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir rotina/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocol-templates/1');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates');
    expect(mockShowToast).toHaveBeenCalledWith('Rotina excluída com sucesso!', 'success');
  });

  it('closes confirm dialog and makes no API call when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Hipertrofia 12 Semanas')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir rotina/i }));
    expect(screen.getByText(/Esta ação não pode ser desfeita/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText(/Esta ação não pode ser desfeita/i)).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows error toast and navigates to list when fetch fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar rotina.' });
    renderView();

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar rotina.', 'error');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates');
  });

  it('renders exercise preview text in collapsed card after exercises load', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText('Peito e Tríceps')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Supino Reto · Tríceps Pulley/i)).toBeInTheDocument();
    });
  });
});
