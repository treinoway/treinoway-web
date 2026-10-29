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

// Builds a minimal exercise fixture.
const makeExercise = (id, name, extra = {}) => ({
  id,
  name,
  type: 'strength',
  sets: 4,
  repetitions: { min: 8, max: 12 },
  restInterval: 60,
  hasLoad: true,
  ...extra,
});

// Builds the builder hook state around the given exercises.
const buildState = (exercises) => ({
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
      { id: 'training-1', name: 'Treino A', category: 'strength', weekDay: 'monday', exercises },
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

// Renders the builder on the protocol edit route (substitutes supported).
const renderProtocolEdit = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/protocols/proto-1/edit',
    path: '/trainer/protocols/:id/edit',
  });

// Renders the builder on the template create route (no substitutes).
const renderTemplate = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: '/trainer/routines/new',
    path: '/trainer/routines/new',
  });

// Expands the training card and waits for its exercise list.
const expand = async (user) => {
  await user.click(screen.getByRole('button', { name: /Expandir treino/i }));
  await screen.findByRole('list', { name: /Exercícios/i });
};

// Opens the kebab menu of the named exercise and returns the menu items' names.
const openRowMenu = async (user, name) => {
  await user.click(screen.getByRole('button', { name: new RegExp(`Ações de ${name}`, 'i') }));
  const items = await screen.findAllByRole('menuitem');
  return items.map((item) => item.textContent.trim());
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RoutineBuilder — exercise row menu', () => {
  it('protocol edit mode lists only "Adicionar substituto" and "Remover"', async () => {
    useProtocolBuilder.mockReturnValue(buildState([makeExercise('ex-1', 'Supino reto')]));
    const user = userEvent.setup();
    renderProtocolEdit();
    await expand(user);

    expect(await openRowMenu(user, 'Supino reto')).toEqual(['Adicionar substituto', 'Remover']);
    expect(screen.queryByText('Estrutura')).not.toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('template mode lists only "Remover"', async () => {
    useRoutineBuilder.mockReturnValue(buildState([makeExercise('ex-1', 'Supino reto')]));
    const user = userEvent.setup();
    renderTemplate();
    await expand(user);

    expect(await openRowMenu(user, 'Supino reto')).toEqual(['Remover']);
    expect(screen.queryByText('Estrutura')).not.toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('bi-set member rows get the same trimmed menu', async () => {
    const group = { supersetGroupId: 'group-1', supersetRestInterval: 90 };
    useProtocolBuilder.mockReturnValue(buildState([
      makeExercise('ex-a', 'Supino A', { ...group, supersetOrder: 1 }),
      makeExercise('ex-b', 'Crucifixo B', { ...group, supersetOrder: 2 }),
    ]));
    const user = userEvent.setup();
    renderProtocolEdit();
    await expand(user);

    expect(await openRowMenu(user, 'Supino A')).toEqual(['Adicionar substituto', 'Remover']);
    expect(screen.queryByText('Estrutura')).not.toBeInTheDocument();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('clicking the card opens the "Editar exercício" drawer', async () => {
    useProtocolBuilder.mockReturnValue(buildState([makeExercise('ex-1', 'Supino reto')]));
    const user = userEvent.setup();
    renderProtocolEdit();
    await expand(user);

    await user.click(screen.getByRole('button', { name: 'Editar Supino reto' }));

    expect(await screen.findByRole('dialog', { name: 'Editar exercício' })).toBeInTheDocument();
  });

  it('the card is keyboard reachable and Enter opens the drawer', async () => {
    useProtocolBuilder.mockReturnValue(buildState([makeExercise('ex-1', 'Supino reto')]));
    const user = userEvent.setup();
    renderProtocolEdit();
    await expand(user);

    const card = screen.getByRole('button', { name: 'Editar Supino reto' });
    card.focus();
    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog', { name: 'Editar exercício' });
    expect(within(dialog).getByRole('button', { name: /Salvar alterações/i })).toBeInTheDocument();
  });
});
