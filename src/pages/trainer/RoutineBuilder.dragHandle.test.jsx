import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, renderWithRoute } from '../../test/test-utils';
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

const TRAINING = {
  id: 'training-1',
  name: 'Peito & Tríceps',
  category: 'strength',
  weekDay: 'monday',
  exercises: [
    { id: 'ex-1', name: 'Supino reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 12 }, restInterval: 60, hasLoad: true },
    { id: 'ex-2', name: 'Crucifixo', type: 'strength', sets: 3, repetitions: { min: 10, max: 12 }, restInterval: 60, hasLoad: true },
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

// Expands the first training so its exercises are listed.
const expandTraining = async (user) => {
  await user.click(screen.getByRole('button', { name: /Expandir treino/i }));
};

describe('RoutineBuilder: exercise drag handle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    useToast.mockReturnValue({ showToast: vi.fn() });
    useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
    useProtocolDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
    useBisetCreate.mockReturnValue({ createBiset: vi.fn(), dissolveBiset: vi.fn(), saving: false, error: null });
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
    useRoutineBuilder.mockReturnValue({ ...HOOK_STATE });
    useProtocolBuilder.mockReturnValue({ ...HOOK_STATE });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps an active drag handle on every exercise in edit mode', async () => {
    const user = userEvent.setup();
    renderEdit();

    await expandTraining(user);

    const handles = await screen.findAllByRole('button', { name: 'Reordenar exercício' });
    expect(handles).toHaveLength(2);
    handles.forEach((handle) => expect(handle).toHaveAttribute('tabindex', '0'));
  });

  it('does not render a draggable handle in view mode', async () => {
    const user = userEvent.setup();
    renderView();

    await expandTraining(user);

    await screen.findByText('Supino reto');
    expect(screen.queryByRole('button', { name: 'Reordenar exercício' })).not.toBeInTheDocument();
  });
});
