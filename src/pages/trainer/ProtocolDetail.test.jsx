import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import ProtocolDetail from './ProtocolDetail';
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
  default: ({ open, onClose, onSuccess, trainingId, exercise }) =>
    open ? (
      <div data-testid="create-exercise-modal">
        <span data-testid="modal-exercise-id">{exercise?.id}</span>
        {trainingId && <span data-testid="modal-training-id">{trainingId}</span>}
        <button onClick={onClose} type="button">Fechar modal exercício</button>
        <button onClick={onSuccess} type="button">Salvar exercício</button>
      </div>
    ) : null,
}));

vi.mock('../../components/ExerciseForm', () => ({
  default: ({ onSuccess, onCancel, trainingId, headerContent }) => (
    <div data-testid="exercise-form">
      {headerContent}
      {trainingId && <span data-testid="form-training-id">{trainingId}</span>}
      <button onClick={onSuccess} type="button">Salvar exercício inline</button>
      <button onClick={onCancel} type="button">Cancelar exercício inline</button>
    </div>
  ),
}));

const mockShowToast = vi.fn();

const mockProtocol = {
  id: 1,
  status: 'ACTIVE',
  startDate: '2024-01-01',
  expirationDate: '2024-03-31',
  assignee: { firstName: 'Aluno', lastName: 'Teste', email: 'aluno@example.com' },
};

const mockTrainings = [
  {
    id: 10,
    name: 'Treino de Peito',
    description: 'Exercícios de peito',
    category: 'strength',
    bodySegment: 'upper',
    order: 1,
    weekDay: 'monday',
  },
];

const mockTrainingTemplates = [
  { id: 5, name: 'Template X' },
];

const mockExerciseTemplates = [
  { id: 20, name: 'Supino Reto', type: 'strength' },
  { id: 21, name: 'Corrida', type: 'cardio' },
];

