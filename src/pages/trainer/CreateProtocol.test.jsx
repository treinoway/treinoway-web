import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../../test-utils/selectOption';
import { renderWithRoute } from '../../test/test-utils';
import CreateProtocol from './CreateProtocol';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../components/CreateExerciseModal', () => ({
  default: vi.fn(({ open, onClose, onSuccess, headerContent }) => {
    if (!open) return null;
    return (
      <div data-testid="create-exercise-modal">
        {headerContent}
        <button
          onClick={() => {
            // Simulate ExerciseForm draft mode: only calls onSuccess, NOT onClose.
            // The parent (handleInlineExerciseSuccess) is responsible for closing the modal.
            onSuccess?.({ name: 'Exercício Draft', type: 'strength', hasLoad: false });
          }}
        >
          Salvar Exercício
        </button>
        <button onClick={onClose}>Fechar Modal Exercício</button>
      </div>
    );
  }),
}));

const mockShowToast = vi.fn();

const mockStudent = {
  id: 'student-1',
  email: 'aluno@example.com',
  firstName: 'Aluno',
  lastName: 'Exemplo',
};

const mockTemplate = {
  id: 1,
  name: 'Modelo Base',
  description: 'Desc',
  defaultDurationWeeks: 12,
  genderOrdination: 'female',
  trainingLevel: 'beginner',
  scheduleTemplatesCount: 2,
};

const mockTemplateDetail = {
  ...mockTemplate,
  scheduleTemplates: [
    {
      order: 1,
      weekDay: 'MONDAY',
      trainingTemplateId: 'tt-1',
      trainingTemplate: { id: 'tt-1', name: 'Treino A', category: 'strength' },
    },
    {
      order: 2,
      weekDay: 'WEDNESDAY',
      trainingTemplateId: 'tt-2',
      trainingTemplate: { id: 'tt-2', name: 'Treino B', category: 'cardio' },
    },
  ],
};

