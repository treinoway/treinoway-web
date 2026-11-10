import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, renderWithRoute } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import api from '../../api/axios';

// Criteria 11-15, 17, 18 (biset-substitute-revamp): "Criar bi-set" toolbar flow,
// bi-set group header (static badge, round rest, trash), local (create-mode)
// grouping/substitutes and the substitute delete error message.

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../hooks/useRoutineBuilder');
vi.mock('../../hooks/useRoutineDraft', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useProtocolDraft', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useProtocolBuilder');
vi.mock('../../hooks/useBisetCreate');

import useRoutineBuilder from '../../hooks/useRoutineBuilder';
import useRoutineDraft from '../../hooks/useRoutineDraft';
import useProtocolDraft from '../../hooks/useProtocolDraft';
import useProtocolBuilder from '../../hooks/useProtocolBuilder';
import useBisetCreate from '../../hooks/useBisetCreate';
import { useToast } from '../../contexts/ToastContext';
import RoutineBuilder from './RoutineBuilder';

// jsdom lacks IntersectionObserver; this no-op stands in for it.
class NoopIntersectionObserver {
  // why: required by the builder on mount, nothing to observe in tests.
  observe() {}
  // why: counterpart of observe, intentionally empty.
  disconnect() {}
}

const mockShowToast = vi.fn();

// ─── Fixtures ────────────────────────────────────────────────────────────────

const GROUP_ID = '11111111-1111-1111-1111-111111111111';

// Builds an exercise fixture with sensible prescription defaults.
const makeExercise = (id, name, overrides = {}) => ({
  id,
  name,
  type: 'strength',
  sets: 3,
  repetitions: { min: 8, max: 12 },
  restInterval: 60,
  hasLoad: true,
  ...overrides,
});

const EX_A = makeExercise('ex-1', 'Supino reto');
const EX_B = makeExercise('ex-2', 'Rosca direta', { restInterval: 45 });
const EX_C = makeExercise('ex-3', 'Agachamento livre');

const MEMBER_A = makeExercise('mem-a', 'Supino A', {
  supersetGroupId: GROUP_ID,
  supersetOrder: 0,
  restInterval: 60,
  supersetRestInterval: 90,
});
const MEMBER_B = makeExercise('mem-b', 'Rosca B', {
  supersetGroupId: GROUP_ID,
  supersetOrder: 1,
  restInterval: 45,
  supersetRestInterval: 90,
});

// Builds a training fixture holding the given exercises.
const makeTraining = (exercises) => ({
  id: 'training-1',
  name: 'Treino A',
  category: 'strength',
  weekDay: 'monday',
  exercises,
});

const BASE_HOOK_STATE = {
  loading: false,
  saving: false,
  error: null,
  data: {
    id: 'proto-1',
    name: 'Rotina',
    type: '',
    trainingLevel: '',
    genderOrdination: '',
    description: '',
    startDate: '2026-05-01',
    expirationDate: '',
    assigneeId: 'student-1',
    trainings: [],
  },
  trainingTemplates: [],
  exerciseTemplates: [],
  protocolTemplates: [],
  student: { id: 'student-1', firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
  createdTrainingIds: [],
  junctionsAddedToImported: [],
  updateMeta: vi.fn(),
  saveRoutine: vi.fn(),
  createTraining: vi.fn(),
  importTrainingsFromLibrary: vi.fn(),
  updateTraining: vi.fn(),
  updateTrainingWeekDay: vi.fn(),
  deleteTraining: vi.fn(),
  addExercise: vi.fn(),
  addExerciseFromTemplate: vi.fn(),
  updateExercise: vi.fn(),
  deleteExercise: vi.fn(),
  saveExerciseAsTemplate: vi.fn(),
  restoreSessionTracking: vi.fn(),
  hydrateFromDraft: vi.fn(),
  loadFromTemplate: vi.fn(),
  refetchTrainingExercises: vi.fn().mockResolvedValue(undefined),
  createLocalSuperset: vi.fn(),
  dissolveLocalSuperset: vi.fn(),
  setLocalSupersetRest: vi.fn(),
  addLocalSubstitute: vi.fn(),
  removeLocalSubstitute: vi.fn(),
};

// Builds a protocol hook state with a single training of the given exercises.
const hookStateWith = (exercises, overrides = {}) => ({
  ...BASE_HOOK_STATE,
  ...overrides,
  data: { ...BASE_HOOK_STATE.data, trainings: [makeTraining(exercises)] },
});

let bisetApi;

// Renders the builder on the protocol edit route (eager mutations).
const renderEdit = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/protocols/proto-1/edit',
    path: '/trainer/protocols/:id/edit',
  });

