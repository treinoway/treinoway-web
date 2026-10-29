import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, renderWithRoute } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import api from '../../api/axios';
import { DROP_SET, techniqueEnvelope } from '../../test/advancedTechniqueFixtures';

// AC #29 (biset-substitute-revamp): adding/editing a substitute reuses the
// "Novo exercício" drawer (ExerciseDrawer + ExerciseComposer) in substitute mode.

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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SUPINO = {
  id: 'tmpl-supino',
  name: 'Supino reto',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 4,
  repetitions: { min: 8, max: 12 },
  restInterval: 90,
  hasLoad: true,
};

const PRINCIPAL = {
  id: 'ex-1',
  name: 'Rosca direta',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 10, max: 12 },
  restInterval: 45,
  hasLoad: true,
};

const SUBSTITUTE = {
  id: 'sub-1',
  name: 'Crucifixo',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 12, max: 15 },
  restInterval: 60,
  hasLoad: true,
};

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
  exerciseTemplates: [SUPINO],
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
  createLocalSuperset: vi.fn(),
  dissolveLocalSuperset: vi.fn(),
  setLocalSupersetRest: vi.fn(),
};

let state;

// Builds a fresh protocol hook state (fresh spies) with the given exercises; `create` drops the protocol id.
const buildState = (exercises, { create = false } = {}) => ({
  ...BASE_HOOK_STATE,
  refetchTrainingExercises: vi.fn().mockResolvedValue(undefined),
  addLocalSubstitute: vi.fn().mockResolvedValue({ id: 'tmp_sub' }),
  updateLocalSubstitute: vi.fn().mockResolvedValue(undefined),
  removeLocalSubstitute: vi.fn(),
  data: {
    ...BASE_HOOK_STATE.data,
    id: create ? null : 'proto-1',
    trainings: [makeTraining(exercises)],
  },
});

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

// Expands the first training card and waits for its exercise list.
const expand = async (user) => {
  await user.click(screen.getByRole('button', { name: /Expandir treino/i }));
  await screen.findByRole('list', { name: /Exercícios/i });
};

// Opens the substitute drawer from the principal's row menu.
const openSubstituteDrawer = async (user) => {
  await expand(user);
  await user.click(screen.getByRole('button', { name: /Ações de Rosca direta/i }));
  await user.click(await screen.findByRole('menuitem', { name: /Adicionar substituto/i }));
  return screen.findByRole('dialog', { name: 'Novo substituto' });
};

// Expands the substitutes list and opens the existing substitute in the drawer.
const openEditSubstituteDrawer = async (user) => {
  await expand(user);
  await user.click(screen.getByRole('button', { name: /substitut/i }));
  await screen.findByRole('list', { name: /Substitutos de/i });
  await user.click(screen.getByRole('button', { name: /Editar substituto Crucifixo/i }));
  return screen.findByRole('dialog', { name: 'Editar substituto' });
};

// Switches the drawer to the "Criar novo" tab.
const openCreateTab = (user, dialog) => user.click(within(dialog).getByRole('tab', { name: /Criar novo/i }));

