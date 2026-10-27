import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, renderWithRoute } from '../../test/test-utils';
import api from '../../api/axios';
import userEvent from '@testing-library/user-event';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// jsdom has no IntersectionObserver; this stub keeps the screen from crashing on mount.
class NoopIntersectionObserver {
  // Ignores observe calls.
  observe() {}
  // Ignores disconnect calls.
  disconnect() {}
}

const SUPINO = {
  id: 'tmpl-supino',
  name: 'Supino reto',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 4,
  repetitions: { min: 8, max: 12 },
  restInterval: 90,
  hasLoad: true,
  suggestedLoad: 40,
  notes: 'Controle a descida',
};

const REMADA = {
  id: 'tmpl-remada',
  name: 'Remada curvada',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 10, max: 12 },
  restInterval: 60,
  hasLoad: true,
};

const ELEVACAO = {
  id: 'tmpl-elevacao',
  name: 'Elevação lateral',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 12, max: 15 },
  restInterval: 45,
  hasLoad: true,
};

const TEMPLATES = [SUPINO, REMADA, ELEVACAO];

const EXISTING_EXERCISE = {
  id: 'ex-1',
  name: 'Rosca direta',
  type: 'strength',
  sets: 3,
  repetitions: { min: 10, max: 12 },
  restInterval: 45,
  hasLoad: true,
};

const TRAINING = {
  id: 'training-1',
  name: 'Peito & Tríceps',
  category: 'strength',
  weekDay: 'monday',
  exercises: [EXISTING_EXERCISE],
};

const BASE_HOOK_STATE = {
  loading: false,
  saving: false,
  error: null,
  data: {
    id: null,
    name: 'Rotina Hipertrofia',
    type: '',
    trainingLevel: '',
    defaultDurationWeeks: '',
    genderOrdination: '',
    description: '',
    trainings: [TRAINING],
  },
  trainingTemplates: [],
  exerciseTemplates: TEMPLATES,
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
};

const PROTOCOL_HOOK_STATE = {
  ...BASE_HOOK_STATE,
  data: {
    ...BASE_HOOK_STATE.data,
    id: 'protocol-123',
    name: 'Protocolo',
    startDate: '',
    expirationDate: '',
    assigneeId: 'student-1',
  },
  protocolTemplates: [],
  student: { id: 'student-1', firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
  createdTrainingIds: [],
  junctionsAddedToImported: [],
};

// Renders the builder in routine-template mode.
const renderTemplateMode = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/routines/new',
    path: '/trainer/routines/new',
  });

// Renders the builder in protocol edit mode.
const renderProtocolEditMode = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/protocols/protocol-123/edit',
    path: '/trainer/protocols/:id/edit',
  });

// Expands the training and opens the "Novo exercício" drawer.
const openAddDrawer = async (user) => {
  await user.click(screen.getByRole('button', { name: /Expandir treino/i }));
  await user.click(await screen.findByRole('button', { name: /Adicionar exercício/i }));
  return screen.findByRole('dialog', { name: 'Novo exercício' });
};

// Types a query in the drawer's search and picks the matching option.
const pickExercise = async (user, dialog, query, optionName) => {
  await user.type(within(dialog).getByRole('combobox', { name: /Buscar na biblioteca/i }), query);
  await user.click(await within(dialog).findByRole('option', { name: optionName }));
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useProtocolDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useToast.mockReturnValue({ showToast: vi.fn() });
  useBisetCreate.mockReturnValue({
    createBiset: vi.fn().mockResolvedValue({ groupId: 'g1', members: [] }),
    dissolveBiset: vi.fn().mockResolvedValue(undefined),
    saving: false,
    error: null,
  });
  api.get.mockResolvedValue({ data: { data: [], total: 0 } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RoutineBuilder — "Novo exercício" drawer defaults to library search (criteria 16, 17)', () => {
  beforeEach(() => {
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE });
  });

  it('shows the Adicionar exercício and Criar novo tabs plus the "Adicionar em lote" button, with the search active', async () => {
    const user = userEvent.setup();
    renderTemplateMode();

    const dialog = await openAddDrawer(user);

    expect(within(dialog).getByRole('tab', { name: /Adicionar exercício/i })).toHaveAttribute('aria-selected', 'true');
    expect(within(dialog).getByRole('tab', { name: /Criar novo/i })).toHaveAttribute('aria-selected', 'false');
    expect(within(dialog).getByRole('button', { name: /Adicionar em lote/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: /Buscar na biblioteca/i })).toBeInTheDocument();
  });

  it('keeps "Salvar exercício" in the footer, disabled until an exercise is picked', async () => {
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);

    const body = screen.getByRole('region', { name: 'Novo exercício' });
    expect(within(body).queryByRole('button', { name: /Salvar exercício/i })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Salvar exercício/i })).toBeDisabled();

    await pickExercise(user, dialog, 'supino', /Supino reto/i);

    expect(within(dialog).getByRole('button', { name: /Salvar exercício/i })).toBeEnabled();
  });

  it('finds "Elevação lateral" by typing "elevacao" (accent-insensitive)', async () => {
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);

    await user.type(within(dialog).getByRole('combobox', { name: /Buscar na biblioteca/i }), 'elevacao');

    expect(await within(dialog).findByRole('option', { name: /Elevação lateral/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('option', { name: /Supino reto/i })).not.toBeInTheDocument();
  });

  it('pre-fills the prescription from the picked template and offers "Trocar"', async () => {
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);

    await pickExercise(user, dialog, 'supino', /Supino reto/i);

    expect(within(dialog).getByText('Supino reto')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Séries/i)).toHaveValue(4);
    expect(within(dialog).getByLabelText(/Repetições mínimas/i)).toHaveValue(8);
    expect(within(dialog).getByLabelText(/Repetições máximas/i)).toHaveValue(12);
    expect(within(dialog).getByLabelText(/Intervalo de descanso/i)).toHaveValue(90);
    expect(within(dialog).getByLabelText(/Carga sugerida/i)).toHaveValue(40);
    expect(within(dialog).getByLabelText(/Observações/i)).toHaveValue('Controle a descida');

    await user.click(within(dialog).getByRole('button', { name: /^Trocar$/i }));

    expect(within(dialog).getByRole('combobox', { name: /Buscar na biblioteca/i })).toBeInTheDocument();
  });
});