// Renders the builder on the protocol create route (local mutations).
const renderCreate = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/protocols/new?studentId=student-1',
    path: '/trainer/protocols/new',
  });

// Renders the builder on the read-only protocol view route.
const renderView = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/protocols/proto-1',
    path: '/trainer/protocols/:id',
  });

// Renders the builder on the template builder route.
const renderTemplate = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/routines/new',
    path: '/trainer/routines/new',
  });

// Expands the first training card and waits for its exercise list.
const expand = async (user) => {
  await user.click(screen.getByRole('button', { name: /Expandir treino/i }));
  await screen.findByRole('list', { name: /Exercícios/i });
};

// Toggles the selection checkbox of the exercise with the given name.
const selectRow = async (user, name) => {
  const [target] = screen.getAllByRole('button', { name: new RegExp(`Selecionar ${name}`, 'i') });
  await user.click(target);
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useProtocolDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useToast.mockReturnValue({ showToast: mockShowToast });
  bisetApi = {
    createBiset: vi.fn().mockResolvedValue({ supersetGroupId: 'g-new', members: [] }),
    dissolveBiset: vi.fn().mockResolvedValue(undefined),
    updateRest: vi.fn().mockResolvedValue(undefined),
    saving: false,
    error: null,
  };
  useBisetCreate.mockReturnValue(bisetApi);
  BASE_HOOK_STATE.refetchTrainingExercises.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── 11. Toolbar ─────────────────────────────────────────────────────────────

describe('RoutineBuilder — "Criar bi-set" toolbar button (criterion 11)', () => {
  it('renders "Criar bi-set" before (left of) "Adicionar exercício" in the training toolbar', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([EX_A, EX_B]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    const createBiset = screen.getByRole('button', { name: /^Criar bi-set$/i });
    const addExercise = screen.getByRole('button', { name: /Adicionar exercício/i });
    expect(
      createBiset.compareDocumentPosition(addExercise) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('is enabled with at least 2 eligible (ungrouped) exercises, in edit and create mode', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([EX_A, EX_B]));
    const user = userEvent.setup();
    const { unmount } = renderEdit();
    await expand(user);
    expect(screen.getByRole('button', { name: /^Criar bi-set$/i })).toBeEnabled();
    unmount();

    renderCreate();
    await expand(user);
    expect(screen.getByRole('button', { name: /^Criar bi-set$/i })).toBeEnabled();
  });

  it('is disabled when the training has fewer than 2 exercises', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([EX_A]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    expect(screen.getByRole('button', { name: /^Criar bi-set$/i })).toBeDisabled();
  });

  it('counts only ungrouped exercises: 1 single + 1 bi-set is disabled, 2 singles + 1 bi-set is enabled', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([MEMBER_A, MEMBER_B, EX_A]));
    const user = userEvent.setup();
    const { unmount } = renderEdit();
    await expand(user);
    expect(screen.getByRole('button', { name: /^Criar bi-set$/i })).toBeDisabled();
    unmount();

    useProtocolBuilder.mockReturnValue(hookStateWith([MEMBER_A, MEMBER_B, EX_A, EX_B]));
    renderEdit();
    await expand(user);
    expect(screen.getByRole('button', { name: /^Criar bi-set$/i })).toBeEnabled();
  });

  it('removes "Selecionar" from the exercise row menu (single and bi-set member) and the training menu', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([MEMBER_A, MEMBER_B, EX_A, EX_B]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    await user.click(screen.getByRole('button', { name: /Ações de Supino reto/i }));
    expect(await screen.findByRole('menuitem', { name: /Remover/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Selecionar$/i })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /Ações de Supino A/i }));
    expect(await screen.findByRole('menuitem', { name: /Remover/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Selecionar$/i })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /Opções do treino/i }));
    expect(await screen.findByRole('menuitem', { name: /Excluir/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Selecionar$/i })).not.toBeInTheDocument();
  });
});

// ─── 18. Template builder ────────────────────────────────────────────────────