// Types a query in the drawer search and picks the matching option.
const pickExercise = async (user, dialog, query, optionName) => {
  await user.type(within(dialog).getByRole('combobox', { name: /Buscar na biblioteca/i }), query);
  await user.click(await within(dialog).findByRole('option', { name: optionName }));
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useProtocolDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useToast.mockReturnValue({ showToast: vi.fn() });
  useBisetCreate.mockReturnValue({
    createBiset: vi.fn(),
    dissolveBiset: vi.fn(),
    updateRest: vi.fn(),
    saving: false,
    error: null,
  });
  api.get.mockImplementation((url) => {
    if (String(url).includes('advanced-techniques')) return Promise.resolve(techniqueEnvelope([DROP_SET]));
    return Promise.resolve({ data: { data: [], total: 0 } });
  });
  api.post.mockResolvedValue({ data: { id: 'sub-new' } });
  api.patch.mockResolvedValue({ data: { id: 'sub-1' } });
  state = buildState([PRINCIPAL]);
  useProtocolBuilder.mockReturnValue(state);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RoutineBuilder — "Adicionar substituto" opens the exercise drawer (AC 29)', () => {
  it('opens the drawer titled "Novo substituto" with the "no lugar de" caption', async () => {
    const user = userEvent.setup();
    renderEdit();

    const dialog = await openSubstituteDrawer(user);

    expect(within(dialog).getByText(/no lugar de Rosca direta/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Novo exercício' })).not.toBeInTheDocument();
  });

  it('no longer opens the old substitute sheet (no "Criar substituto" / "Da biblioteca" tabs)', async () => {
    const user = userEvent.setup();
    renderEdit();

    await openSubstituteDrawer(user);

    expect(screen.queryByRole('tab', { name: /Criar substituto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Da biblioteca/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Adicionar substituto/i })).not.toBeInTheDocument();
  });

  it('offers library search, video/GIF and advanced techniques like add mode', async () => {
    const user = userEvent.setup();
    renderEdit();

    const dialog = await openSubstituteDrawer(user);
    expect(within(dialog).getByRole('combobox', { name: /Buscar na biblioteca/i })).toBeInTheDocument();

    await openCreateTab(user, dialog);
    expect(within(dialog).getByText('Técnicas avançadas')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: /buscar técnica avançada/i })).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Vídeo de demonstração/i).length).toBeGreaterThan(0);
  });

  it('prefills type, sets, reps and rest from the principal (name left empty)', async () => {
    const user = userEvent.setup();
    renderEdit();

    const dialog = await openSubstituteDrawer(user);
    await openCreateTab(user, dialog);

    expect(within(dialog).getByLabelText(/^Nome/)).toHaveValue('');
    expect(within(dialog).getByLabelText(/^Tipo/)).toHaveValue('strength');
    expect(within(dialog).getByLabelText(/Séries/i)).toHaveValue(3);
    expect(within(dialog).getByLabelText(/Repetições mínimas/i)).toHaveValue(10);
    expect(within(dialog).getByLabelText(/Repetições máximas/i)).toHaveValue(12);
    expect(within(dialog).getByLabelText(/Intervalo de descanso/i)).toHaveValue(45);
  });

  it('re-opening for another principal shows that principal in the caption (no stale state)', async () => {
    const other = { ...PRINCIPAL, id: 'ex-2', name: 'Tríceps testa', sets: 4 };
    state = buildState([PRINCIPAL, other]);
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderEdit();
    await expand(user);

    await user.click(screen.getByRole('button', { name: /Ações de Rosca direta/i }));
    await user.click(await screen.findByRole('menuitem', { name: /Adicionar substituto/i }));
    const first = await screen.findByRole('dialog', { name: 'Novo substituto' });
    await user.click(within(first).getByRole('button', { name: /Cancelar/i }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo substituto' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Ações de Tríceps testa/i }));
    await user.click(await screen.findByRole('menuitem', { name: /Adicionar substituto/i }));
    const second = await screen.findByRole('dialog', { name: 'Novo substituto' });
    await openCreateTab(user, second);

    expect(within(second).getByText(/no lugar de Tríceps testa/i)).toBeInTheDocument();
    expect(within(second).getByLabelText(/Séries/i)).toHaveValue(4);
  });
});