const mockExercises = [
  { id: 100, name: 'Supino Reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 10 } },
];

function renderProtocolDetail() {
  return renderWithRoute(<ProtocolDetail />, {
    route: '/trainer/protocols/1',
    path: '/trainer/protocols/:id',
  });
}

describe('ProtocolDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });

    api.get.mockImplementation((url) => {
      if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
      if (url === '/trainer/protocols/1/trainings') return Promise.resolve({ data: mockTrainings });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
      if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
      if (url.match(/\/trainer\/trainings\/\d+\/exercises/)) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('shows loading state while protocol data is fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderProtocolDetail();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders protocol info after loading', async () => {
    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText(/aluno teste/i)).toBeInTheDocument();
    });
  });

  it('renders expiration date without showing Invalid Date', async () => {
    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Data de Término:')).toBeInTheDocument();
      expect(screen.getByText('31/03/2024')).toBeInTheDocument();
      expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
    });
  });

  it('renders the trainings list', async () => {
    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Treino de Peito')).toBeInTheDocument();
    });
  });

  it('renders weekDay badge when training has weekDay', async () => {
    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Treino de Peito')).toBeInTheDocument();
      expect(screen.getByText('Segunda-feira')).toBeInTheDocument();
    });
  });

  it('shows empty state when protocol has no trainings', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
      if (url === '/trainer/protocols/1/trainings') return Promise.resolve({ data: [] });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
      if (url === '/trainer/exercise-templates') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Nenhum treino ainda')).toBeInTheDocument();
    });
  });

  it('shows the training modal when "+ Adicionar Treino" is clicked', async () => {
    const user = userEvent.setup();
    renderProtocolDetail();

    await waitFor(() => screen.getByText(/aluno teste/i));
    await user.click(screen.getByRole('button', { name: /adicionar treino/i }));

    expect(screen.getByText('Adicionar Novo Treino')).toBeInTheDocument();
  });

  it('closes the training modal when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderProtocolDetail();

    await waitFor(() => screen.getByText(/aluno teste/i));
    await user.click(screen.getByRole('button', { name: /adicionar treino/i }));
    expect(screen.getByText('Adicionar Novo Treino')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(screen.queryByText('Adicionar Novo Treino')).not.toBeInTheDocument();
  });

  it('keeps the training list visible while the modal is open', async () => {
    const user = userEvent.setup();
    renderProtocolDetail();

    await waitFor(() => screen.getByText('Treino de Peito'));
    await user.click(screen.getByRole('button', { name: /adicionar treino/i }));

    expect(screen.getByText('Adicionar Novo Treino')).toBeInTheDocument();
    expect(screen.getByText('Treino de Peito')).toBeInTheDocument();
  });

  it('calls POST to create a training on form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 11, name: 'Novo Treino' } });

    const { container } = renderProtocolDetail();

    await waitFor(() => screen.getByText(/aluno teste/i));
    await user.click(screen.getByRole('button', { name: /adicionar treino/i }));

    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Novo Treino');

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/protocols/1/trainings',
        expect.objectContaining({ name: 'Novo Treino' })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Treino criado com sucesso!', 'success');
    });
  });

  it('calls DELETE and shows success toast when deleting a training', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderProtocolDetail();

    await waitFor(() => screen.getByText('Treino de Peito'));
    await user.click(screen.getByRole('button', { name: /ações do treino treino de peito/i }));
    await user.click(screen.getByRole('button', { name: /excluir/i }));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/trainings/10');
      expect(mockShowToast).toHaveBeenCalledWith('Treino excluído com sucesso!', 'success');
    });
  });

  it('calls PATCH on /trainer/trainings/:id when editing a training', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({});

    const { container } = renderProtocolDetail();

    await waitFor(() => screen.getByText('Treino de Peito'));
    await user.click(screen.getByRole('button', { name: /ações do treino treino de peito/i }));
    await user.click(screen.getByRole('button', { name: /editar/i }));

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/trainings/10',
        expect.objectContaining({ name: 'Treino de Peito', category: 'strength', bodySegment: 'upper' })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Treino atualizado com sucesso!', 'success');
    });
  });

  it('renders a back button that navigates to the protocols list', async () => {
    renderProtocolDetail();

    await waitFor(() => screen.getByText(/aluno teste/i));

    expect(screen.getByRole('button', { name: /voltar para rotinas/i })).toBeInTheDocument();
  });

  it('shows "+ Adicionar exercício" button on each training card', async () => {
    renderProtocolDetail();

    await waitFor(() => screen.getByText('Treino de Peito'));

    expect(screen.getByRole('button', { name: /adicionar exercício ao treino/i })).toBeInTheDocument();
  });

  it('shows existing exercises in the training card when loaded', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
      if (url === '/trainer/protocols/1/trainings') return Promise.resolve({ data: mockTrainings });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
      if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
      if (url.match(/\/trainer\/trainings\/\d+\/exercises/)) return Promise.resolve({ data: mockExercises });
      return Promise.resolve({ data: [] });
    });

    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
    });
  });

  describe('add exercise flow', () => {
    it('opens the add exercise bottom-sheet in "Criar novo" mode by default', async () => {
      const user = userEvent.setup();
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

      expect(screen.getByTestId('exercise-form')).toBeInTheDocument();
      expect(screen.getByTestId('form-training-id')).toHaveTextContent('10');
    });

    it('shows segmented toggle with "Criar novo" active in create mode', async () => {
      const user = userEvent.setup();
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

      expect(screen.getByRole('button', { name: /criar novo/i })).toHaveClass('segmented-toggle-btn--active');
    });

    it('switches to "Importar de modelo" mode when toggle is clicked', async () => {
      const user = userEvent.setup();
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));
      await user.click(screen.getByRole('button', { name: /importar de modelo/i }));

      expect(screen.getByRole('combobox', { name: /exercício/i })).toBeInTheDocument();
      expect(screen.queryByTestId('exercise-form')).not.toBeInTheDocument();
    });

    it('shows exercise templates in the import from template mode', async () => {
      const user = userEvent.setup();
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));
      await user.click(screen.getByRole('button', { name: /importar de modelo/i }));

      expect(screen.getByRole('option', { name: 'Supino Reto' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Corrida' })).toBeInTheDocument();
    });

    it('calls POST from-template and closes sheet on add exercise submit', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: 101 } });

      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));
      await user.click(screen.getByRole('button', { name: /importar de modelo/i }));
      await user.selectOptions(screen.getByRole('combobox', { name: /exercício/i }), '20');
      await user.click(screen.getByRole('button', { name: /^adicionar$/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/trainer/exercises/from-template', {
          trainingId: 10,
          templateId: '20',
        });
        expect(mockShowToast).toHaveBeenCalledWith('Exercício adicionado com sucesso!', 'success');
      });
    });

    it('can switch back to "Criar novo" from "Importar de modelo"', async () => {
      const user = userEvent.setup();
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));
      await user.click(screen.getByRole('button', { name: /importar de modelo/i }));

      expect(screen.getByRole('combobox', { name: /exercício/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /criar novo/i }));

      expect(screen.getByTestId('exercise-form')).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: /exercício/i })).not.toBeInTheDocument();
    });

    it('closes the sheet when inline exercise form calls onCancel', async () => {
      const user = userEvent.setup();
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

      expect(screen.getByTestId('exercise-form')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancelar exercício inline/i }));

      expect(screen.queryByTestId('exercise-form')).not.toBeInTheDocument();
    });

    it('closes the sheet and refreshes exercises when inline exercise is saved', async () => {
      const user = userEvent.setup();
      api.get.mockImplementation((url) => {
        if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
        if (url === '/trainer/protocols/1/trainings') return Promise.resolve({ data: mockTrainings });
        if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
        if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
        if (url.match(/\/trainer\/trainings\/\d+\/exercises/)) return Promise.resolve({ data: [] });
        return Promise.resolve({ data: [] });
      });
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

      expect(screen.getByTestId('exercise-form')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /salvar exercício inline/i }));

      expect(screen.queryByTestId('exercise-form')).not.toBeInTheDocument();
    });
  });

  describe('exercise row actions', () => {
    beforeEach(() => {
      api.get.mockImplementation((url) => {
        if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
        if (url === '/trainer/protocols/1/trainings') return Promise.resolve({ data: mockTrainings });
        if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
        if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
        if (url.match(/\/trainer\/trainings\/\d+\/exercises/)) return Promise.resolve({ data: mockExercises });
        return Promise.resolve({ data: [] });
      });
    });

    it('shows 3-dot menu on exercise row', async () => {
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Supino Reto'));
      expect(screen.getByRole('button', { name: /ações do exercício supino reto/i })).toBeInTheDocument();
    });

    it('shows exercise notes when present', async () => {
      api.get.mockImplementation((url) => {
        if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
        if (url === '/trainer/protocols/1/trainings') return Promise.resolve({ data: mockTrainings });
        if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
        if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
        if (url.match(/\/trainer\/trainings\/\d+\/exercises/))
          return Promise.resolve({ data: [{ id: 100, name: 'Supino Reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 10 }, notes: 'Manter escápulas retraídas' }] });
        return Promise.resolve({ data: [] });
      });

      renderProtocolDetail();

      await waitFor(() => screen.getByText('Supino Reto'));
      expect(screen.getByText('Manter escápulas retraídas')).toBeInTheDocument();
    });

    it('does not show notes section when exercise has no notes', async () => {
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Supino Reto'));
      expect(screen.queryByText(/manter/i)).not.toBeInTheDocument();
    });

    it('opens edit modal (CreateExerciseModal) when "Editar" is clicked on exercise menu', async () => {
      const user = userEvent.setup();
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Supino Reto'));
      await user.click(screen.getByRole('button', { name: /ações do exercício supino reto/i }));
      await user.click(screen.getByRole('button', { name: /editar/i }));

      expect(screen.getByTestId('create-exercise-modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-exercise-id')).toHaveTextContent('100');
    });

    it('calls DELETE when "Remover" is clicked on exercise menu', async () => {
      const user = userEvent.setup();
      api.delete.mockResolvedValue({});

      renderProtocolDetail();

      await waitFor(() => screen.getByText('Supino Reto'));
      await user.click(screen.getByRole('button', { name: /ações do exercício supino reto/i }));
      await user.click(screen.getByRole('button', { name: /remover/i }));
      await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/trainer/exercises/100');
        expect(mockShowToast).toHaveBeenCalledWith('Exercício removido com sucesso!', 'success');
      });
    });

    it('shows drag handle for reordering trainings when trainings exist', async () => {
      renderProtocolDetail();

      await waitFor(() => screen.getByText('Treino de Peito'));
      expect(screen.getByRole('button', { name: /arrastar para reordenar/i })).toBeInTheDocument();
    });
  });

  describe('training drag and drop reorder', () => {
    const twoTrainings = [
      { id: 10, name: 'Treino de Peito', description: 'Peito', category: 'strength', bodySegment: 'upper', order: 1, weekDay: 'monday' },
      { id: 11, name: 'Treino de Perna', description: 'Perna', category: 'strength', bodySegment: 'lower', order: 2, weekDay: 'tuesday' },
    ];

    beforeEach(() => {
      api.get.mockImplementation((url) => {
        if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
        if (url === '/trainer/protocols/1/trainings') return Promise.resolve({ data: twoTrainings });
        if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
        if (url === '/trainer/exercise-templates') return Promise.resolve({ data: mockExerciseTemplates });
        if (url.match(/\/trainer\/trainings\/\d+\/exercises/)) return Promise.resolve({ data: [] });
        return Promise.resolve({ data: [] });
      });
      api.patch.mockResolvedValue({});
    });

    it('renders one drag handle per training for reordering', async () => {
      renderProtocolDetail();

      await waitFor(() => {
        expect(screen.getByText('Treino de Peito')).toBeInTheDocument();
        expect(screen.getByText('Treino de Perna')).toBeInTheDocument();
      });

      const dragHandles = screen.getAllByRole('button', { name: /arrastar para reordenar/i });
      expect(dragHandles).toHaveLength(2);
    });
  });
});
