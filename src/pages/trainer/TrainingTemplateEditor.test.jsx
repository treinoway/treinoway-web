import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { selectOption } from '../../test-utils/selectOption';
import TrainingTemplateEditor from './TrainingTemplateEditor';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const authState = vi.hoisted(() => ({ isAdmin: true }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

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

// Mutable override so tests can control the `result` emitted on exercise creation
// (e.g. a cardio exercise to exercise the intensity ramp path).
let createdExerciseResult = { id: 99, name: 'Novo Exercício' };

vi.mock('../../components/CreateExerciseTemplateModal', () => ({
  default: ({ open, onClose, onSuccess }) =>
    open ? (
      <div data-testid="create-exercise-template-modal">
        <button onClick={onClose} type="button">Fechar modal exercício</button>
        <button onClick={() => onSuccess?.(createdExerciseResult)} type="button">
          Simular exercício criado
        </button>
      </div>
    ) : null,
}));

const mockShowToast = vi.fn();

const template = {
  id: 1,
  name: 'Treino A',
  description: 'Descrição do treino A',
  isPublic: false,
  category: 'strength',
  bodySegment: 'upper',
};

const envelope = (data) => ({ data: { data, total: data.length, page: 1, limit: 100 } });

const exerciseTemplatesEnvelope = envelope([
  { id: 20, name: 'Supino Reto' },
  { id: 21, name: 'Corrida' },
  { id: 99, name: 'Novo Exercício' },
]);

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

const renderEditor = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/trainer/training-templates/new" element={<TrainingTemplateEditor />} />
        <Route path="/trainer/training-templates/:id" element={<TrainingTemplateEditor />} />
        <Route path="/trainer/training-templates" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

const EXERCISE_NAME_BY_ID = { 20: /supino reto/i, 21: /corrida/i };

const addExerciseViaPicker = async (user, id) => {
  await user.click(screen.getByRole('combobox', { name: 'Adicionar exercício' }));
  await user.click(screen.getByRole('option', { name: EXERCISE_NAME_BY_ID[id] }));
};

const renderCreate = async () => {
  renderEditor('/trainer/training-templates/new');
  await screen.findByRole('heading', { level: 1, name: 'Novo treino único' });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/trainer/exercise-templates', expect.anything()));
};

const renderEdit = async (id = 1, name = 'Treino A') => {
  renderEditor(`/trainer/training-templates/${id}`);
  await screen.findByDisplayValue(name);
};

const fillRequiredFields = async (user, name = 'Novo Treino') => {
  await user.type(screen.getByLabelText(/^nome$/i), name);
  await selectOption(user, screen.getByLabelText(/^categoria$/i), 'strength');
};

describe('TrainingTemplateEditor', () => {
  beforeEach(() => {
    createdExerciseResult = { id: 99, name: 'Novo Exercício' };
    authState.isAdmin = true;
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/exercise-templates') return Promise.resolve(exerciseTemplatesEnvelope);
      if (url === '/trainer/training-templates/1') return Promise.resolve({ data: template });
      return Promise.resolve({ data: [] });
    });
    api.post.mockReset();
    api.patch.mockReset();
  });

  describe('create mode', () => {
    it('renders the new-training title and an empty form', async () => {
      await renderCreate();

      expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
      expect(screen.getByLabelText(/^nome$/i)).toHaveValue('');
      expect(screen.queryByText('Carregando treino único')).not.toBeInTheDocument();
    });

    it('reflects the typed name in the page title', async () => {
      const user = userEvent.setup();
      await renderCreate();

      await user.type(screen.getByLabelText(/^nome$/i), 'Peito pesado');

      expect(screen.getByRole('heading', { level: 1, name: 'Peito pesado' })).toBeInTheDocument();
    });

    it('creates the template, shows a success toast and returns to the list', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: 3, name: 'Novo Treino' } });
      await renderCreate();

      await fillRequiredFields(user);
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/training-templates',
          expect.objectContaining({ name: 'Novo Treino', category: 'strength', exerciseTemplates: [] }),
        );
      });
      expect(mockShowToast).toHaveBeenCalledWith('Treino único criado com sucesso!', 'success');
      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/training-templates');
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('shows inline validation errors and does not call the API when required fields are empty', async () => {
      const user = userEvent.setup();
      await renderCreate();

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      expect(screen.getByText('Informe o nome do treino.')).toBeInTheDocument();
      expect(screen.getByText('Selecione a categoria.')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('clears a field error once the field is edited', async () => {
      const user = userEvent.setup();
      await renderCreate();

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));
      await user.type(screen.getByLabelText(/^nome$/i), 'A');

      expect(screen.queryByText('Informe o nome do treino.')).not.toBeInTheDocument();
    });

    it('keeps the form and shows an error toast when the API fails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue({ userMessage: 'Falha ao salvar' });
      await renderCreate();

      await fillRequiredFields(user);
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Falha ao salvar', 'error', undefined));
      expect(screen.getByLabelText(/^nome$/i)).toHaveValue('Novo Treino');
      expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    });

    it('disables the actions and shows "Salvando…" while the request is in flight', async () => {
      const user = userEvent.setup();
      api.post.mockReturnValue(new Promise(() => {}));
      await renderCreate();

      await fillRequiredFields(user);
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      expect(await screen.findByRole('button', { name: 'Salvando…' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    });
  });

  describe('leaving the page', () => {
    it('"Cancelar" returns to the list immediately when nothing changed', async () => {
      const user = userEvent.setup();
      await renderCreate();

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/training-templates');
    });

    it('"Voltar" returns to the list immediately when nothing changed', async () => {
      const user = userEvent.setup();
      await renderEdit();

      await user.click(screen.getByRole('button', { name: 'Voltar' }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/training-templates');
    });

    it('asks to discard unsaved changes and stays when the user keeps editing', async () => {
      const user = userEvent.setup();
      await renderCreate();
      await user.type(screen.getByLabelText(/^nome$/i), 'Rascunho');

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAccessibleName(/descartar alterações\?/i);
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/^nome$/i)).toHaveValue('Rascunho');
      expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    });

    it('discards the changes and leaves when the user confirms', async () => {
      const user = userEvent.setup();
      await renderCreate();
      await user.type(screen.getByLabelText(/^nome$/i), 'Rascunho');

      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/training-templates');
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('shows in-place skeletons and never "not found" while the GET is pending', async () => {
      let resolveTemplate;
      api.get.mockImplementation((url) => {
        if (url === '/trainer/training-templates/1') {
          return new Promise((resolve) => { resolveTemplate = resolve; });
        }
        return Promise.resolve(exerciseTemplatesEnvelope);
      });
      renderEditor('/trainer/training-templates/1');

      expect(screen.getByRole('status', { name: 'Carregando treino único' })).toBeInTheDocument();
      expect(screen.queryByText('Treino único não encontrado')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^nome$/i)).not.toBeInTheDocument();

      resolveTemplate({ data: template });

      expect(await screen.findByDisplayValue('Treino A')).toBeInTheDocument();
      expect(screen.queryByRole('status', { name: 'Carregando treino único' })).not.toBeInTheDocument();
    });

    it('loads the template into the form and the title', async () => {
      await renderEdit();

      expect(screen.getByRole('heading', { level: 1, name: 'Treino A' })).toBeInTheDocument();
      expect(screen.getByLabelText('Descrição')).toHaveValue('Descrição do treino A');
      expect(api.get).toHaveBeenCalledWith('/trainer/training-templates/1');
    });

    it('saves with PATCH, shows a success toast and returns to the list', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: template });
      await renderEdit();

      await user.clear(screen.getByLabelText(/^nome$/i));
      await user.type(screen.getByLabelText(/^nome$/i), 'Treino A+');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/training-templates/1',
          expect.objectContaining({ name: 'Treino A+' }),
        );
      });
      expect(mockShowToast).toHaveBeenCalledWith('Treino único atualizado com sucesso!', 'success');
      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/training-templates');
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows a not-found block with a way back once the GET returns 404', async () => {
      const user = userEvent.setup();
      api.get.mockImplementation((url) => {
        if (url === '/trainer/training-templates/999') return Promise.reject({ response: { status: 404 } });
        return Promise.resolve(exerciseTemplatesEnvelope);
      });
      renderEditor('/trainer/training-templates/999');

      expect(await screen.findByRole('heading', { name: 'Treino único não encontrado' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Voltar para treinos únicos' }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/training-templates');
    });

    it('shows an alert with retry when the GET fails', async () => {
      const user = userEvent.setup();
      let calls = 0;
      api.get.mockImplementation((url) => {
        if (url === '/trainer/training-templates/1') {
          calls += 1;
          return calls === 1 ? Promise.reject({ userMessage: 'Falha ao carregar' }) : Promise.resolve({ data: template });
        }
        return Promise.resolve(exerciseTemplatesEnvelope);
      });
      renderEditor('/trainer/training-templates/1');

      expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar');
      await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

      expect(await screen.findByDisplayValue('Treino A')).toBeInTheDocument();
    });

    it('shows exercises when GET by ID returns exerciseTemplateIds', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/trainer/training-templates/1') {
          return Promise.resolve({ data: { ...template, exerciseTemplateIds: [20] } });
        }
        return Promise.resolve(exerciseTemplatesEnvelope);
      });
      await renderEdit();

      expect(await screen.findByRole('button', { name: /ações do exercício supino reto/i })).toBeInTheDocument();
    });

    it('shows exercises when GET by ID returns trainingTemplateExerciseTemplates', async () => {
      const uuid = '8981a001-f57c-4e0d-9932-23a35cb629d3';
      api.get.mockImplementation((url) => {
        if (url === '/trainer/training-templates/1') {
          return Promise.resolve({
            data: {
              ...template,
              trainingTemplateExerciseTemplates: [
                { exerciseTemplateId: uuid, exerciseTemplate: { id: uuid, name: 'Tríceps Polia' } },
              ],
            },
          });
        }
        return Promise.resolve(exerciseTemplatesEnvelope);
      });
      await renderEdit();

      expect(await screen.findByRole('button', { name: /ações do exercício tríceps polia/i })).toBeInTheDocument();
    });
  });

  describe('exercises', () => {
    it('opens CreateExerciseTemplateModal when "Criar exercício" is clicked', async () => {
      const user = userEvent.setup();
      await renderCreate();
      await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));

      expect(screen.getByTestId('create-exercise-template-modal')).toBeInTheDocument();
    });

    it('adds newly created exercise to form when CreateExerciseTemplateModal calls onSuccess', async () => {
      const user = userEvent.setup();
      await renderCreate();
      await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));
      await user.click(screen.getByRole('button', { name: /simular exercício criado/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ações do exercício novo exercício/i })).toBeInTheDocument();
      });
    });

    it('shows exercise templates in picker when form is open', async () => {
      const user = userEvent.setup();
      await renderCreate();

      const picker = screen.getByRole('combobox', { name: 'Adicionar exercício' });
      await user.click(picker);
      expect(screen.getByRole('option', { name: /supino reto/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /corrida/i })).toBeInTheDocument();
    });

    it('searches the whole library when typing and adds the exercise found beyond the initial list', async () => {
      const user = userEvent.setup();
      const baseGet = api.get.getMockImplementation();
      api.get.mockImplementation((url, config) => {
        if (url === '/trainer/exercise-templates' && config?.params?.q) {
          return Promise.resolve(envelope([{ id: 500, name: 'Remada Curvada', type: 'strength' }]));
        }
        return baseGet(url, config);
      });
      await renderCreate();

      await user.type(screen.getByRole('combobox', { name: 'Adicionar exercício' }), 'remada');
      await user.click(await screen.findByRole('option', { name: /remada curvada/i }));

      expect(screen.getByRole('button', { name: /editar exercício remada curvada/i })).toBeInTheDocument();
    });

    it('adds and removes exercise templates from the form', async () => {
      const user = userEvent.setup();
      await renderCreate();

      await addExerciseViaPicker(user, '20');

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
      await renderCreate();
      await addExerciseViaPicker(user, '20');

      const nameInput = screen.getByLabelText(/^nome$/i);
      await user.type(nameInput, 'Treino com Exercício');
      await selectOption(user, screen.getByLabelText(/^categoria$/i), 'strength');
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
        if (url === '/trainer/exercise-templates') return Promise.resolve(envelope([
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
          ]));
        return Promise.resolve({ data: [] });
      });
      await renderCreate();
      await addExerciseViaPicker(user, '20');

      // Open the snapshot sheet for the draft row and bump sets from 3 to 4.
      await user.click(screen.getByRole('button', { name: /editar exercício supino reto/i }));
      const dialog = screen.getByRole('dialog', { name: /editar supino reto/i });
      await user.click(within(dialog).getByRole('button', { name: /aumentar séries/i }));
      await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }));

      // Draft edits are held locally — no PATCH call until the template is persisted.
      expect(api.patch).not.toHaveBeenCalled();

      const nameInput = screen.getByLabelText(/^nome$/i);
      await user.type(nameInput, 'Treino Draft');
      await selectOption(user, screen.getByLabelText(/^categoria$/i), 'strength');
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

    it('carries a time-based prescription into the create payload (duration survives round-trip)', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: 1 } });
      await renderCreate();
      await addExerciseViaPicker(user, '21');

      // Open the draft snapshot sheet, switch to "Tempo" and set a duration.
      await user.click(screen.getByRole('button', { name: /editar exercício corrida/i }));
      const dialog = screen.getByRole('dialog', { name: /editar corrida/i });
      await user.click(within(dialog).getByRole('tab', { name: /tempo/i }));
      await user.click(within(dialog).getByRole('button', { name: /aumentar séries/i }));
      await user.click(within(dialog).getByRole('button', { name: /aumentar duração/i }));
      await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }));

      const nameInput = screen.getByLabelText(/^nome$/i);
      await user.type(nameInput, 'Treino Tempo');
      await selectOption(user, screen.getByLabelText(/^categoria$/i), 'cardio');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/training-templates',
          expect.objectContaining({
            exerciseTemplates: [
              expect.objectContaining({
                exerciseTemplateId: 21,
                prescriptionMode: 'duration',
                repetitions: null,
              }),
            ],
          }),
        );
      });
      const postPayload = api.post.mock.calls[0][1];
      expect(postPayload.exerciseTemplates[0].duration).not.toBeNull();
    });

    it('shows the intensity ramp when a picked cardio exercise is opened in the edit sheet', async () => {
      const user = userEvent.setup();
      api.get.mockImplementation((url) => {
        if (url === '/trainer/exercise-templates') return Promise.resolve(envelope([
            { id: 30, name: 'Esteira', type: 'cardio', typeLabel: 'Cardio', prescriptionMode: 'duration', duration: 1200 },
            { id: 20, name: 'Supino Reto', type: 'strength', typeLabel: 'Força' },
          ]));
        return Promise.resolve({ data: [] });
      });
      await renderCreate();

      // The picker surfaces the exercise type so the trainer can spot cardio.
      await user.click(screen.getByRole('combobox', { name: 'Adicionar exercício' }));
      const esteira = screen.getByRole('option', { name: /esteira/i });
      expect(esteira).toHaveTextContent('Cardio');
      await user.click(esteira);

      // Opening the draft cardio junction must reach EditExerciseSheet with type: 'cardio',
      // which renders the intensity ramp.
      await user.click(screen.getByRole('button', { name: /editar exercício esteira/i }));
      const dialog = screen.getByRole('dialog', { name: /editar esteira/i });
      expect(within(dialog).getByRole('radiogroup', { name: /intensidade/i })).toBeInTheDocument();
    });

    it('shows the intensity ramp when a newly created cardio exercise is opened in the edit sheet', async () => {
      const user = userEvent.setup();
      createdExerciseResult = { id: 40, name: 'Bicicleta', type: 'cardio', videoUrl: null, isPublic: false };
      await renderCreate();
      await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));
      await user.click(screen.getByRole('button', { name: /simular exercício criado/i }));

      // The "Criar novo" path must build a draft junction carrying type: 'cardio',
      // mirroring the picker path, so EditExerciseSheet renders the intensity ramp.
      await user.click(screen.getByRole('button', { name: /editar exercício bicicleta/i }));
      const dialog = screen.getByRole('dialog', { name: /editar bicicleta/i });
      expect(within(dialog).getByRole('radiogroup', { name: /intensidade/i })).toBeInTheDocument();
    });

    it('does not duplicate the junction when a created exercise id already exists in the form', async () => {
      const user = userEvent.setup();
      createdExerciseResult = { id: 20, name: 'Supino Reto', type: 'strength', videoUrl: null, isPublic: false };
      api.get.mockImplementation((url) => {
        if (url === '/trainer/exercise-templates') return Promise.resolve(envelope([{ id: 20, name: 'Supino Reto', type: 'strength', typeLabel: 'Força' }]));
        return Promise.resolve({ data: [] });
      });
      await renderCreate();

      // Add via picker first.
      await addExerciseViaPicker(user, '20');
      // Then "create" an exercise with the same id — no duplicate row/junction.
      await user.click(screen.getByRole('button', { name: /criar novo exercício/i }));
      await user.click(screen.getByRole('button', { name: /simular exercício criado/i }));

      expect(screen.getAllByRole('button', { name: /editar exercício supino reto/i })).toHaveLength(1);
    });

    it('does not show the intensity ramp for a picked strength exercise', async () => {
      const user = userEvent.setup();
      api.get.mockImplementation((url) => {
        if (url === '/trainer/exercise-templates') return Promise.resolve(envelope([{ id: 20, name: 'Supino Reto', type: 'strength', typeLabel: 'Força' }]));
        return Promise.resolve({ data: [] });
      });
      await renderCreate();
      await addExerciseViaPicker(user, '20');

      await user.click(screen.getByRole('button', { name: /editar exercício supino reto/i }));
      const dialog = screen.getByRole('dialog', { name: /editar supino reto/i });
      expect(within(dialog).queryByRole('radiogroup', { name: /intensidade/i })).not.toBeInTheDocument();
    });

    it('opens the snapshot edit sheet (not the global template modal) when tapping an exercise row in create mode', async () => {
      const user = userEvent.setup();
      await renderCreate();
      await addExerciseViaPicker(user, '20');

      await user.click(screen.getByRole('button', { name: /editar exercício supino reto/i }));

      expect(screen.getByRole('dialog', { name: /editar supino reto/i })).toBeInTheDocument();
      // Global exercise template modal must NOT open from the template form.
      expect(screen.queryByTestId('create-exercise-template-modal')).not.toBeInTheDocument();
    });  });

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
        if (url === `/trainer/training-templates/${templateUuid}`) {
          return Promise.resolve({ data: baseTemplateWithSnapshot });
        }
        if (url === '/trainer/exercise-templates') {
          return Promise.resolve(envelope([{ id: exerciseTemplateUuid, name: 'Supino Reto', type: 'strength' }]));
        }
        return Promise.resolve({ data: [] });
      });
    };

    const openSnapshotEditSheet = async (user) => {
      await renderEdit(templateUuid);
      await user.click(await screen.findByRole('button', { name: /editar exercício supino reto/i }));
      await screen.findByRole('dialog', { name: /editar supino reto/i });
    };

    it('renders a tappable exercise row with summary when junction snapshot is available', async () => {
      setupSnapshotTest();
      await renderEdit(templateUuid);

      expect(await screen.findByRole('button', { name: /editar exercício supino reto/i })).toBeInTheDocument();
      expect(screen.getByText('4×10 · 60s · 20kg')).toBeInTheDocument();
    });

    it('opens the edit sheet with pre-filled fields when the row is tapped', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      await openSnapshotEditSheet(user);

      expect(screen.getByLabelText('Séries')).toHaveValue(4);
      expect(screen.getByLabelText('Descanso')).toHaveValue(60);
      expect(screen.getByLabelText('Carga')).toHaveValue(20);
    });

    it('sends a PATCH to the snapshot endpoint on save and shows a success toast', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      api.patch.mockResolvedValue({ data: { ...baseTemplateWithSnapshot.trainingTemplateExerciseTemplates[0], sets: 5 } });
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

    it('does not count an already-persisted snapshot edit as an unsaved change', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      api.patch.mockResolvedValue({ data: { ...baseTemplateWithSnapshot.trainingTemplateExerciseTemplates[0], sets: 5 } });
      await openSnapshotEditSheet(user);

      const dialog = screen.getByRole('dialog', { name: /editar supino reto/i });
      await user.click(within(dialog).getByRole('button', { name: /aumentar séries/i }));
      await user.click(within(dialog).getByRole('button', { name: /^salvar$/i }));
      await waitFor(() => expect(api.patch).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /editar supino reto/i })).not.toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/training-templates');
    });

    it('keeps the sheet open and shows a retry toast on save error', async () => {
      const user = userEvent.setup();
      setupSnapshotTest();
      api.patch.mockRejectedValue({ userMessage: 'Falha' });
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
      await renderEdit(templateUuid);

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

  describe('admin-only visibility', () => {
    it('shows the visibility switch to admins and sends isPublic', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: 3 } });
      await renderCreate();

      await fillRequiredFields(user);
      await user.click(screen.getByRole('switch', { name: /tornar este modelo público/i }));
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/training-templates',
          expect.objectContaining({ isPublic: true }),
        );
      });
    });

    it('hides the visibility switch from non-admins and omits isPublic on create', async () => {
      const user = userEvent.setup();
      authState.isAdmin = false;
      api.post.mockResolvedValue({ data: { id: 3 } });
      await renderCreate();

      expect(screen.queryByRole('switch', { name: /tornar este modelo público/i })).not.toBeInTheDocument();
      await fillRequiredFields(user);
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/training-templates',
          expect.not.objectContaining({ isPublic: expect.anything() }),
        );
      });
    });

    it('omits isPublic on edit for non-admins so an existing value is not flipped', async () => {
      const user = userEvent.setup();
      authState.isAdmin = false;
      api.patch.mockResolvedValue({ data: { id: 1 } });
      await renderEdit();

      await user.type(screen.getByLabelText(/^nome$/i), '+');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/training-templates/1',
          expect.not.objectContaining({ isPublic: expect.anything() }),
        );
      });
    });
  });
});
