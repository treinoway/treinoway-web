import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within, waitFor, renderWithRoute } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import api from '../../api/axios';
import useRoutineBuilder from '../../hooks/useRoutineBuilder';
import useRoutineDraft from '../../hooks/useRoutineDraft';
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

const TRAINING = {
  id: 'training-1',
  name: 'Peito & Tríceps',
  category: 'strength',
  weekDay: 'monday',
  exercises: [],
};

// Builds the mocked routine-builder state with spies for the mutations.
const buildState = (overrides = {}) => ({
  loading: false,
  saving: false,
  error: null,
  data: {
    id: null,
    name: 'Rotina',
    type: '',
    trainingLevel: '',
    defaultDurationWeeks: '',
    genderOrdination: '',
    description: '',
    trainings: [TRAINING],
  },
  trainingTemplates: [],
  exerciseTemplates: [],
  updateMeta: vi.fn(),
  saveRoutine: vi.fn(),
  createTraining: vi.fn().mockResolvedValue({ id: 'training-new' }),
  importTrainingsFromLibrary: vi.fn(),
  updateTraining: vi.fn().mockResolvedValue({}),
  updateTrainingWeekDay: vi.fn(),
  deleteTraining: vi.fn(),
  addExercise: vi.fn(),
  addExerciseFromTemplate: vi.fn(),
  updateExercise: vi.fn(),
  deleteExercise: vi.fn(),
  saveExerciseAsTemplate: vi.fn(),
  ...overrides,
});

// Renders the builder in routine-template mode.
const renderBuilder = () =>
  renderWithRoute(<RoutineBuilder />, { route: '/trainer/routines/new', path: '/trainer/routines/new' });

// Returns the weekday radiogroup of the open training dialog.
const getPicker = () => screen.getByRole('radiogroup', { name: /Dia do treino/i });

describe('RoutineBuilder — weekday picker in the training form (criterion 26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    useToast.mockReturnValue({ showToast: vi.fn() });
    useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
    useBisetCreate.mockReturnValue({ createBiset: vi.fn(), dissolveBiset: vi.fn(), saving: false, error: null });
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('assigns the picked day to the new training through updateTrainingWeekDay', async () => {
    const state = buildState();
    useRoutineBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByRole('button', { name: /Adicionar treino/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo treino' });
    await user.type(within(dialog).getByLabelText(/Nome do treino/i), 'Pernas');
    await user.selectOptions(within(dialog).getByLabelText(/Categoria/i), 'strength');
    await user.click(within(getPicker()).getByRole('radio', { name: /^Qua/ }));

    await user.click(within(dialog).getByRole('button', { name: /Adicionar e abrir/i }));

    await waitFor(() => expect(state.updateTrainingWeekDay).toHaveBeenCalledWith('training-new', 'wednesday'));
    expect(state.createTraining).toHaveBeenCalledWith(expect.not.objectContaining({ weekDay: expect.anything() }));
  });

  it('counts the routine trainings already on each day', async () => {
    useRoutineBuilder.mockReturnValue(buildState());
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByRole('button', { name: /Adicionar treino/i }));
    await screen.findByRole('dialog', { name: 'Novo treino' });

    expect(within(getPicker()).getByRole('radio', { name: /^Seg.*1 treino$/ })).toBeInTheDocument();
    expect(within(getPicker()).getByRole('radio', { name: /^Ter/ })).not.toHaveTextContent('treino');
  });

  it('pre-fills the edit form from the training and saves a changed day', async () => {
    const state = buildState();
    useRoutineBuilder.mockReturnValue(state);
    const user = userEvent.setup();
    renderBuilder();
    await user.click(screen.getByRole('button', { name: /Opções do treino Peito & Tríceps/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar treino' });
    expect(within(getPicker()).getByRole('radio', { name: /^Seg/ })).toBeChecked();

    await user.click(within(getPicker()).getByRole('radio', { name: /^Sex/ }));
    await user.click(within(dialog).getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(state.updateTrainingWeekDay).toHaveBeenCalledWith('training-1', 'friday'));
  });
});
