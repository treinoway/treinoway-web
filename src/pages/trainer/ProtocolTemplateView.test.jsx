import { screen, waitFor, within } from '@testing-library/react';
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
    route: '/trainer/routines/1',
    path: '/trainer/routines/:id',
  });

const waitForLoaded = () => screen.findByRole('heading', { name: 'Hipertrofia 12 Semanas', level: 1 });

describe('ProtocolTemplateView', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    api.delete.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    setupApiMocks();
  });

  it('shows an in-place loading state with the back button available', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderView();
    expect(screen.getByRole('status', { name: 'Carregando rotina' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
  });

  it('renders hero with name, type and level tags and description', async () => {
    renderView();
    await waitForLoaded();
    expect(screen.getByText('Força')).toBeInTheDocument();
    expect(screen.getAllByText('Intermediário').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Programa de hipertrofia focado em ganho de massa muscular.'),
    ).toBeInTheDocument();
  });

  it('renders metric cards with duration, trainings and level', async () => {
    renderView();
    await waitForLoaded();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('semanas')).toBeInTheDocument();
    expect(screen.getByText('por semana')).toBeInTheDocument();
    expect(screen.getByText('masculino')).toBeInTheDocument();
  });

  it('renders the week grid and the trainings section with count', async () => {
    renderView();
    await waitForLoaded();
    expect(screen.getByRole('heading', { name: 'Semana' })).toBeInTheDocument();
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Treinos \(2\)/ })).toBeInTheDocument();
  });

  it('keeps training exercises collapsed and shows a preview', async () => {
    renderView();
    await waitForLoaded();
    const toggle = await screen.findByRole('button', { name: 'Treino Peito e Tríceps' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/Supino Reto · Tríceps Pulley/)).toBeInTheDocument();
    expect(screen.queryByText('Manter cotovelos fixos')).not.toBeVisible();
  });

  it('expands and collapses a training via the accordion button', async () => {
    const user = userEvent.setup();
    renderView();
    await waitForLoaded();
    const toggle = await screen.findByRole('button', { name: 'Treino Peito e Tríceps' });

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Manter cotovelos fixos')).toBeVisible();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Manter cotovelos fixos')).not.toBeVisible();
  });

  it('expands all trainings and then collapses them all', async () => {
    const user = userEvent.setup();
    renderView();
    await waitForLoaded();

    await user.click(screen.getByRole('button', { name: 'Expandir tudo' }));
    screen
      .getAllByRole('button', { name: /^Treino / })
      .forEach((button) => expect(button).toHaveAttribute('aria-expanded', 'true'));

    await user.click(screen.getByRole('button', { name: 'Recolher tudo' }));
    screen
      .getAllByRole('button', { name: /^Treino / })
      .forEach((button) => expect(button).toHaveAttribute('aria-expanded', 'false'));
  });

  it('navigates to the edit page when Editar is clicked', async () => {
    const user = userEvent.setup();
    renderView();
    await waitForLoaded();
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/1/edit');
  });

  it('navigates back to the list when Voltar is clicked', async () => {
    const user = userEvent.setup();
    renderView();
    await waitForLoaded();
    await user.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines');
  });

  it('deletes after confirming in the dialog, toasts and returns to the list', async () => {
    const user = userEvent.setup();
    renderView();
    await waitForLoaded();

    await user.click(screen.getByRole('button', { name: 'Mais ações da rotina' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(/Excluir "Hipertrofia 12 Semanas"\? Esta ação não pode ser desfeita\./),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocol-templates/1');
    });
    expect(mockShowToast).toHaveBeenCalledWith('Rotina excluída com sucesso!', 'success');
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines');
  });

  it('closes the dialog without calling the API when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    renderView();
    await waitForLoaded();

    await user.click(screen.getByRole('button', { name: 'Mais ações da rotina' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows an error toast and stays when the delete request fails', async () => {
    const user = userEvent.setup();
    api.delete.mockRejectedValue({ userMessage: 'Falha ao excluir.' });
    renderView();
    await waitForLoaded();

    await user.click(screen.getByRole('button', { name: 'Mais ações da rotina' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha ao excluir.', 'error');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows the not-found block only after the request completes', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValue({ response: { status: 404 } });
    renderView();

    expect(await screen.findByText('Rotina não encontrada')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para rotinas' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines');
  });

  it('shows an alert with retry when the fetch fails, and recovers on retry', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockRejectedValueOnce({ userMessage: 'Erro ao carregar rotina.' });
    renderView();

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao carregar rotina.');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitForLoaded();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an empty message for a routine without trainings', async () => {
    api.get.mockResolvedValue({ data: { ...mockTemplate, trainings: [] } });
    renderView();
    await waitForLoaded();
    expect(screen.getByText('Sem treinos nesta rotina ainda')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expandir tudo' })).not.toBeInTheDocument();
  });
});
