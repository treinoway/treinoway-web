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

  it('renders the exercise title in the stadium hero', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
    });
  });

  it('renders the training name eyebrow', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Treino A — Pernas')).toBeInTheDocument();
    });
  });

  it('renders the KPI stat tiles: session count, peak load, variation, total reps', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      // session count
      expect(screen.getByText('Sessões no período')).toBeInTheDocument();
      // peak load label
      expect(screen.getByText('Pico de carga')).toBeInTheDocument();
      // variation label
      expect(screen.getByText('Variação')).toBeInTheDocument();
      // total reps label
      expect(screen.getByText('Total de reps')).toBeInTheDocument();
    });

    // 3 sessions — each with 32 reps = 96 total reps
    expect(screen.getByText('96')).toBeInTheDocument();
    // peak load = 77.5 kg
    expect(screen.getByText('77.5')).toBeInTheDocument();
  });

  it('renders the Evolução callout with load range when 2+ sessions exist', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Evolução')).toBeInTheDocument();
    });
    // load range: earliest session startLoad=70, latest endLoad=77.5
    expect(screen.getByText(/70 → 77\.5 kg/)).toBeInTheDocument();
  });

  it('renders the Evolução empty state with helper text when only 1 session', async () => {
    api.get.mockResolvedValue({
      data: buildResponse({
        sessions: [
          {
            sessionId: 's-solo',
            date: '2026-04-10',
            status: 'completed',
            maxLoad: 80,
            avgLoad: 80,
            totalVolume: 800,
            completedSets: 3,
            totalReps: 24,
            avgRpe: 7,
            sets: [{ setNumber: 1, repetitions: 8, load: 80, rpe: 7, completed: true }],
          },
        ],
      }),
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Evolução')).toBeInTheDocument();
    });
    expect(screen.getByText('Precisa de pelo menos 2 sessões para comparar')).toBeInTheDocument();
  });

  it('expands the first AND last session by default', async () => {
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
    });

    await waitFor(() => {
      const expandedHeaders = screen.getAllByRole('button', { expanded: true });
      expect(expandedHeaders.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('collapses an expanded session card when clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
    });

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

  it('navigates back to student detail when back button is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildResponse() });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
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
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Abandonada')).not.toBeInTheDocument();
  });

  it('renders Check icon for completed sets and Minus icon for skipped sets', async () => {
    api.get.mockResolvedValue({
      data: buildResponse({
        sessions: [
          {
            sessionId: 's-mixed',
            date: '2026-04-10',
            status: 'completed',
            maxLoad: 70,
            avgLoad: 70,
            totalVolume: 560,
            completedSets: 1,
            totalReps: 8,
            avgRpe: 7,
            sets: [
              { setNumber: 1, repetitions: 8, load: 70, rpe: 7, completed: true },
              { setNumber: 2, repetitions: 0, load: null, rpe: null, completed: false },
            ],
          },
        ],
      }),
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
    });

    // The session is expanded by default (only one session = both first+last)
    await waitFor(() => {
      expect(screen.getByLabelText('Concluída')).toBeInTheDocument();
      expect(screen.getByLabelText('Não concluída')).toBeInTheDocument();
    });
  });

  it('keeps the check/minus mark in the last column when set has no load and no rpe', async () => {
    api.get.mockResolvedValue({
      data: buildResponse({
        sessions: [
          {
            sessionId: 's-noload',
            date: '2026-04-10',
            status: 'completed',
            maxLoad: null,
            avgLoad: null,
            totalVolume: 0,
            completedSets: 1,
            totalReps: 10,
            avgRpe: null,
            sets: [
              { setNumber: 1, repetitions: 10, load: null, rpe: null, completed: true },
            ],
          },
        ],
      }),
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
    });

    // Mark must still be present and correctly labelled regardless of missing load/rpe
    await waitFor(() => {
      expect(screen.getByLabelText('Concluída')).toBeInTheDocument();
    });

    // The set label and reps are present
    expect(screen.getByText('Set 1')).toBeInTheDocument();
    expect(screen.getByText('10 reps')).toBeInTheDocument();

    // The load and rpe text must NOT appear (slots are empty placeholders)
    expect(screen.queryByText(/kg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/RPE/)).not.toBeInTheDocument();
  });

  it('renders load and rpe values when both are present', async () => {
    api.get.mockResolvedValue({
      data: buildResponse({
        sessions: [
          {
            sessionId: 's-full',
            date: '2026-04-15',
            status: 'completed',
            maxLoad: 80,
            avgLoad: 80,
            totalVolume: 640,
            completedSets: 1,
            totalReps: 8,
            avgRpe: 8,
            sets: [
              { setNumber: 1, repetitions: 8, load: 80, rpe: 8, completed: true },
            ],
          },
        ],
      }),
    });
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Agachamento livre' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Set 1')).toBeInTheDocument();
    });

    expect(screen.getByText('8 reps')).toBeInTheDocument();
    expect(screen.getByText('80 kg')).toBeInTheDocument();
    expect(screen.getByText('RPE 8')).toBeInTheDocument();
    expect(screen.getByLabelText('Concluída')).toBeInTheDocument();
  });
});
