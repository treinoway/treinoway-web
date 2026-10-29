import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within, renderWithRoute } from '../../test/test-utils';
import SessionDetail from './SessionDetail';
import { useToast } from '../../contexts/ToastContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});
vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, platformPlan: { tier: 'PRO', limits: { aiActionsPerStudent: 3 } } },
    hasRole: (role) => role === 'TRAINER',
  }),
}));
vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../components/SessionDetailHero', () => ({ default: () => <div /> }));
vi.mock('../../components/SessionNotesGrid', () => ({ default: () => <div /> }));

// Builds a completed set log.
const setLog = (id, load, repetitions) => ({ id, setNumber: 1, load, repetitions, rpe: null, completed: true, notes: null });

// Builds an exercise log for the session payload.
const makeLog = (id, exerciseId, name, overrides = {}) => ({
  id,
  exerciseId,
  status: 'completed',
  substitutedByExerciseId: null,
  notes: null,
  order: 0,
  exercise: { id: exerciseId, name, sets: 3, repetitions: { min: 12, max: 12 }, restInterval: 60 },
  setLogs: [setLog(`${id}-s1`, 20, 10)],
  ...overrides,
});

const PRINCIPAL = makeLog('log-principal', 'ex-supino', 'Supino reto', {
  status: 'substituted',
  substitutedByExerciseId: 'ex-crucifixo',
  setLogs: [],
  exercise: { id: 'ex-supino', name: 'Supino reto', sets: 4, repetitions: { min: 8, max: 8 }, restInterval: 90 },
});
const SUBSTITUTE = makeLog('log-sub', 'ex-crucifixo', 'Crucifixo', { order: 0 });
const OTHER = makeLog('log-other', 'ex-remada', 'Remada curvada', { order: 1 });

// Renders the session detail page with the given exercise logs.
const renderWithLogs = async (exerciseLogs) => {
  api.get.mockImplementation((url) => {
    if (url.includes('workout-sessions/session-1')) {
      return Promise.resolve({ data: { id: 'session-1', status: 'completed', training: { id: 't', name: 'Treino B' }, notes: null, exerciseLogs } });
    }
    return Promise.resolve({ data: [] });
  });
  renderWithRoute(<SessionDetail />, {
    route: '/trainer/students/student-1/sessions/session-1',
    path: '/trainer/students/:studentId/sessions/:sessionId',
  });
  await screen.findByRole('heading', { name: 'Exercícios da sessão' });
};

describe('SessionDetail — swapped exercise rendered as one row (criterion 26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast: vi.fn() });
    useAiChat.mockReturnValue({ startConversation: vi.fn() });
  });

  it('merges principal + substitute logs into ONE row at the principal position', async () => {
    await renderWithLogs([PRINCIPAL, OTHER, SUBSTITUTE]);

    const toggles = screen.getAllByRole('button', { name: /exercício/i });
    expect(toggles).toHaveLength(2);
    expect(toggles[0]).toHaveAccessibleName(/Crucifixo/);
    expect(toggles[1]).toHaveAccessibleName(/Remada curvada/);
  });

  it('shows substitute name, "Substituto" tag, "no lugar de" caption and substitute volume', async () => {
    await renderWithLogs([PRINCIPAL, OTHER, SUBSTITUTE]);

    expect(screen.getByText('Crucifixo')).toBeInTheDocument();
    expect(screen.getByText('Substituto')).toBeInTheDocument();
    expect(screen.getByText('no lugar de Supino reto')).toBeInTheDocument();
    // why: OTHER renders identical volume/meta text, so scope to the merged row
    const mergedRow = within(screen.getByRole('button', { name: /Crucifixo/ }).closest('.session-exercise'));
    expect(mergedRow.getByText('200 kg')).toBeInTheDocument();
    expect(mergedRow.getByText('3 séries × 12 reps · desc. 60s')).toBeInTheDocument();
  });

  it('does not render the principal as its own row nor as "Pulado"', async () => {
    await renderWithLogs([PRINCIPAL, OTHER, SUBSTITUTE]);

    expect(screen.queryByText('Supino reto')).not.toBeInTheDocument();
    expect(screen.queryByText('Pulado')).not.toBeInTheDocument();
  });

  it('the merged row expands to the substitute sets', async () => {
    await renderWithLogs([PRINCIPAL, OTHER, SUBSTITUTE]);

    expect(within(screen.getByRole('table')).getByText('20 kg')).toBeInTheDocument();
  });

  it('an undone swap (no substitute) shows no special tag or caption', async () => {
    const undone = { ...PRINCIPAL, status: 'completed', substitutedByExerciseId: null, setLogs: [setLog('s', 50, 8)] };
    await renderWithLogs([undone, OTHER]);

    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    expect(screen.queryByText('Substituto')).not.toBeInTheDocument();
    expect(screen.queryByText(/no lugar de/i)).not.toBeInTheDocument();
  });

  it('a log not involved in a swap that is named like another exercise is not merged by name', async () => {
    await renderWithLogs([OTHER, makeLog('log-x', 'ex-other-2', 'Remada baixa')]);

    expect(screen.queryByText('Substituto')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /exercício/i })).toHaveLength(2);
  });
});

describe('SessionDetail — bi-set members grouped (criterion 27)', () => {
  const grouped = (log, order) => ({
    ...log,
    exercise: { ...log.exercise, supersetGroupId: 'g1', supersetOrder: order, supersetRestInterval: 90 },
  });
  const A = grouped(makeLog('log-a', 'ex-a', 'Supino A'), 0);
  const B = grouped(makeLog('log-b', 'ex-b', 'Rosca B'), 1);

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast: vi.fn() });
    useAiChat.mockReturnValue({ startConversation: vi.fn() });
  });

  it('renders members inside a "Bi-set" group, ordered by supersetOrder; singles stay outside', async () => {
    await renderWithLogs([B, A, OTHER]);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    expect(within(group).getByText('Bi-set')).toBeInTheDocument();
    const names = within(group).getAllByRole('button', { name: /exercício/i }).map((b) => b.getAttribute('aria-label'));
    expect(names).toHaveLength(2);
    expect(names[0]).toMatch(/Supino A/);
    expect(names[1]).toMatch(/Rosca B/);
    expect(within(group).queryByText('Remada curvada')).not.toBeInTheDocument();
    expect(screen.getByText('Remada curvada')).toBeInTheDocument();
  });

  it('exercises without superset data render no group', async () => {
    await renderWithLogs([OTHER, makeLog('log-y', 'ex-y', 'Puxada')]);

    expect(screen.queryByRole('group', { name: 'Bi-set' })).not.toBeInTheDocument();
  });

  it('a swapped bi-set member stays in the group as the merged substitute row', async () => {
    const principal = grouped(PRINCIPAL, 0);
    await renderWithLogs([principal, B, SUBSTITUTE]);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    expect(within(group).getByText('Crucifixo')).toBeInTheDocument();
    expect(within(group).getByText('no lugar de Supino reto')).toBeInTheDocument();
    expect(within(group).getByText('Rosca B')).toBeInTheDocument();
    expect(within(group).getAllByRole('button', { name: /exercício/i })).toHaveLength(2);
  });
});