describe('RoutineBuilder — saving a library exercise with prescription (criterion 18)', () => {
  it('template mode: calls addExerciseFromTemplate(trainingId, templateId, overrides) and closes the drawer', async () => {
    const addExerciseFromTemplate = vi.fn().mockResolvedValue({ id: 'junction-new' });
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE, addExerciseFromTemplate });
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);
    await pickExercise(user, dialog, 'supino', /Supino reto/i);
    await user.clear(within(dialog).getByLabelText(/Séries/i));
    await user.type(within(dialog).getByLabelText(/Séries/i), '5');
    await user.clear(within(dialog).getByLabelText(/Intervalo de descanso/i));
    await user.type(within(dialog).getByLabelText(/Intervalo de descanso/i), '120');

    await user.click(within(dialog).getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(addExerciseFromTemplate).toHaveBeenCalledTimes(1));
    expect(addExerciseFromTemplate).toHaveBeenCalledWith(
      'training-1',
      'tmpl-supino',
      expect.objectContaining({
        template: SUPINO,
        prescriptionMode: 'reps',
        sets: 5,
        repetitions: { min: 8, max: 12 },
        restInterval: 120,
        hasLoad: true,
        suggestedLoad: 40,
        notes: 'Controle a descida',
      })
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Novo exercício' })).not.toBeInTheDocument();
    });
  });

  it('protocol mode: calls the protocol builder addExerciseFromTemplate with the same arguments', async () => {
    const addExerciseFromTemplate = vi.fn().mockResolvedValue({ id: 'real-ex-1' });
    useProtocolBuilder.mockReturnValue({ ...PROTOCOL_HOOK_STATE, addExerciseFromTemplate });
    const user = userEvent.setup();
    renderProtocolEditMode();
    const dialog = await openAddDrawer(user);
    await pickExercise(user, dialog, 'remada', /Remada curvada/i);

    await user.click(within(dialog).getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(addExerciseFromTemplate).toHaveBeenCalledTimes(1));
    expect(addExerciseFromTemplate).toHaveBeenCalledWith(
      'training-1',
      'tmpl-remada',
      expect.objectContaining({ sets: 3, repetitions: { min: 10, max: 12 }, restInterval: 60 })
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Novo exercício' })).not.toBeInTheDocument();
    });
  });

  it('keeps the drawer open when the save fails', async () => {
    const addExerciseFromTemplate = vi.fn().mockRejectedValue({ userMessage: 'Erro ao adicionar exercício.' });
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE, addExerciseFromTemplate });
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);
    await pickExercise(user, dialog, 'supino', /Supino reto/i);

    await user.click(within(dialog).getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(addExerciseFromTemplate).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog', { name: 'Novo exercício' })).toBeInTheDocument();
    expect(within(dialog).getByText('Supino reto')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Salvar exercício/i })).toBeEnabled();
  });

  it('does not call addExercise (the create path) for a library pick', async () => {
    const addExercise = vi.fn();
    const addExerciseFromTemplate = vi.fn().mockResolvedValue({ id: 'junction-new' });
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE, addExercise, addExerciseFromTemplate });
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);
    await pickExercise(user, dialog, 'supino', /Supino reto/i);

    await user.click(within(dialog).getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(addExerciseFromTemplate).toHaveBeenCalled());
    expect(addExercise).not.toHaveBeenCalled();
  });
});

