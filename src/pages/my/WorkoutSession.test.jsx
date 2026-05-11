import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import WorkoutSession from './WorkoutSession';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const SESSION_ROUTE = '/my/workout-sessions/:sessionId';
const SESSION_PATH = '/my/workout-sessions/session-1';

const mockExerciseLogs = [
  {
    id: 'log-1',
    workoutSessionId: 'session-1',
    exerciseId: 'ex-1',
    status: 'pending',
    order: 0,
    notes: null,
    exercise: { id: 'ex-1', name: 'Supino Reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 12 }, restInterval: 90 },
    setLogs: [],
  },
  {
    id: 'log-2',
    workoutSessionId: 'session-1',
    exerciseId: 'ex-2',
    status: 'completed',
    order: 1,
    notes: null,
    exercise: { id: 'ex-2', name: 'Crucifixo', type: 'strength', sets: 3, repetitions: { min: 12, max: 15 }, restInterval: null },
    setLogs: [
      { id: 'set-1', exerciseLogId: 'log-2', setNumber: 1, repetitions: 12, load: 15, rpe: null, restSeconds: null, completed: true },
    ],
  },
];

const mockSession = {
  id: 'session-1',
  trainingId: 'training-1',
  userId: 'user-1',
  status: 'in_progress',
  startedAt: '2026-03-08T10:00:00Z',
  finishedAt: null,
  durationSeconds: null,
  notes: null,
  training: { id: 'training-1', name: 'Peito e Tríceps' },
  exerciseLogs: mockExerciseLogs,
};

const mockCompletedSession = {
  ...mockSession,
  status: 'completed',
  finishedAt: '2026-03-08T11:00:00Z',
  durationSeconds: 3600,
};

function renderSession() {
  return renderWithRoute(<WorkoutSession />, {
    route: SESSION_PATH,
    path: SESSION_ROUTE,
  });
}

describe('WorkoutSession', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.patch.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    mockShowToast.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderSession();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders training name as page title', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Peito e Tríceps')).toBeInTheDocument();
    });
  });

  it('renders session status badge', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Em andamento')).toBeInTheDocument();
    });
  });

  it('renders exercise names from exercise logs', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      expect(screen.getByText('Crucifixo')).toBeInTheDocument();
    });
  });

  it('shows Finalizar and Abandonar buttons for in-progress session', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Finalizar Treino')).toBeInTheDocument();
      expect(screen.getByText('Abandonar')).toBeInTheDocument();
    });
  });

  it('does not show Finalizar button for completed session', async () => {
    api.get.mockResolvedValue({ data: mockCompletedSession });

    renderSession();

    await waitFor(() => {
      expect(screen.queryByText('Finalizar Treino')).not.toBeInTheDocument();
    });
  });

  it('shows duration for completed session', async () => {
    api.get.mockResolvedValue({ data: mockCompletedSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('60min')).toBeInTheDocument();
    });
  });

  it('calls PATCH to finish session when Finalizar is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockSession });
    api.patch.mockResolvedValue({ data: mockCompletedSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Finalizar Treino')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Finalizar Treino'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/my/workout-sessions/session-1',
        { status: 'completed' },
      );
    });
  });

  it('calls PATCH to abandon session when Abandonar is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockSession });
    api.patch.mockResolvedValue({ data: { ...mockSession, status: 'abandoned' } });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Abandonar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Abandonar'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/my/workout-sessions/session-1',
        { status: 'abandoned' },
      );
    });
  });

  it('shows set logs for an exercise that has them', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Série 1')).toBeInTheDocument();
      expect(screen.getByText('12 reps · 15 kg')).toBeInTheDocument();
    });
  });

  it('shows Adicionar Série button for exercises in an active session', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      const addButtons = screen.getAllByText('Adicionar Série');
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });

  it('shows set log form when Adicionar Série is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getAllByText('Adicionar Série')[0]).toBeInTheDocument();
    });

    await user.click(screen.getAllByText('Adicionar Série')[0]);

    await waitFor(() => {
      expect(screen.getAllByLabelText(/Série \*/i)[0]).toBeInTheDocument();
    });
  });

  it('displays rest interval in exercise meta when restInterval is set', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText(/Descanso: 1min 30s/)).toBeInTheDocument();
    });
  });

  it('does not display rest interval when restInterval is null', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Crucifixo')).toBeInTheDocument();
    });

    const crucifixoMeta = screen.getByText('Força · 3x12–15');
    expect(crucifixoMeta.textContent).not.toContain('Descanso');
  });

  it('shows empty state when session is not found after error', async () => {
    api.get.mockRejectedValue(new Error('Not found'));

    renderSession();

    await waitFor(() => {
      expect(screen.getByText('Sessão não encontrada')).toBeInTheDocument();
    });
  });

  it('shows Concluir button for pending exercise log in active session', async () => {
    api.get.mockResolvedValue({ data: mockSession });

    renderSession();

    await waitFor(() => {
      expect(screen.getAllByText('Concluir').length).toBeGreaterThan(0);
    });
  });

  it('calls PATCH exercise log when Concluir is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockSession });
    api.patch.mockResolvedValue({
      data: { ...mockExerciseLogs[0], status: 'completed', setLogs: [] },
    });

    renderSession();

    await waitFor(() => {
      expect(screen.getAllByText('Concluir')[0]).toBeInTheDocument();
    });

    await user.click(screen.getAllByText('Concluir')[0]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/my/workout-sessions/session-1/exercise-logs/log-1',
        { status: 'completed' },
      );
    });
  });

  describe('swap flow', () => {
    const sessionWithSubstitutes = {
      ...mockSession,
      exerciseLogs: [
        {
          id: 'log-1',
          workoutSessionId: 'session-1',
          exerciseId: 'ex-1',
          status: 'pending',
          order: 0,
          notes: null,
          substitutedByExerciseId: null,
          exercise: {
            id: 'ex-1',
            name: 'Supino Reto',
            type: 'strength',
            sets: 4,
            repetitions: { min: 8, max: 12 },
            substitutes: [
              { id: 'sub-1', name: 'Crucifixo', substituteOrder: 0 },
              { id: 'sub-2', name: 'Peck deck', substituteOrder: 1 },
            ],
          },
          setLogs: [],
        },
      ],
    };

    it('shows the alt count chip and Trocar button when substitutes exist', async () => {
      api.get.mockResolvedValue({ data: sessionWithSubstitutes });
      renderSession();
      await waitFor(() => {
        expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      });
      expect(screen.getByLabelText('2 alternativas')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Trocar Supino Reto' })
      ).toBeInTheDocument();
    });

    it('opens the swap sheet, calls the substitute endpoint, and stamps the principal log', async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: sessionWithSubstitutes });
      api.post.mockResolvedValue({
        data: {
          id: 'log-2',
          workoutSessionId: 'session-1',
          exerciseId: 'sub-1',
          status: 'pending',
          order: 1,
          substitutedForExerciseId: 'ex-1',
          exercise: { id: 'sub-1', name: 'Crucifixo', substitutes: [] },
          setLogs: [],
        },
      });
      renderSession();
      await waitFor(() => {
        expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Trocar Supino Reto' }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Trocar por Crucifixo' }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/my/workout-sessions/session-1/exercise-logs/log-1/substitute',
          { substituteExerciseId: 'sub-1' },
        );
      });
    });
  });
});