describe('RoutineBuilder — saving a substitute, protocol edit mode (AC 29)', () => {
  it('manual substitute: POSTs /trainer/exercises/:principalId/substitutes with the composer payload, refetches and closes', async () => {
    const user = userEvent.setup();
    renderEdit();
    const dialog = await openSubstituteDrawer(user);
    await openCreateTab(user, dialog);
    await user.type(within(dialog).getByLabelText(/^Nome/), 'Crucifixo');

    await user.click(within(dialog).getByRole('button', { name: /^Salvar/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith(
      '/trainer/exercises/ex-1/substitutes',
      expect.objectContaining({
        name: 'Crucifixo',
        type: 'strength',
        sets: 3,
        repetitions: { min: 10, max: 12 },
        restInterval: 45,
      })
    );
    await waitFor(() => expect(state.refetchTrainingExercises).toHaveBeenCalledWith('training-1'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo substituto' })).not.toBeInTheDocument());
    expect(state.addLocalSubstitute).not.toHaveBeenCalled();
    expect(state.addExercise).not.toHaveBeenCalled();
  });

  it('library substitute: POST carries exerciseTemplateId and the edited prescription', async () => {
    const user = userEvent.setup();
    renderEdit();
    const dialog = await openSubstituteDrawer(user);
    await pickExercise(user, dialog, 'supino', /Supino reto/i);
    await user.clear(within(dialog).getByLabelText(/Séries/i));
    await user.type(within(dialog).getByLabelText(/Séries/i), '5');

    await user.click(within(dialog).getByRole('button', { name: /^Salvar/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith(
      '/trainer/exercises/ex-1/substitutes',
      expect.objectContaining({ exerciseTemplateId: 'tmpl-supino', name: 'Supino reto', sets: 5 })
    );
    expect(state.addExerciseFromTemplate).not.toHaveBeenCalled();
  });

  it('sends advancedTechniqueIds when techniques were picked', async () => {
    const user = userEvent.setup();
    renderEdit();
    const dialog = await openSubstituteDrawer(user);
    await openCreateTab(user, dialog);
    await user.type(within(dialog).getByLabelText(/^Nome/), 'Crucifixo');
    await user.click(within(dialog).getByRole('combobox', { name: /buscar técnica avançada/i }));
    await user.click(await within(dialog).findByRole('option', { name: /Drop set/ }));

    await user.click(within(dialog).getByRole('button', { name: /^Salvar/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    const body = api.post.mock.calls[0][1];
    expect(body.advancedTechniqueIds).toEqual(['tech-drop']);
  });

  it('keeps the drawer open and shows the error when the POST fails', async () => {
    api.post.mockRejectedValue({ userMessage: 'Falha ao salvar substituto.' });
    const user = userEvent.setup();
    renderEdit();
    const dialog = await openSubstituteDrawer(user);
    await openCreateTab(user, dialog);
    await user.type(within(dialog).getByLabelText(/^Nome/), 'Crucifixo');

    await user.click(within(dialog).getByRole('button', { name: /^Salvar/ }));

    expect(await within(dialog).findByText('Falha ao salvar substituto.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Novo substituto' })).toBeInTheDocument();
    expect(state.refetchTrainingExercises).not.toHaveBeenCalled();
  });

  it('cancelling closes the drawer without calling the API', async () => {
    const user = userEvent.setup();
    renderEdit();
    const dialog = await openSubstituteDrawer(user);

    await user.click(within(dialog).getByRole('button', { name: /Cancelar/i }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo substituto' })).not.toBeInTheDocument());
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('RoutineBuilder — saving a substitute, protocol create mode (AC 29)', () => {
  beforeEach(() => {
    state = buildState([PRINCIPAL], { create: true });
    useProtocolBuilder.mockReturnValue(state);
  });

  it('calls addLocalSubstitute(trainingId, principalId, body) and never hits the API', async () => {
    const user = userEvent.setup();
    renderCreate();
    const dialog = await openSubstituteDrawer(user);
    await openCreateTab(user, dialog);
    await user.type(within(dialog).getByLabelText(/^Nome/), 'Crucifixo');

    await user.click(within(dialog).getByRole('button', { name: /^Salvar/ }));

    await waitFor(() => expect(state.addLocalSubstitute).toHaveBeenCalledTimes(1));
    expect(state.addLocalSubstitute).toHaveBeenCalledWith(
      'training-1',
      'ex-1',
      expect.objectContaining({ name: 'Crucifixo', type: 'strength', sets: 3 })
    );
    expect(api.post).not.toHaveBeenCalled();
    expect(state.refetchTrainingExercises).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo substituto' })).not.toBeInTheDocument());
  });

  it('library pick keeps exerciseTemplateId in the local body', async () => {
    const user = userEvent.setup();
    renderCreate();
    const dialog = await openSubstituteDrawer(user);
    await pickExercise(user, dialog, 'supino', /Supino reto/i);

    await user.click(within(dialog).getByRole('button', { name: /^Salvar/ }));

    await waitFor(() => expect(state.addLocalSubstitute).toHaveBeenCalledTimes(1));
    expect(state.addLocalSubstitute).toHaveBeenCalledWith(
      'training-1',
      'ex-1',
      expect.objectContaining({ exerciseTemplateId: 'tmpl-supino', name: 'Supino reto' })
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('RoutineBuilder — editing an existing substitute in the drawer (AC 29)', () => {
  beforeEach(() => {
    state = buildState([{ ...PRINCIPAL, substitutes: [SUBSTITUTE] }]);
    useProtocolBuilder.mockReturnValue(state);
  });

  it('clicking a substitute opens the drawer "Editar substituto" with its data', async () => {
    const user = userEvent.setup();
    renderEdit();

    const dialog = await openEditSubstituteDrawer(user);

    expect(within(dialog).getByText(/no lugar de Rosca direta/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Nome/)).toHaveValue('Crucifixo');
    expect(within(dialog).getByLabelText(/Séries/i)).toHaveValue(3);
    expect(within(dialog).getByLabelText(/Repetições mínimas/i)).toHaveValue(12);
    expect(within(dialog).getByLabelText(/Repetições máximas/i)).toHaveValue(15);
  });

  it('edit mode: PATCHes /trainer/exercises/:id, refetches and closes', async () => {
    const user = userEvent.setup();
    renderEdit();
    const dialog = await openEditSubstituteDrawer(user);
    await user.clear(within(dialog).getByLabelText(/Séries/i));
    await user.type(within(dialog).getByLabelText(/Séries/i), '4');

    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith('/trainer/exercises/sub-1', expect.objectContaining({ name: 'Crucifixo', sets: 4 }));
    await waitFor(() => expect(state.refetchTrainingExercises).toHaveBeenCalledWith('training-1'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar substituto' })).not.toBeInTheDocument());
    expect(state.updateExercise).not.toHaveBeenCalled();
  });

  it('create mode: calls updateLocalSubstitute(trainingId, principalId, substituteId, body), no API', async () => {
    state = buildState([{ ...PRINCIPAL, substitutes: [SUBSTITUTE] }], { create: true });
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderCreate();
    const dialog = await openEditSubstituteDrawer(user);
    await user.clear(within(dialog).getByLabelText(/Séries/i));
    await user.type(within(dialog).getByLabelText(/Séries/i), '4');

    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(state.updateLocalSubstitute).toHaveBeenCalledTimes(1));
    expect(state.updateLocalSubstitute).toHaveBeenCalledWith(
      'training-1',
      'ex-1',
      'sub-1',
      expect.objectContaining({ name: 'Crucifixo', sets: 4 })
    );
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('read-only view: substitutes are not editable', async () => {
    state = buildState([{ ...PRINCIPAL, substitutes: [SUBSTITUTE] }]);
    useProtocolBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderWithRoute(<RoutineBuilder />, { route: '/trainer/protocols/proto-1', path: '/trainer/protocols/:id' });
    await expand(user);
    await user.click(screen.getByRole('button', { name: /substitut/i }));
    await screen.findByRole('list', { name: /Substitutos de/i });

    expect(screen.queryByRole('button', { name: /Editar substituto/i })).not.toBeInTheDocument();
  });
});
