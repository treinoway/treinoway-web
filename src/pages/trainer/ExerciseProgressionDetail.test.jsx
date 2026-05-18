import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithRoute } from '../../test/test-utils';
import ExerciseProgressionDetail from './ExerciseProgressionDetail';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const buildResponse = ({ sessions } = {}) => ({
  exercise: {
    id: 'ex-1',
    name: 'Agachamento livre',
    hasLoad: true,
    prescriptionMode: 'reps',
    trainingId: 't-1',
    trainingName: 'Treino A — Pernas',
  },
  window: { from: '2026-04-02T00:00:00.000Z', to: '2026-05-02T00:00:00.000Z' },
  sessions: sessions ?? [
    {
      sessionId: 's-1',
      date: '2026-04-05',
      status: 'completed',
      maxLoad: 70,
      avgLoad: 65,
      totalVolume: 1300,
      completedSets: 4,
      totalReps: 32,
      avgRpe: 7,
      sets: [
        { setNumber: 1, repetitions: 8, load: 65, rpe: 7, completed: true },
        { setNumber: 2, repetitions: 8, load: 70, rpe: 8, completed: true },
      ],
    },
    {
      sessionId: 's-2',
      date: '2026-04-22',
      status: 'completed',
      maxLoad: 75,
      avgLoad: 72,
      totalVolume: 1500,
      completedSets: 4,
      totalReps: 32,
      avgRpe: 8,
      sets: [
        { setNumber: 1, repetitions: 8, load: 72, rpe: 7, completed: true },
        { setNumber: 2, repetitions: 8, load: 75, rpe: 8, completed: true },
      ],
    },
    {
      sessionId: 's-3',
      date: '2026-05-01',
      status: 'completed',
      maxLoad: 77.5,
      avgLoad: 74,
      totalVolume: 1600,
      completedSets: 4,
      totalReps: 32,
      avgRpe: 8,
      sets: [
        { setNumber: 1, repetitions: 8, load: 74, rpe: 7, completed: true },
        { setNumber: 2, repetitions: 8, load: 77.5, rpe: 8, completed: true },
      ],
    },
  ],
});

const renderDetail = () => renderWithRoute(<ExerciseProgressionDetail />, {
  route: '/trainer/students/s-1/exercises/ex-1/progression?from=2026-04-02T00:00:00.000Z&to=2026-05-02T00:00:00.000Z',
  path: '/trainer/students/:studentId/exercises/:exerciseId/progression',
});

describe('ExerciseProgressionDetail', () => {
  beforeEach(() => {
    api.get.mockReset();
    mockNavigate.mockReset();
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'trainer-1' } });
  });

  it('shows loading screen on initial render', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders the exercise title and session count', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
    });
    expect(screen.getByText(/3 sessões neste período/)).toBeInTheDocument();
  });

  it('renders the load range and trend chip on the summary line', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText(/70 → 77.5 kg/)).toBeInTheDocument();
    });
  });

  it('expands the first AND last session by default', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
    });

    // Wait for the queueMicrotask-deferred state update.
    await waitFor(() => {
      const expandedHeaders = screen.getAllByRole('button', { expanded: true });
      // Period chip + 2 expanded session cards = at least 2 expanded session headers
      expect(expandedHeaders.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('collapses an expanded session card when clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
    });

    // The most recent session (s-3, 1 de mai) is expanded by default.
    // Wait for the queueMicrotask deferred state, then find the expanded session header
    // and toggle it closed to confirm interactivity.
    await waitFor(() => {
      const expanded = screen.getAllByRole('button', { expanded: true })
        .filter((btn) => btn.className.includes('exercise-session-card-header'));
      expect(expanded.length).toBeGreaterThan(0);
    });

    const expandedHeader = screen.getAllByRole('button', { expanded: true })
      .find((btn) => btn.className.includes('exercise-session-card-header'));
    expect(expandedHeader).toBeTruthy();

    await user.click(expandedHeader);

    await waitFor(() => {
      expect(expandedHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('renders an empty state when no sessions are returned', async () => {
    api.get.mockResolvedValue({ data: buildResponse({ sessions: [] }) });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Aluno ainda não treinou nesse período')).toBeInTheDocument();
    });
  });

  it('shows an error block when the request fails', async () => {
    api.get.mockRejectedValue({ response: { status: 500 }, userMessage: 'Erro' });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Falha ao carregar')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('navigates back to student detail when "Voltar" header is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Voltar para aluno/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/s-1');
  });

  it('uses URL params for the initial period (overriding persisted preset)', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    const call = api.get.mock.calls[0];
    expect(call[1].params.dateFrom).toBe('2026-04-02T00:00:00.000Z');
    expect(call[1].params.dateTo).toBe('2026-05-02T00:00:00.000Z');
  });

  it('toggle defaults to unchecked and API is called without includeAbandoned=true', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
    });

    const toggle = screen.getByRole('checkbox', { name: /Incluir sessões abandonadas/ });
    expect(toggle).not.toBeChecked();

    const firstCallParams = api.get.mock.calls[0][1].params;
    expect(firstCallParams.includeAbandoned).toBeUndefined();
  });

  it('toggling the checkbox triggers a refetch with includeAbandoned: true', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
    });

    const callsBefore = api.get.mock.calls.length;
    const toggle = screen.getByRole('checkbox', { name: /Incluir sessões abandonadas/ });
    await user.click(toggle);

    await waitFor(() => {
      expect(api.get.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    const lastCall = api.get.mock.calls[api.get.mock.calls.length - 1];
    expect(lastCall[1].params.includeAbandoned).toBe(true);
  });

  it('renders "Abandonada" badge on a session with status abandoned', async () => {
    api.get.mockResolvedValue({
      data: buildResponse({
        sessions: [
          {
            sessionId: 's-ab',
            date: '2026-04-10',
            status: 'abandoned',
            maxLoad: 60,
            avgLoad: 60,
            totalVolume: 300,
            completedSets: 1,
            totalReps: 8,
            avgRpe: 6,
            sets: [{ setNumber: 1, repetitions: 8, load: 60, rpe: 6, completed: true }],
          },
        ],
      }),
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Abandonada')).toBeInTheDocument();
    });
  });

  it('does not render "Abandonada" badge on a session with status completed', async () => {
    api.get.mockResolvedValue({
      data: buildResponse({
        sessions: [
          {
            sessionId: 's-ok',
            date: '2026-04-15',
            status: 'completed',
            maxLoad: 70,
            avgLoad: 68,
            totalVolume: 1000,
            completedSets: 4,
            totalReps: 32,
            avgRpe: 7,
            sets: [{ setNumber: 1, repetitions: 8, load: 68, rpe: 7, completed: true }],
          },
        ],
      }),
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
    });

    expect(screen.queryByText('Abandonada')).not.toBeInTheDocument();
  });
});
