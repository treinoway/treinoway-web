import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, renderWithRoute } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import api from '../../api/axios';
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

// Builds the builder hook state around a single exercise.
const buildState = () => ({
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
    startDate: '',
    expirationDate: '',
    trainings: [
      {
        id: 'training-1',
        name: 'Treino A',
        category: 'strength',
        weekDay: 'monday',
        exercises: [
          {
            id: 'ex-1',
            name: 'Supino reto',
            type: 'strength',
            sets: 4,
            repetitions: { min: 8, max: 12 },
            restInterval: 60,
            hasLoad: true,
          },
        ],
      },
    ],
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
  refetchTrainingExercises: vi.fn(),
  addLocalSubstitute: vi.fn(),
  updateLocalSubstitute: vi.fn(),
  removeLocalSubstitute: vi.fn(),
  createLocalSuperset: vi.fn(),
  dissolveLocalSuperset: vi.fn(),
  setLocalSupersetRest: vi.fn(),
});

// Renders the builder on the protocol edit route and expands the training.
const renderExpanded = async (user) => {
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/protocols/proto-1/edit',
    path: '/trainer/protocols/:id/edit',
  });
  await user.click(screen.getByRole('button', { name: /Expandir treino/i }));
  await screen.findByRole('list', { name: /Exercícios/i });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  useToast.mockReturnValue({ showToast: vi.fn() });
  useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useProtocolDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useBisetCreate.mockReturnValue({ createBiset: vi.fn(), dissolveBiset: vi.fn(), saving: false, error: null });
  api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  useProtocolBuilder.mockReturnValue(buildState());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RoutineBuilder — row menu keyboard', () => {
  it('Enter on the kebab trigger opens the menu and not the edit drawer', async () => {
    const user = userEvent.setup();
    await renderExpanded(user);

    screen.getByRole('button', { name: /Ações de Supino reto/i }).focus();
    await user.keyboard('{Enter}');

    expect((await screen.findAllByRole('menuitem')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Editar exercício')).not.toBeInTheDocument();
  });

  it('Enter on the card itself still opens the edit drawer', async () => {
    const user = userEvent.setup();
    await renderExpanded(user);

    screen.getByRole('button', { name: /Editar Supino reto/i }).focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByText('Editar exercício')).toBeInTheDocument();
  });
});