const mockExerciseTemplates = [
  { id: 'ex-1', name: 'Supino Reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 10 }, hasLoad: true, suggestedLoad: 60 },
  { id: 'ex-2', name: 'Tríceps Polia', type: 'strength', sets: 3, repetitions: { min: 12, max: 12 }, hasLoad: false, suggestedLoad: null },
  { id: 'ex-3', name: 'Esteira', type: 'cardio', duration: 600, hasLoad: false, suggestedLoad: null },
];

const mockTrainingTemplates = [
  {
    id: 'tt-1',
    name: 'Treino A',
    category: 'strength',
    trainingTemplateExerciseTemplates: [
      { order: 1, exerciseTemplate: mockExerciseTemplates[0] },
      { order: 2, exerciseTemplate: mockExerciseTemplates[1] },
    ],
  },
  {
    id: 'tt-2',
    name: 'Treino B',
    category: 'cardio',
    trainingTemplateExerciseTemplates: [
      { order: 1, exerciseTemplate: mockExerciseTemplates[2] },
    ],
  },
];

const mockTrainingTemplateDetailA = {
  id: 'tt-1',
  name: 'Treino A',
  category: 'strength',
  trainingTemplateExerciseTemplates: [
    { exerciseTemplateId: 'ex-1', exerciseTemplate: mockExerciseTemplates[0] },
    { exerciseTemplateId: 'ex-2', exerciseTemplate: mockExerciseTemplates[1] },
  ],
};

const mockTrainingTemplateDetailB = {
  id: 'tt-2',
  name: 'Treino B',
  category: 'cardio',
  trainingTemplateExerciseTemplates: [
    { exerciseTemplateId: 'ex-3', exerciseTemplate: mockExerciseTemplates[2] },
  ],
};

describe('CreateProtocol', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [mockTemplate] });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
      if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocol-templates/1') return Promise.resolve({ data: mockTemplateDetail });
      if (url === '/trainer/training-templates/tt-1') return Promise.resolve({ data: mockTrainingTemplateDetailA });
      if (url === '/trainer/training-templates/tt-2') return Promise.resolve({ data: mockTrainingTemplateDetailB });
      return Promise.resolve({ data: [] });
    });

    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  const renderPage = (route = '/trainer/protocols/new?studentId=student-1') =>
    renderWithRoute(<CreateProtocol />, { route, path: '/trainer/protocols/new' });

  const renderPageWithoutStudent = () =>
    renderWithRoute(<CreateProtocol />, { route: '/trainer/protocols/new', path: '/trainer/protocols/new' });

  it('shows selected student from query string', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });
  });

  it('creates protocol using selected student', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 55 } });

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.type(screen.getByLabelText(/^nome da rotina/i), 'Rotina Nova');
    fireEvent.change(screen.getByLabelText(/^data de início/i), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText(/^data de término/i), { target: { value: '31/03/2024' } });
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols', expect.objectContaining({
        assigneeId: 'student-1',
        name: 'Rotina Nova',
        startDate: '2024-01-01',
        expirationDate: '2024-03-31',
      }));
      expect(api.post.mock.calls[0][1]).not.toHaveProperty('availableWeekDays');
      expect(mockShowToast).toHaveBeenCalledWith('Rotina criada com sucesso!', 'success');
    });
  });

  it('shows student search field when no studentId is provided', async () => {
    renderPageWithoutStudent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar por nome ou e-mail...')).toBeInTheDocument();
    });
  });

  it('searches and selects a student via fuzzy search', async () => {
    const user = userEvent.setup({ delay: null });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [mockTemplate] });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/search') return Promise.resolve({ data: [mockStudent] });
      return Promise.resolve({ data: [] });
    });

    renderPageWithoutStudent();

    const searchInput = await screen.findByPlaceholderText('Buscar por nome ou e-mail...');
    await user.type(searchInput, 'Aluno');

    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Aluno Exemplo'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Buscar por nome ou e-mail...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Trocar aluno')).toBeInTheDocument();
  });

  it('clears student selection when "Trocar aluno" is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/search') return Promise.resolve({ data: [mockStudent] });
      return Promise.resolve({ data: [] });
    });

    renderPageWithoutStudent();

    const searchInput = await screen.findByPlaceholderText('Buscar por nome ou e-mail...');
    await user.type(searchInput, 'Aluno');

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByText('Aluno Exemplo'));
    await waitFor(() => screen.getByText('Trocar aluno'));

    await user.click(screen.getByText('Trocar aluno'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar por nome ou e-mail...')).toBeInTheDocument();
    });
    expect(screen.queryByText('Trocar aluno')).not.toBeInTheDocument();
  });

  it('imports protocol from selected template', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 91 } });

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await selectOption(user,screen.getByLabelText('Importar rotina'), '1');
    fireEvent.change(screen.getByLabelText(/^data de início/i), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText(/^data de término/i), { target: { value: '31/03/2024' } });
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/import-from-template', expect.objectContaining({
        templateId: '1',
        assigneeId: 'student-1',
        name: 'Modelo Base',
      }));
      expect(api.post.mock.calls[0][1]).not.toHaveProperty('availableWeekDays');
    });
  });

  it('populates training rows when a template with schedule templates is selected', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await selectOption(user,screen.getByLabelText('Importar rotina'), '1');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/protocol-templates/1');
    });

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });
  });

  it('does not duplicate template trainings on form submit when using import-from-template', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 91 } });

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await selectOption(user,screen.getByLabelText('Importar rotina'), '1');

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^data de início/i), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText(/^data de término/i), { target: { value: '31/03/2024' } });
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/import-from-template', expect.objectContaining({
        templateId: '1',
      }));
      const trainingPostCalls = api.post.mock.calls.filter(([url]) =>
        url.includes('/trainings')
      );
      expect(trainingPostCalls).toHaveLength(0);
    });
  });

  it('clears template trainings when template selection is cleared', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await selectOption(user,screen.getByLabelText('Importar rotina'), '1');

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
    });

    await selectOption(user,screen.getByLabelText('Importar rotina'), '');

    await waitFor(() => {
      expect(screen.queryByText('Treino A')).not.toBeInTheDocument();
      expect(screen.queryByText('Treino B')).not.toBeInTheDocument();
    });
  });

  it('opens add training modal when "+ Adicionar treino" is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

    expect(screen.getByText('Adicionar Treino')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument();
  });

  it('closes add training modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
    expect(screen.getByText('Adicionar Treino')).toBeInTheDocument();

    const modal = screen.getByText('Adicionar Treino').closest('.bottom-sheet');
    await user.click(within(modal).getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByText('Adicionar Treino')).not.toBeInTheDocument();
  });

  it('allows adding a training manually via modal', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 77 } });

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

    await user.type(screen.getByLabelText('Nome'), 'Treino Manual');
    await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    expect(screen.queryByText('Adicionar Treino')).not.toBeInTheDocument();
    expect(screen.getByText('Treino Manual')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^nome da rotina/i), 'Rotina Direta');
    fireEvent.change(screen.getByLabelText(/^data de início/i), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText(/^data de término/i), { target: { value: '31/03/2024' } });
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/trainings'), expect.objectContaining({
        name: 'Treino Manual',
        category: 'strength',
      }));
    });
  });

  it('displays exercise templates when importing from protocol template', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await selectOption(user,screen.getByLabelText('Importar rotina'), '1');

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      expect(screen.getByText('Tríceps Polia')).toBeInTheDocument();
      expect(screen.getByText('Esteira')).toBeInTheDocument();
    });
  });

  it('displays exercise templates when adding training with template via modal', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

    await selectOption(user,
      screen.getByLabelText(/importar treino único/i),
      'tt-1',
    );
    await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      expect(screen.getByText('Tríceps Polia')).toBeInTheDocument();
    });
  });

  it('shows exercise preview inside modal when a training template is selected', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

    const modal = screen.getByText('Adicionar Treino').closest('.bottom-sheet');
    expect(within(modal).queryByText('Exercícios inclusos')).not.toBeInTheDocument();

    await selectOption(user,
      within(modal).getByLabelText(/importar treino único/i),
      'tt-1',
    );

    await waitFor(() => {
      expect(within(modal).getByText('Exercícios inclusos')).toBeInTheDocument();
      expect(within(modal).getByText('Supino Reto')).toBeInTheDocument();
      expect(within(modal).getByText('Tríceps Polia')).toBeInTheDocument();
    });
  });

  it('hides exercise preview inside modal when template selection is cleared', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

    const modal = screen.getByText('Adicionar Treino').closest('.bottom-sheet');
    await selectOption(user,within(modal).getByLabelText(/importar treino único/i), 'tt-1');

    await waitFor(() => {
      expect(within(modal).getByText('Supino Reto')).toBeInTheDocument();
    });

    await selectOption(user,within(modal).getByLabelText(/importar treino único/i), '');

    await waitFor(() => {
      expect(within(modal).queryByText('Exercícios inclusos')).not.toBeInTheDocument();
      expect(within(modal).queryByText('Supino Reto')).not.toBeInTheDocument();
    });
  });

  it('does not show exercises when training has no template', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

    await user.type(screen.getByLabelText('Nome'), 'Treino Sem Modelo');
    await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
    await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

    expect(screen.getByText('Treino Sem Modelo')).toBeInTheDocument();
    expect(screen.queryByText('Supino Reto')).not.toBeInTheDocument();
    expect(screen.queryByText('Tríceps Polia')).not.toBeInTheDocument();
  });

  describe('inline exercises in training modal', () => {
    it('shows "Criar exercício" button inside the add training modal', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

      expect(screen.getByRole('button', { name: /\+ criar exercício/i })).toBeInTheDocument();
    });

    it('opens CreateExerciseModal when "Criar exercício" is clicked inside training modal', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));

      expect(screen.getByTestId('create-exercise-modal')).toBeInTheDocument();
    });

    it('adds draft exercise to modal list when CreateExerciseModal calls onSuccess', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));

      const addTrainingModal = screen.getByText('Adicionar Treino').closest('.bottom-sheet');
      expect(addTrainingModal).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /salvar exercício/i }));

      expect(screen.queryByTestId('create-exercise-modal')).not.toBeInTheDocument();
      expect(within(addTrainingModal).getByText('Exercício Draft')).toBeInTheDocument();
    });

    it('removes draft exercise from modal list when "Remover" is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));
      await user.click(screen.getByRole('button', { name: /salvar exercício/i }));

      const addTrainingModal = screen.getByText('Adicionar Treino').closest('.bottom-sheet');
      expect(within(addTrainingModal).getByText('Exercício Draft')).toBeInTheDocument();

      await user.click(within(addTrainingModal).getByRole('button', { name: /remover exercício Exercício Draft/i }));

      expect(within(addTrainingModal).queryByText('Exercício Draft')).not.toBeInTheDocument();
    });

    it('includes draft exercises when training is added to the list', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

      await user.type(screen.getByLabelText('Nome'), 'Treino Com Exercício');
      await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));
      await user.click(screen.getByRole('button', { name: /salvar exercício/i }));
      await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

      expect(screen.queryByText('Adicionar Treino')).not.toBeInTheDocument();
      expect(screen.getByText('Treino Com Exercício')).toBeInTheDocument();
      expect(screen.getByText('Exercício Draft')).toBeInTheDocument();
    });
  });

  describe('inline exercise from template', () => {
    it('shows "Importar de modelo" toggle button inside exercise modal', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));

      expect(screen.getByRole('button', { name: /importar exercício/i })).toBeInTheDocument();
    });

    it('switches to from-template mode when "Importar de modelo" is clicked', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));
      await user.click(screen.getByRole('button', { name: /importar exercício/i }));

      expect(screen.queryByTestId('create-exercise-modal')).not.toBeInTheDocument();
      const exercisePicker = screen.getByLabelText('Modelo de exercício');
      expect(exercisePicker).toBeInTheDocument();
      await user.click(exercisePicker);
      expect(screen.getByRole('option', { name: 'Supino Reto' })).toBeInTheDocument();
    });

    it('adds exercise from template to inline list in training modal', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));
      await user.click(screen.getByRole('button', { name: /importar exercício/i }));

      const fromTemplateOverlay = screen.getByLabelText('Modelo de exercício').closest('.bottom-sheet');
      await selectOption(user,within(fromTemplateOverlay).getByLabelText('Modelo de exercício'), 'ex-1');
      await user.click(within(fromTemplateOverlay).getByRole('button', { name: /^adicionar$/i }));

      const modal = screen.getByText('Adicionar Treino').closest('.bottom-sheet');
      expect(within(modal).getByText('Supino Reto')).toBeInTheDocument();
    });

    it('switches back to create mode when "Criar novo" is clicked from template overlay', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));
      await user.click(screen.getByRole('button', { name: /importar exercício/i }));

      expect(screen.queryByTestId('create-exercise-modal')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /^criar novo$/i }));

      expect(screen.getByTestId('create-exercise-modal')).toBeInTheDocument();
    });

    it('adds exercise from template to training row', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.type(screen.getByLabelText('Nome'), 'Treino Manual');
      await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
      await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

      await user.click(screen.getByRole('button', { name: /\+ adicionar exercício/i }));
      await user.click(screen.getByRole('button', { name: /importar exercício/i }));

      const fromTemplateOverlay = screen.getByLabelText('Modelo de exercício').closest('.bottom-sheet');
      await selectOption(user,within(fromTemplateOverlay).getByLabelText('Modelo de exercício'), 'ex-2');
      await user.click(within(fromTemplateOverlay).getByRole('button', { name: /^adicionar$/i }));

      expect(screen.getByText('Tríceps Polia')).toBeInTheDocument();
    });
  });

  describe('inline exercises in training row', () => {
    it('shows "Adicionar exercício" button in training row for manual trainings', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.type(screen.getByLabelText('Nome'), 'Treino Manual');
      await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
      await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

      expect(screen.getByRole('button', { name: /\+ adicionar exercício/i })).toBeInTheDocument();
    });

    it('does not show "Adicionar exercício" button for fromTemplate trainings', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await selectOption(user,screen.getByLabelText('Importar rotina'), '1');

      await waitFor(() => screen.getByText('Treino A'));

      expect(screen.queryByRole('button', { name: /\+ adicionar exercício/i })).not.toBeInTheDocument();
    });

    it('adds exercise to training row when CreateExerciseModal calls onSuccess from row', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.type(screen.getByLabelText('Nome'), 'Treino Manual');
      await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
      await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

      await user.click(screen.getByRole('button', { name: /\+ adicionar exercício/i }));
      await user.click(screen.getByRole('button', { name: /salvar exercício/i }));

      expect(screen.queryByTestId('create-exercise-modal')).not.toBeInTheDocument();
      expect(screen.getByText('Exercício Draft')).toBeInTheDocument();
    });
  });

  describe('submit with inline exercises', () => {
    it('calls POST to create exercises after creating training', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({ data: { id: 99 } });
      api.post.mockResolvedValueOnce({ data: { id: 'training-99' } });
      api.post.mockResolvedValueOnce({ data: {} });

      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));

      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await user.type(screen.getByLabelText('Nome'), 'Treino Com Exercício');
      await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
      await user.click(screen.getByRole('button', { name: /\+ criar exercício/i }));
      await user.click(screen.getByRole('button', { name: /salvar exercício/i }));
      await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

      await user.type(screen.getByLabelText(/^nome da rotina/i), 'Minha Rotina');
      fireEvent.change(screen.getByLabelText(/^data de início/i), { target: { value: '01/01/2024' } });
      fireEvent.change(screen.getByLabelText(/^data de término/i), { target: { value: '31/03/2024' } });
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        const trainingPostCalls = api.post.mock.calls.filter(([url]) =>
          url.includes('/trainings') && !url.includes('/exercises')
        );
        expect(trainingPostCalls.length).toBeGreaterThan(0);

        const exercisePostCalls = api.post.mock.calls.filter(([url]) =>
          url.includes('/exercises')
        );
        expect(exercisePostCalls.length).toBeGreaterThan(0);
        expect(exercisePostCalls[0][1]).toMatchObject({
          name: 'Exercício Draft',
          type: 'strength',
        });
      });
    });

    it('calls POST /trainer/exercises/from-template for each exercise when training has trainingTemplateId', async () => {
      const user = userEvent.setup();
      // Protocol creation → training creation → from-template calls
      api.post.mockResolvedValue({ data: { id: 'created-id' } });

      renderPage();

      await waitFor(() => screen.getByText('Aluno Exemplo'));

      // Add a training via the modal, selecting a training template (tt-1 has ex-1 and ex-2)
      await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));
      await selectOption(user,screen.getByLabelText(/importar treino único/i), 'tt-1');
      await selectOption(user,screen.getByLabelText('Categoria'), 'strength');
      await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

      // Wait for exercises from tt-1 to be fetched and rendered
      await waitFor(() => {
        expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/^nome da rotina/i), 'Rotina Template');
      fireEvent.change(screen.getByLabelText(/^data de início/i), { target: { value: '01/01/2024' } });
      fireEvent.change(screen.getByLabelText(/^data de término/i), { target: { value: '31/03/2024' } });
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        const fromTemplateCalls = api.post.mock.calls.filter(
          ([url]) => url === '/trainer/exercises/from-template'
        );
        // tt-1 has ex-1 and ex-2, so two calls expected
        expect(fromTemplateCalls).toHaveLength(2);
        expect(fromTemplateCalls[0][1]).toMatchObject({ trainingId: 'created-id', templateId: 'ex-1' });
        expect(fromTemplateCalls[1][1]).toMatchObject({ trainingId: 'created-id', templateId: 'ex-2' });
      });
    });
  });
});
