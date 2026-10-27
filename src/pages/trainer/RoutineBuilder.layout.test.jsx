import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within, renderWithRoute } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import api from '../../api/axios';
import useRoutineBuilder from '../../hooks/useRoutineBuilder';
import useProtocolBuilder from '../../hooks/useProtocolBuilder';
import useRoutineDraft from '../../hooks/useRoutineDraft';
import useProtocolDraft from '../../hooks/useProtocolDraft';
import useBisetCreate from '../../hooks/useBisetCreate';
import { useToast } from '../../contexts/ToastContext';
import RoutineBuilder from './RoutineBuilder';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../hooks/useRoutineBuilder');
vi.mock('../../hooks/useProtocolBuilder');
vi.mock('../../hooks/useRoutineDraft', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useProtocolDraft', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useBisetCreate');

const STORAGE_KEY = 'routineEditor.formLayout';

const TRAINING = {
  id: 'training-1',
  name: 'Peito & Tríceps',
  category: 'strength',
  weekDay: 'monday',
  exercises: [
    { id: 'ex-1', name: 'Supino reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 12 }, restInterval: 60, hasLoad: true },
  ],
};

const HOOK_STATE = {
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
    startDate: '',
    expirationDate: '',
    trainings: [TRAINING],
  },
  student: { id: 'student-1', firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
  trainingTemplates: [],
  exerciseTemplates: [],
  protocolTemplates: [],
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
};

// Stubs matchMedia so min-width queries at or below the given viewport width match.
const stubViewport = (width) => {
  vi.stubGlobal('matchMedia', vi.fn((query) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1]);
    return {
      matches: Number.isFinite(min) ? width >= min : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  }));
};

// Renders the builder in edit mode (new routine).
const renderEdit = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/routines/new',
    path: '/trainer/routines/new',
  });

// Renders the builder in read-only view mode.
const renderView = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/protocols/proto-1',
    path: '/trainer/protocols/:id',
  });

// Opens the add-training dialog and returns it.
const openTrainingDialog = async (user) => {
  await user.click(screen.getByRole('button', { name: /Adicionar treino/i }));
  return screen.findByRole('dialog', { name: 'Novo treino' });
};

// Expands the training, opens the add-exercise dialog and returns it.
const openExerciseDialog = async (user) => {
  await user.click(screen.getByRole('button', { name: /Expandir treino/i }));
  await user.click(await screen.findByRole('button', { name: /Adicionar exercício/i }));
  return screen.findByRole('dialog', { name: 'Novo exercício' });
};

describe('RoutineBuilder — form layout toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    stubViewport(1280);
    useToast.mockReturnValue({ showToast: vi.fn() });
    useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
    useProtocolDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
    useBisetCreate.mockReturnValue({
      createBiset: vi.fn(),
      dissolveBiset: vi.fn(),
      saving: false,
      error: null,
    });
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
    useRoutineBuilder.mockReturnValue({ ...HOOK_STATE });
    useProtocolBuilder.mockReturnValue({ ...HOOK_STATE });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a "Formulários" radio group with "Janela" checked by default (criterion 13)', () => {
    renderEdit();
    const group = screen.getByRole('radiogroup', { name: 'Formulários' });
    expect(within(group).getByRole('radio', { name: 'Janela' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Painel lateral' })).not.toBeChecked();
  });

  it('opens add-training and add-exercise dialogs in the modal layout by default (criterion 13)', async () => {
    const user = userEvent.setup();
    renderEdit();

    const trainingDialog = await openTrainingDialog(user);
    expect(trainingDialog).toHaveAttribute('data-layout', 'modal');
    await user.click(within(trainingDialog).getByRole('button', { name: /^Cancelar$/ }));

    const exerciseDialog = await openExerciseDialog(user);
    expect(exerciseDialog).toHaveAttribute('data-layout', 'modal');
  });

  it('"Painel lateral" switches add-training and add-exercise dialogs to the side layout (criterion 13)', async () => {
    const user = userEvent.setup();
    renderEdit();
    await user.click(screen.getByRole('radio', { name: 'Painel lateral' }));
    expect(screen.getByRole('radio', { name: 'Painel lateral' })).toBeChecked();

    const trainingDialog = await openTrainingDialog(user);
    expect(trainingDialog).toHaveAttribute('data-layout', 'side');
    await user.click(within(trainingDialog).getByRole('button', { name: /^Cancelar$/ }));

    const exerciseDialog = await openExerciseDialog(user);
    expect(exerciseDialog).toHaveAttribute('data-layout', 'side');
  });

  it('switching back to "Janela" restores the modal layout (criterion 13)', async () => {
    const user = userEvent.setup();
    renderEdit();
    await user.click(screen.getByRole('radio', { name: 'Painel lateral' }));
    await user.click(screen.getByRole('radio', { name: 'Janela' }));

    expect(await openTrainingDialog(user)).toHaveAttribute('data-layout', 'modal');
  });

  it('applies the layout to the edit-training and edit-exercise forms (criterion 13)', async () => {
    const user = userEvent.setup();
    renderEdit();
    await user.click(screen.getByRole('radio', { name: 'Painel lateral' }));

    await user.click(screen.getByRole('button', { name: /Opções do treino Peito & Tríceps/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
    const trainingDialog = await screen.findByRole('dialog', { name: 'Editar treino' });
    expect(trainingDialog).toHaveAttribute('data-layout', 'side');
    await user.click(within(trainingDialog).getByRole('button', { name: /^Cancelar$/ }));

    await user.click(await screen.findByRole('button', { name: /Editar Supino reto/i }));
    expect(await screen.findByRole('dialog', { name: 'Editar exercício' })).toHaveAttribute('data-layout', 'side');
  });

  it('persists the choice in localStorage and restores it after a remount (criterion 13)', async () => {
    const user = userEvent.setup();
    const first = renderEdit();
    await user.click(screen.getByRole('radio', { name: 'Painel lateral' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('side');
    first.unmount();

    renderEdit();
    expect(screen.getByRole('radio', { name: 'Painel lateral' })).toBeChecked();
    expect(await openTrainingDialog(userEvent.setup())).toHaveAttribute('data-layout', 'side');
  });

  it('falls back to "Janela" when the stored value is invalid (criterion 13)', () => {
    window.localStorage.setItem(STORAGE_KEY, 'garbage');
    renderEdit();
    expect(screen.getByRole('radio', { name: 'Janela' })).toBeChecked();
  });

  it('does not render the toggle in view mode (criterion 15)', () => {
    renderView();
    expect(screen.queryByRole('radiogroup', { name: 'Formulários' })).not.toBeInTheDocument();
  });

  it('does not render the toggle below 1024px (criterion 15)', () => {
    stubViewport(800);
    renderEdit();
    expect(screen.queryByRole('radiogroup', { name: 'Formulários' })).not.toBeInTheDocument();
  });
});
