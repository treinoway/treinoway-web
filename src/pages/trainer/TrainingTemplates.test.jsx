import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../../test-utils/selectOption';
import { renderWithRouter } from '../../test/test-utils';
import TrainingTemplates from './TrainingTemplates';
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

vi.mock('../../components/CreateExerciseTemplateModal', () => ({
  default: ({ open, onClose, onSuccess, exerciseTemplate }) =>
    open ? (
      <div data-testid="create-exercise-template-modal">
        {exerciseTemplate && <span data-testid="editing-exercise-id">{exerciseTemplate.id}</span>}
        <button onClick={onClose} type="button">Fechar modal exercício</button>
        <button onClick={() => onSuccess?.(exerciseTemplate ? { ...exerciseTemplate, name: 'Exercício Editado' } : { id: 99, name: 'Novo Exercício' })} type="button">
          {exerciseTemplate ? 'Simular exercício editado' : 'Simular exercício criado'}
        </button>
      </div>
    ) : null,
}));

const mockShowToast = vi.fn();

const mockTemplates = [
  { id: 1, name: 'Treino A', description: 'Descrição do treino A', isPublic: false, category: 'strength', bodySegment: 'upper' },
  { id: 2, name: 'Treino B', description: 'Descrição do treino B', isPublic: true, category: 'cardio', bodySegment: 'lower' },
];