describe('RoutineBuilder — template builder (criterion 18, superseded by template-biset AC 9)', () => {
  it('shows "Criar bi-set" in the template builder', async () => {
    useRoutineBuilder.mockReturnValue(hookStateWith([EX_A, EX_B]));
    const user = userEvent.setup();
    renderTemplate();
    await expand(user);

    expect(screen.getByRole('button', { name: /Adicionar exercício/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Criar bi-set$/i })).toBeEnabled();
  });

  it('hides "Criar bi-set" in the read-only protocol view', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([EX_A, EX_B]));
    const user = userEvent.setup();
    renderView();
    await expand(user);

    expect(screen.queryByRole('button', { name: /Criar bi-set/i })).not.toBeInTheDocument();
  });
});

// ─── 12. Selection mode ──────────────────────────────────────────────────────

describe('RoutineBuilder — selection mode from the toolbar (criterion 12)', () => {
  const enterSelection = async (user) => {
    await user.click(screen.getByRole('button', { name: /^Criar bi-set$/i }));
    return screen.findByRole('toolbar', { name: /Seleção de exercícios/i });
  };

  it('shows the bar with "0 selecionados", a disabled "Criar bi-set" and a "Cancelar" button', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([EX_A, EX_B]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    const bar = await enterSelection(user);

    expect(within(bar).getByText(/0 selecionados/i)).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /^Criar bi-set$/i })).toBeDisabled();
    expect(within(bar).getByRole('button', { name: /^Cancelar$/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Criar bi-set$/i })).toHaveLength(1);
  });

  it('updates the count and enables the CTA at 2 selected', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([EX_A, EX_B, EX_C]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);
    const bar = await enterSelection(user);

    await selectRow(user, 'Supino reto');
    expect(within(bar).getByText(/1 selecionados?/i)).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /^Criar bi-set$/i })).toBeDisabled();

    await selectRow(user, 'Rosca direta');
    expect(within(bar).getByText(/2 selecionados/i)).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /^Criar bi-set$/i })).toBeEnabled();
  });

  it('caps the selection at 6 exercises', async () => {
    const seven = Array.from({ length: 7 }, (_, i) => makeExercise(`ex-${i + 1}`, `Exercício ${i + 1}`));
    useProtocolBuilder.mockReturnValue(hookStateWith(seven));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);
    const bar = await enterSelection(user);

    for (let i = 1; i <= 7; i += 1) {
      const targets = screen.getAllByRole('button', { name: new RegExp(`Selecionar Exercício ${i}$`, 'i') });
      await user.click(targets[0]);
    }

    expect(within(bar).getByText(/6 selecionados/i)).toBeInTheDocument();
    expect(within(bar).queryByText(/7 selecionados/i)).not.toBeInTheDocument();
  });

  it('"Cancelar" leaves selection mode and restores the toolbar button', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([EX_A, EX_B]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);
    const bar = await enterSelection(user);

    await user.click(within(bar).getByRole('button', { name: /^Cancelar$/i }));

    expect(screen.queryByRole('toolbar', { name: /Seleção de exercícios/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Criar bi-set$/i })).toBeEnabled();
    expect(bisetApi.createBiset).not.toHaveBeenCalled();
  });

  it('edit mode: confirming creates the group via createBiset (ordered ids) and refetches the training', async () => {
    const state = hookStateWith([EX_A, EX_B]);
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderEdit();
    await expand(user);
    const bar = await enterSelection(user);

    await selectRow(user, 'Supino reto');
    await selectRow(user, 'Rosca direta');
    await user.click(within(bar).getByRole('button', { name: /^Criar bi-set$/i }));

    await waitFor(() => expect(bisetApi.createBiset).toHaveBeenCalledTimes(1));
    expect(bisetApi.createBiset).toHaveBeenCalledWith(['ex-1', 'ex-2'], { trainingId: 'training-1' });
    await waitFor(() => expect(state.refetchTrainingExercises).toHaveBeenCalledWith('training-1'));
    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: /Seleção de exercícios/i })).not.toBeInTheDocument()
    );
    expect(state.createLocalSuperset).not.toHaveBeenCalled();
  });

  it('create mode: confirming groups locally via createLocalSuperset and never calls the API', async () => {
    const state = hookStateWith([EX_A, EX_B], { data: { ...BASE_HOOK_STATE.data, id: null, trainings: [makeTraining([EX_A, EX_B])] } });
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderCreate();
    await expand(user);
    const bar = await enterSelection(user);

    await selectRow(user, 'Supino reto');
    await selectRow(user, 'Rosca direta');
    await user.click(within(bar).getByRole('button', { name: /^Criar bi-set$/i }));

    await waitFor(() => expect(state.createLocalSuperset).toHaveBeenCalledTimes(1));
    expect(state.createLocalSuperset).toHaveBeenCalledWith('training-1', ['ex-1', 'ex-2']);
    expect(bisetApi.createBiset).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});