describe('RoutineBuilder — batch add from the drawer (criterion 19)', () => {
  it('"Adicionar em lote" shows the multi-select list and "Importar N" imports sequentially in click order', async () => {
    const addExerciseFromTemplate = vi.fn().mockResolvedValue({ id: 'junction-new' });
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE, addExerciseFromTemplate });
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);

    await user.click(within(dialog).getByRole('button', { name: /Adicionar em lote/i }));
    await user.click(await within(dialog).findByText('Remada curvada'));
    await user.click(within(dialog).getByText('Supino reto'));
    await user.click(within(dialog).getByRole('button', { name: /Importar 2/i }));

    await waitFor(() => expect(addExerciseFromTemplate).toHaveBeenCalledTimes(2));
    expect(addExerciseFromTemplate.mock.calls.map((call) => call[1])).toEqual(['tmpl-remada', 'tmpl-supino']);
    expect(addExerciseFromTemplate).toHaveBeenNthCalledWith(1, 'training-1', 'tmpl-remada', { template: REMADA });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Novo exercício' })).not.toBeInTheDocument();
    });
  });

  it('"Voltar" returns from the batch list to the single add', async () => {
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE });
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);
    await user.click(within(dialog).getByRole('button', { name: /Adicionar em lote/i }));
    expect(within(dialog).getByRole('list')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /^Voltar$/i }));

    expect(within(dialog).getByRole('combobox', { name: /Buscar na biblioteca/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('RoutineBuilder — "Criar novo" tab unchanged (criterion 20)', () => {
  it('saves through addExercise with the typed name and never through the template path', async () => {
    const addExercise = vi.fn().mockResolvedValue({ id: 'ex-new' });
    const addExerciseFromTemplate = vi.fn();
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE, addExercise, addExerciseFromTemplate });
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);

    await user.click(within(dialog).getByRole('tab', { name: /Criar novo/i }));
    await user.type(within(dialog).getByLabelText(/Nome/i), 'Leg press');
    await user.type(within(dialog).getByLabelText(/Repetições mínimas/i), '10');
    await user.type(within(dialog).getByLabelText(/Repetições máximas/i), '15');
    await user.click(within(dialog).getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => {
      expect(addExercise).toHaveBeenCalledWith('training-1', expect.objectContaining({ name: 'Leg press' }));
    });
    expect(addExerciseFromTemplate).not.toHaveBeenCalled();
  });
});

describe('RoutineBuilder — discard guard on the library add (criterion 21)', () => {
  const DISCARD_MESSAGE = 'Descartar alterações?';

  beforeEach(() => {
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE });
  });

  it('Esc on a pristine search closes the drawer without asking', async () => {
    const user = userEvent.setup();
    renderTemplateMode();
    await openAddDrawer(user);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Novo exercício' })).not.toBeInTheDocument();
    });
  });

  it('Esc after picking an exercise asks "Descartar alterações?" and keeps the drawer', async () => {
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);
    await pickExercise(user, dialog, 'supino', /Supino reto/i);

    await user.keyboard('{Escape}');

    expect(await screen.findByRole('alertdialog', { name: DISCARD_MESSAGE })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Novo exercício' })).toBeInTheDocument();
  });

  it('Cancelar after editing a pre-filled field asks, and confirming closes without saving', async () => {
    const addExerciseFromTemplate = vi.fn();
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE, addExerciseFromTemplate });
    const user = userEvent.setup();
    renderTemplateMode();
    const dialog = await openAddDrawer(user);
    await pickExercise(user, dialog, 'supino', /Supino reto/i);
    await user.type(within(dialog).getByLabelText(/Séries/i), '1');

    await user.click(within(dialog).getByRole('button', { name: /^Cancelar$/ }));
    const alert = await screen.findByRole('alertdialog', { name: DISCARD_MESSAGE });
    await user.click(within(alert).getByRole('button', { name: /Descartar/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Novo exercício' })).not.toBeInTheDocument();
    });
    expect(addExerciseFromTemplate).not.toHaveBeenCalled();
  });
});

describe('RoutineBuilder — "Editar exercício" drawer unchanged (criterion 22)', () => {
  it('has no tabs and no "Adicionar em lote"', async () => {
    useRoutineBuilder.mockReturnValue({ ...BASE_HOOK_STATE });
    const user = userEvent.setup();
    renderTemplateMode();
    await user.click(screen.getByRole('button', { name: /Expandir treino/i }));
    await user.click(await screen.findByRole('button', { name: /Editar Rosca direta/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar exercício' });

    expect(within(dialog).getByLabelText(/Nome/i)).toHaveValue('Rosca direta');
    expect(within(dialog).queryByRole('tab', { name: /Adicionar exercício/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('tab', { name: /Criar novo/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Adicionar em lote/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('combobox', { name: /Buscar na biblioteca/i })).not.toBeInTheDocument();
  });
});