describe('TrainingTemplates', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTemplates });
      if (typeof url === 'string' && url.startsWith('/trainer/training-templates/')) {
        const id = url.replace('/trainer/training-templates/', '');
        const template = mockTemplates.find((t) => String(t.id) === String(id));
        return Promise.resolve({ data: template || mockTemplates[0] });
      }
      if (url === '/trainer/exercise-templates') return Promise.resolve({
        data: [
          { id: 20, name: 'Supino Reto' },
          { id: 21, name: 'Corrida' },
          { id: 99, name: 'Novo Exercício' },
        ],
      });
      return Promise.resolve({ data: [] });
    });
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('renders the page title', () => {
    renderWithRouter(<TrainingTemplates />);

    expect(screen.getByText('Treinos únicos')).toBeInTheDocument();
  });

  it('fetches and displays templates on mount', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });
  });

  it('shows "Público" badge for public templates', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Público')).toBeInTheDocument();
    });
  });

  it('shows empty state and info banner when there are no templates', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum treino único ainda')).toBeInTheDocument();
      expect(screen.getByText(/O que é um treino único/i)).toBeInTheDocument();
    });
  });

  it('empty state CTA opens the create form', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Nenhum treino único ainda'));

    await user.click(screen.getByRole('button', { name: /criar primeiro treino/i }));

    expect(screen.getByText('Criar novo treino único')).toBeInTheDocument();
  });

  it('does not show info banner when templates exist', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    expect(screen.queryByText(/O que é um treino único/i)).not.toBeInTheDocument();
  });

  it('shows loading and avoids empty-state flash before GET resolves', async () => {
    let resolveTemplates;
    const templatesPromise = new Promise((resolve) => {
      resolveTemplates = resolve;
    });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return templatesPromise;
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<TrainingTemplates />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum treino único ainda')).not.toBeInTheDocument();

    resolveTemplates({ data: [] });

    await waitFor(() => {
      expect(screen.getByText('Nenhum treino único ainda')).toBeInTheDocument();
    });
  });

  it('shows "+ Novo treino único" button when form is hidden', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    expect(screen.getByRole('button', { name: /novo treino único/i })).toBeInTheDocument();
  });

  it('shows the create form when "+ Novo treino único" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    await user.click(screen.getByRole('button', { name: /novo treino único/i }));

    expect(screen.getByText('Criar novo treino único')).toBeInTheDocument();
  });

  it('hides the "+" button when the form is visible', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));

    expect(screen.queryByRole('button', { name: /novo treino único/i })).not.toBeInTheDocument();
  });

  it('calls POST to create a new template on form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 3, name: 'Novo Treino', isPublic: false } });
    api.get.mockResolvedValue({ data: [...mockTemplates, { id: 3, name: 'Novo Treino', isPublic: false }] });

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));

    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Novo Treino');
    await selectOption(user,screen.getAllByRole('combobox')[0], 'strength');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/training-templates', expect.objectContaining({
        name: 'Novo Treino',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Treino único criado com sucesso!', 'success');
    });
  });

  it('hides form and clears data on Cancel click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));

    expect(screen.getByText('Criar novo treino único')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText('Criar novo treino único')).not.toBeInTheDocument();
  });

  it('populates form with existing data when Edit is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));

    expect(screen.getByText('Editar treino único')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Treino A')).toBeInTheDocument();
    });
  });

  it('shows exercises in form when GET by ID returns exerciseTemplateIds', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTemplates });
      if (url === '/trainer/training-templates/1') {
        return Promise.resolve({
          data: { ...mockTemplates[0], exerciseTemplateIds: [20] },
        });
      }
      if (url === '/trainer/exercise-templates') return Promise.resolve({
        data: [
          { id: 20, name: 'Supino Reto' },
          { id: 21, name: 'Corrida' },
          { id: 99, name: 'Novo Exercício' },
        ],
      });
      return Promise.resolve({ data: [] });
    });
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do exercício supino reto/i })).toBeInTheDocument();
    });
  });

  it('shows exercises in form when GET by ID returns trainingTemplateExerciseTemplates', async () => {
    const user = userEvent.setup();
    const uuid = '8981a001-f57c-4e0d-9932-23a35cb629d3';
    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTemplates });
      if (url === '/trainer/training-templates/1') {
        return Promise.resolve({
          data: {
            ...mockTemplates[0],
            trainingTemplateExerciseTemplates: [
              { exerciseTemplateId: uuid, exerciseTemplate: { id: uuid, name: 'Tríceps Polia' } },
            ],
          },
        });
      }
      if (url === '/trainer/exercise-templates') return Promise.resolve({
        data: [
          { id: 20, name: 'Supino Reto' },
          { id: 21, name: 'Corrida' },
          { id: uuid, name: 'Tríceps Polia' },
        ],
      });
      return Promise.resolve({ data: [] });
    });
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do exercício tríceps polia/i })).toBeInTheDocument();
    });
  });

  it('calls PATCH on save when editing an existing template', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockTemplates[0] });

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));
    await waitFor(() => expect(screen.getByDisplayValue('Treino A')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/training-templates/1', expect.any(Object));
      expect(mockShowToast).toHaveBeenCalledWith('Treino único atualizado com sucesso!', 'success');
    });
  });

  it('shows custom confirm dialog and calls DELETE on confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Excluir'));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/training-templates/1');
      expect(mockShowToast).toHaveBeenCalledWith('Treino único excluído com sucesso!', 'success');
    });
  });

  it('opens CreateExerciseTemplateModal when "Criar exercício" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));
    await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));

    expect(screen.getByTestId('create-exercise-template-modal')).toBeInTheDocument();
  });

  it('adds newly created exercise to form when CreateExerciseTemplateModal calls onSuccess', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));
    await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));
    await user.click(screen.getByRole('button', { name: /simular exercício criado/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do exercício novo exercício/i })).toBeInTheDocument();
    });
  });

  it('shows exercise templates in picker when form is open', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));

    const picker = screen.getByLabelText(/selecionar exercício existente/i);
    expect(picker).toBeInTheDocument();
    await user.click(picker);
    expect(screen.getByRole('option', { name: 'Supino Reto' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Corrida' })).toBeInTheDocument();
  });

  it('adds and removes exercise templates from the form', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));

    await selectOption(user,screen.getByLabelText(/selecionar exercício existente/i), '20');
    await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

    expect(screen.getAllByText('Supino Reto').length).toBeGreaterThan(0);
    const actionsBtn = screen.getByRole('button', { name: /ações do exercício supino reto/i });
    expect(actionsBtn).toBeInTheDocument();

    await user.click(actionsBtn);
    await user.click(screen.getByRole('button', { name: /remover/i }));
    expect(screen.queryByRole('button', { name: /ações do exercício supino reto/i })).not.toBeInTheDocument();
  });

  it('sends exerciseTemplates with draft overrides in payload when creating template with exercises', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 1 } });
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));
    await selectOption(user, screen.getByLabelText(/selecionar exercício existente/i), '20');
    await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Treino com Exercício');
    await selectOption(user, screen.getAllByRole('combobox')[0], 'strength');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/training-templates',
        expect.objectContaining({
          name: 'Treino com Exercício',
          exerciseTemplates: [
            expect.objectContaining({ exerciseTemplateId: 20, order: 0 }),
          ],
        }),
      );
    });
  });

  it('persists snapshot edits made in create mode into the POST payload', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 1 } });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTemplates });
      if (url === '/trainer/exercise-templates') return Promise.resolve({
        data: [
          {
            id: 20,
            name: 'Supino Reto',
            type: 'strength',
            sets: 3,
            repetitions: { min: 10, max: 10 },
            hasLoad: true,
            suggestedLoad: 20,
            restInterval: 60,
          },
        ],
      });
      return Promise.resolve({ data: [] });
    });
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));
    await selectOption(user, screen.getByLabelText(/selecionar exercício existente/i), '20');
    await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

    // Open the snapshot sheet for the draft row and bump sets from 3 to 4.
    await user.click(screen.getByRole('button', { name: /editar exercício supino reto/i }));
    const dialog = screen.getByRole('dialog', { name: /editar supino reto/i });
    await user.click(within(dialog).getByRole('button', { name: /aumentar séries/i }));
    await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }));

    // Draft edits are held locally — no PATCH call until the template is persisted.
    expect(api.patch).not.toHaveBeenCalled();

    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Treino Draft');
    await selectOption(user, screen.getAllByRole('combobox')[0], 'strength');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/training-templates',
        expect.objectContaining({
          exerciseTemplates: [
            expect.objectContaining({ exerciseTemplateId: 20, sets: 4 }),
          ],
        }),
      );
    });
  });

  it('does not delete when custom dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Excluir'));
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows view toggle buttons when templates are loaded', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    expect(screen.getByRole('button', { name: /visualização em cards/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /visualização em lista/i })).toBeInTheDocument();
  });

  it('switches to list view and shows table with template data', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    await user.click(screen.getByRole('button', { name: /visualização em lista/i }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Treino A')).toBeInTheDocument();
    expect(screen.getByText('Treino B')).toBeInTheDocument();
  });

  it('switches back to card view from list view', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    await user.click(screen.getByRole('button', { name: /visualização em lista/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /visualização em cards/i }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('hides view toggle buttons when form is open', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));

    expect(screen.queryByRole('button', { name: /visualização em cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /visualização em lista/i })).not.toBeInTheDocument();
  });

  const setupEditExerciseTest = () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTemplates });
      if (url === '/trainer/training-templates/1') {
        return Promise.resolve({ data: { ...mockTemplates[0], exerciseTemplateIds: [20] } });
      }
      if (url === '/trainer/exercise-templates') return Promise.resolve({
        data: [{ id: 20, name: 'Supino Reto' }, { id: 21, name: 'Corrida' }],
      });
      return Promise.resolve({ data: [] });
    });
  };

  it('shows actions menu on exercise rows in the form', async () => {
    const user = userEvent.setup();
    setupEditExerciseTest();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do exercício supino reto/i })).toBeInTheDocument();
    });
  });

  it('opens the snapshot edit sheet (not the global template modal) when tapping an exercise row in create mode', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));
    await selectOption(user, screen.getByLabelText(/selecionar exercício existente/i), '20');
    await user.click(screen.getByRole('button', { name: /adicionar exercício ao treino/i }));

    await user.click(screen.getByRole('button', { name: /editar exercício supino reto/i }));

    expect(screen.getByRole('dialog', { name: /editar supino reto/i })).toBeInTheDocument();
    // Global exercise template modal must NOT open from the template form.
    expect(screen.queryByTestId('create-exercise-template-modal')).not.toBeInTheDocument();
  });

  describe('Snapshot edit flow', () => {
    const templateUuid = '11111111-1111-1111-1111-111111111111';
    const exerciseTemplateUuid = '22222222-2222-2222-2222-222222222222';
    const junctionUuid = '33333333-3333-3333-3333-333333333333';

    const baseTemplateWithSnapshot = {
      id: templateUuid,
      name: 'Treino A',
      description: 'Descrição',
      isPublic: false,
      category: 'strength',
      bodySegment: 'upper',
      trainingTemplateExerciseTemplates: [
        {
          id: junctionUuid,
          trainingTemplateId: templateUuid,
          exerciseTemplateId: exerciseTemplateUuid,
          order: 0,
          name: 'Supino Reto',
          type: 'strength',
          sets: 4,
          repetitions: { min: 10, max: 10 },
          duration: null,
          hasLoad: true,
          suggestedLoad: 20,
          restInterval: 60,
          notes: null,
          exerciseTemplate: { id: exerciseTemplateUuid, name: 'Supino Reto', type: 'strength' },
        },
      ],
    };

    const setupSnapshotTest = () => {
      api.get.mockImplementation((url) => {
        if (url === '/trainer/training-templates') {
          return Promise.resolve({
            data: [{ id: templateUuid, name: 'Treino A', isPublic: false, category: 'strength', bodySegment: 'upper' }],
          });
        }
        if (url === `/trainer/training-templates/${templateUuid}`) {
          return Promise.resolve({ data: baseTemplateWithSnapshot });
        }
        if (url === '/trainer/exercise-templates') {
          return Promise.resolve({
            data: [{ id: exerciseTemplateUuid, name: 'Supino Reto', type: 'strength' }],
          });
        }
        return Promise.resolve({ data: [] });
      });
    };

    const openSnapshotEditSheet = async (user) => {
      await waitFor(() => screen.getByText('Treino A'));
      const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
      await user.click(menuTrigger);
      await user.click(screen.getByText('Editar'));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /editar exercício supino reto/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /editar exercício supino reto/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /editar supino reto/i })).toBeInTheDocument();
      });
    };

    it('renders a tappable exercise row with summary when junction snapshot is available', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      renderWithRouter(<TrainingTemplates />);

      await waitFor(() => screen.getByText('Treino A'));
      const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
      await user.click(menuTrigger);
      await user.click(screen.getByText('Editar'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /editar exercício supino reto/i })).toBeInTheDocument();
      });
      expect(screen.getByText('4\u00d710 · 60s · 20kg')).toBeInTheDocument();
    });

    it('opens the edit sheet with pre-filled fields when the row is tapped', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      renderWithRouter(<TrainingTemplates />);

      await openSnapshotEditSheet(user);

      expect(screen.getByLabelText('Séries')).toHaveValue(4);
      expect(screen.getByLabelText('Descanso')).toHaveValue(60);
      expect(screen.getByLabelText('Carga')).toHaveValue(20);
    });

    it('sends a PATCH to the snapshot endpoint on save and shows a success toast', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      api.patch.mockResolvedValue({ data: { ...baseTemplateWithSnapshot.trainingTemplateExerciseTemplates[0], sets: 5 } });
      renderWithRouter(<TrainingTemplates />);

      await openSnapshotEditSheet(user);

      const dialog = screen.getByRole('dialog', { name: /editar supino reto/i });
      await user.click(within(dialog).getByRole('button', { name: /aumentar séries/i }));
      await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          `/trainer/training-templates/${templateUuid}/exercises/${junctionUuid}`,
          expect.objectContaining({ sets: 5 }),
        );
      });
      expect(mockShowToast).toHaveBeenCalledWith('Exercício atualizado', 'success');
    });

    it('keeps the sheet open and shows a retry toast on save error', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      const error = { userMessage: 'Falha' };
      api.patch.mockRejectedValue(error);
      renderWithRouter(<TrainingTemplates />);

      await openSnapshotEditSheet(user);

      const dialog = screen.getByRole('dialog', { name: /editar supino reto/i });
      await user.click(within(dialog).getByRole('button', { name: /aumentar séries/i }));
      await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Falha',
          'error',
          expect.objectContaining({ actionLabel: 'Tentar novamente' }),
        );
      });
      expect(screen.getByRole('dialog', { name: /editar supino reto/i })).toBeInTheDocument();
    });

    it('preserves snapshot overrides when saving the main template form', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      api.patch.mockResolvedValue({ data: baseTemplateWithSnapshot });
      renderWithRouter(<TrainingTemplates />);

      await waitFor(() => screen.getByText('Treino A'));
      const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
      await user.click(menuTrigger);
      await user.click(screen.getByText('Editar'));
      await waitFor(() => expect(screen.getByDisplayValue('Treino A')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          `/trainer/training-templates/${templateUuid}`,
          expect.objectContaining({
            exerciseTemplates: [
              expect.objectContaining({
                exerciseTemplateId: exerciseTemplateUuid,
                order: 0,
                sets: 4,
                repetitions: { min: 10, max: 10 },
                hasLoad: true,
                suggestedLoad: 20,
                restInterval: 60,
              }),
            ],
          }),
        );
      });
    });
  });
});