// ─── 13. Group header ────────────────────────────────────────────────────────

describe('RoutineBuilder — bi-set group header (criterion 13)', () => {
  const renderGroupEdit = async (user, overrides = {}) => {
    const state = hookStateWith([MEMBER_A, MEMBER_B], overrides);
    useProtocolBuilder.mockReturnValue(state);
    renderEdit();
    await expand(user);
    return { state, group: screen.getByRole('group', { name: 'Bi-set' }) };
  };

  it('shows a static "Bi-set" badge that is not a button and no longer opens an action sheet', async () => {
    const user = userEvent.setup();
    const { group } = await renderGroupEdit(user);

    expect(within(group).getByText('Bi-set')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ações do bi-set/i })).not.toBeInTheDocument();
    expect(within(group).queryByRole('button', { name: /^Bi-set$/i })).not.toBeInTheDocument();

    await user.click(within(group).getByText('Bi-set'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the "Descanso da rodada" control (seconds) from supersetRestInterval', async () => {
    const user = userEvent.setup();
    const { group } = await renderGroupEdit(user);

    expect(within(group).getByRole('spinbutton', { name: /Descanso da rodada/i })).toHaveValue(90);
  });

  it('falls back to the last member rest when supersetRestInterval is null', async () => {
    const user = userEvent.setup();
    const a = { ...MEMBER_A, supersetRestInterval: null };
    const b = { ...MEMBER_B, supersetRestInterval: null };
    useProtocolBuilder.mockReturnValue(hookStateWith([a, b]));
    renderEdit();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    expect(within(group).getByRole('spinbutton', { name: /Descanso da rodada/i })).toHaveValue(45);
  });

  it('read-only view shows the round rest as text, without the editable control or the trash', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([MEMBER_A, MEMBER_B]));
    const user = userEvent.setup();
    renderView();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    expect(within(group).getByText(/Descanso da rodada/i)).toBeInTheDocument();
    expect(within(group).queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(within(group).queryByRole('button', { name: /Desfazer bi-set/i })).not.toBeInTheDocument();
  });

  it('trash "Desfazer bi-set" opens exactly ONE confirm dialog (no sheet on top)', async () => {
    const user = userEvent.setup();
    const { group } = await renderGroupEdit(user);

    await user.click(within(group).getByRole('button', { name: /^Desfazer bi-set$/i }));

    expect(await screen.findAllByRole('alertdialog')).toHaveLength(1);
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
    expect(bisetApi.dissolveBiset).not.toHaveBeenCalled();
  });

  it('edit mode: confirming dissolves via dissolveBiset(groupId, { trainingId }) and refetches', async () => {
    const user = userEvent.setup();
    const { state, group } = await renderGroupEdit(user);

    await user.click(within(group).getByRole('button', { name: /^Desfazer bi-set$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /Desfazer bi-set/i }));

    await waitFor(() => expect(bisetApi.dissolveBiset).toHaveBeenCalledTimes(1));
    expect(bisetApi.dissolveBiset).toHaveBeenCalledWith(GROUP_ID, { trainingId: 'training-1' });
    await waitFor(() => expect(state.refetchTrainingExercises).toHaveBeenCalledWith('training-1'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('cancelling the confirm keeps the bi-set', async () => {
    const user = userEvent.setup();
    const { group } = await renderGroupEdit(user);

    await user.click(within(group).getByRole('button', { name: /^Desfazer bi-set$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^Cancelar$/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(bisetApi.dissolveBiset).not.toHaveBeenCalled();
  });

  it('create mode: confirming dissolves locally via dissolveLocalSuperset(trainingId, groupId)', async () => {
    const state = hookStateWith([MEMBER_A, MEMBER_B], { data: { ...BASE_HOOK_STATE.data, id: null, trainings: [makeTraining([MEMBER_A, MEMBER_B])] } });
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderCreate();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    await user.click(within(group).getByRole('button', { name: /^Desfazer bi-set$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /Desfazer bi-set/i }));

    await waitFor(() => expect(state.dissolveLocalSuperset).toHaveBeenCalledWith('training-1', GROUP_ID));
    expect(bisetApi.dissolveBiset).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

// ─── 14. Round rest + member rows ────────────────────────────────────────────

describe('RoutineBuilder — round rest and member rows (criterion 14)', () => {
  it('member rows do not show their own rest; only non-last members show "sem descanso"', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([MEMBER_A, MEMBER_B]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    expect(within(group).queryByText(/Descanso: /)).not.toBeInTheDocument();
    expect(within(group).getAllByText(/sem descanso/i)).toHaveLength(1);
  });

  it('standalone exercises keep showing their own rest', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([EX_A, EX_B]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    expect(screen.getByText(/Descanso: 1min/)).toBeInTheDocument();
    expect(screen.getByText(/Descanso: 45s/)).toBeInTheDocument();
  });

  it('edit mode: committing a new round rest calls updateRest(groupId, seconds, { trainingId }) and refetches', async () => {
    const state = hookStateWith([MEMBER_A, MEMBER_B]);
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    const input = within(group).getByRole('spinbutton', { name: /Descanso da rodada/i });
    await user.clear(input);
    await user.type(input, '120');
    await user.tab();

    await waitFor(() => expect(bisetApi.updateRest).toHaveBeenCalledTimes(1));
    expect(bisetApi.updateRest).toHaveBeenCalledWith(GROUP_ID, 120, { trainingId: 'training-1' });
    await waitFor(() => expect(state.refetchTrainingExercises).toHaveBeenCalledWith('training-1'));
  });

  it('does not call updateRest when the value is unchanged', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([MEMBER_A, MEMBER_B]));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    const input = within(group).getByRole('spinbutton', { name: /Descanso da rodada/i });
    await user.click(input);
    await user.tab();

    expect(bisetApi.updateRest).not.toHaveBeenCalled();
  });

  it('create mode: committing a new round rest calls setLocalSupersetRest(trainingId, groupId, seconds)', async () => {
    const state = hookStateWith([MEMBER_A, MEMBER_B], { data: { ...BASE_HOOK_STATE.data, id: null, trainings: [makeTraining([MEMBER_A, MEMBER_B])] } });
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderCreate();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    const input = within(group).getByRole('spinbutton', { name: /Descanso da rodada/i });
    await user.clear(input);
    await user.type(input, '120');
    await user.tab();

    await waitFor(() => expect(state.setLocalSupersetRest).toHaveBeenCalledWith('training-1', GROUP_ID, 120));
    expect(bisetApi.updateRest).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });
});

// ─── 17. Substitutes: create mode (local) + delete error ─────────────────────

describe('RoutineBuilder — substitutes in create mode and delete errors (criterion 17)', () => {
  const SUBSTITUTE = { id: 'sub-1', name: 'Crucifixo', type: 'strength', sets: 3, repetitions: { min: 12, max: 15 } };
  const WITH_SUB = { ...EX_A, substitutes: [SUBSTITUTE] };

  const showSubstitutes = async (user) => {
    await user.click(screen.getByRole('button', { name: /substitut/i }));
    await screen.findByRole('list', { name: /Substitutos de/i });
  };

  it('create mode: deleting a substitute calls removeLocalSubstitute and never DELETEs', async () => {
    const state = hookStateWith([WITH_SUB], { data: { ...BASE_HOOK_STATE.data, id: null, trainings: [makeTraining([WITH_SUB])] } });
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderCreate();
    await expand(user);
    await showSubstitutes(user);

    await user.click(screen.getByRole('button', { name: /Excluir substituto Crucifixo/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^Excluir$/ }));

    await waitFor(() => expect(state.removeLocalSubstitute).toHaveBeenCalledWith('training-1', 'ex-1', 'sub-1'));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('edit mode: a failed delete shows the error message as an error toast, not "Substituto removido."', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([WITH_SUB]));
    api.delete.mockRejectedValue({ userMessage: 'Falha ao excluir o substituto.' });
    const user = userEvent.setup();
    renderEdit();
    await expand(user);
    await showSubstitutes(user);

    await user.click(screen.getByRole('button', { name: /Excluir substituto Crucifixo/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^Excluir$/ }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Falha ao excluir o substituto.', 'error'));
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.stringMatching(/Substituto removido/i), expect.anything());
  });

  it('edit mode: a failed delete without userMessage still never shows the success text', async () => {
    useProtocolBuilder.mockReturnValue(hookStateWith([WITH_SUB]));
    api.delete.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderEdit();
    await expand(user);
    await showSubstitutes(user);

    await user.click(screen.getByRole('button', { name: /Excluir substituto Crucifixo/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^Excluir$/ }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.stringMatching(/Substituto removido/i), expect.anything());
  });
});
