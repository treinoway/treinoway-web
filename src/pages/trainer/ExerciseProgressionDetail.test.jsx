import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, renderWithRoute } from '../../test/test-utils';
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

const PROGRESSION_URL = /dashboard\/exercise-progression/;

const mockApi = (progression) => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/students') {
      return Promise.resolve({ data: [{ id: 's-1', firstName: 'Adeildo', lastName: 'Neto' }] });
    }
    return typeof progression === 'function' ? progression(url) : Promise.resolve({ data: progression });
  });
};

const progressionCalls = () => api.get.mock.calls.filter(([url]) => PROGRESSION_URL.test(url));

const sessionOf = (overrides) => ({
  sessionId: 's-x',
  date: '2026-04-10',
  status: 'completed',
  maxLoad: 80,
  avgLoad: 80,
  totalVolume: 640,
  completedSets: 1,
  totalReps: 8,
  avgRpe: 8,
  sets: [{ setNumber: 1, repetitions: 8, load: 80, rpe: 8, completed: true }],
  ...overrides,
});

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

const waitForTitle = () => screen.findByRole('heading', { level: 1, name: 'Agachamento livre' });

const kpiValue = (label) => screen.getByText(label).nextElementSibling;

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

  it('renders the exercise title and the training overline', async () => {
    mockApi(buildResponse());
    renderDetail();

    await waitForTitle();
    expect(screen.getByText('Treino A — Pernas')).toBeInTheDocument();
  });

  it('renders the back link with the student name and navigates to the student', async () => {
    const user = userEvent.setup();
    mockApi(buildResponse());
    renderDetail();

    const back = await screen.findByRole('button', { name: 'Voltar para o perfil do aluno' });
    await waitFor(() => expect(back).toHaveTextContent('Adeildo Neto · Progressão de carga'));
    await user.click(back);
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/s-1');
  });

  it('falls back to a generic back label when the student cannot be loaded', async () => {
    api.get.mockImplementation((url) => (url === '/trainer/students'
      ? Promise.reject(new Error('x'))
      : Promise.resolve({ data: buildResponse() })));
    renderDetail();

    const back = await screen.findByRole('button', { name: 'Voltar para o perfil do aluno' });
    expect(back).toHaveTextContent('Progressão de carga');
    expect(back).not.toHaveTextContent('·');
  });

  it('renders the four KPI values', async () => {
    mockApi(buildResponse());
    renderDetail();
    await waitForTitle();

    expect(kpiValue('Sessões no período')).toHaveTextContent('3');
    expect(kpiValue('Pico de carga')).toHaveTextContent('77,5 kg');
    expect(kpiValue('Variação')).toHaveTextContent('+10,71%');
    expect(kpiValue('Total de reps')).toHaveTextContent('96');
  });

  it('renders the Evolução box with load range and caption', async () => {
    mockApi(buildResponse());
    renderDetail();
    await waitForTitle();

    expect(screen.getByText('Evolução')).toBeInTheDocument();
    expect(screen.getByText(/70 → 77,5 kg/)).toBeInTheDocument();
    expect(screen.getByText(/Comparado à 1ª sessão \(5 de abr\)/)).toBeInTheDocument();
  });

  it('uses the success badge tone when load went up', async () => {
    mockApi(buildResponse());
    renderDetail();
    await waitForTitle();

    expect(screen.getByLabelText('Variação +10,71%')).toHaveClass('badge--success');
  });

  it('uses the error badge tone when load went down', async () => {
    mockApi(buildResponse({
      sessions: [
        sessionOf({ sessionId: 'a', date: '2026-04-05', maxLoad: 80 }),
        sessionOf({ sessionId: 'b', date: '2026-04-20', maxLoad: 60 }),
      ],
    }));
    renderDetail();
    await waitForTitle();

    expect(screen.getByLabelText('Variação -25%')).toHaveClass('badge--error');
    expect(kpiValue('Variação')).toHaveTextContent('-25%');
  });

  it('uses the neutral badge tone when load is flat', async () => {
    mockApi(buildResponse({
      sessions: [
        sessionOf({ sessionId: 'a', date: '2026-04-05', maxLoad: 80 }),
        sessionOf({ sessionId: 'b', date: '2026-04-20', maxLoad: 80 }),
      ],
    }));
    renderDetail();
    await waitForTitle();

    expect(screen.getByLabelText('Variação 0%')).toHaveClass('badge--neutral');
  });

  it('renders the Evolução empty state with helper text when only 1 session', async () => {
    mockApi(buildResponse({ sessions: [sessionOf({ sessionId: 's-solo' })] }));
    renderDetail();
    await waitForTitle();

    expect(screen.getByText('Evolução')).toBeInTheDocument();
    expect(screen.getByText('Precisa de pelo menos 2 sessões para comparar')).toBeInTheDocument();
    expect(kpiValue('Variação')).toHaveTextContent('—');
  });

  it('opens the period picker from the period button', async () => {
    const user = userEvent.setup();
    mockApi(buildResponse());
    renderDetail();
    await waitForTitle();

    const periodButton = screen.getByRole('button', { name: /Alterar período/ });
    expect(periodButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(periodButton);
    expect(periodButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('expands the first AND last session by default and collapses the middle one', async () => {
    mockApi(buildResponse());
    renderDetail();
    await waitForTitle();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sessão de 05 abr/ })).toHaveAttribute('aria-expanded', 'true');
    });
    expect(screen.getByRole('button', { name: /sessão de 01 mai/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /sessão de 22 abr/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('collapses an expanded session and expands a collapsed one when clicked', async () => {
    const user = userEvent.setup();
    mockApi(buildResponse());
    renderDetail();
    await waitForTitle();

    const expanded = await screen.findByRole('button', { name: /Recolher sessão de 01 mai/ });
    await user.click(expanded);
    expect(expanded).toHaveAttribute('aria-expanded', 'false');

    const collapsed = screen.getByRole('button', { name: /Expandir sessão de 22 abr/ });
    await user.click(collapsed);
    expect(collapsed).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders an empty state when no sessions are returned', async () => {
    mockApi(buildResponse({ sessions: [] }));
    renderDetail();

    expect(await screen.findByText('Aluno ainda não treinou nesse período')).toBeInTheDocument();
    expect(kpiValue('Pico de carga')).toHaveTextContent('—');
  });

  it('shows an error block with retry and back when the request fails', async () => {
    const user = userEvent.setup();
    mockApi(() => Promise.reject({ response: { status: 500 }, userMessage: 'Erro' }));
    renderDetail();

    expect(await screen.findByText('Falha ao carregar')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const callsBefore = progressionCalls().length;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(progressionCalls().length).toBeGreaterThan(callsBefore));

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/s-1');
  });

  it('uses URL params for the initial period (overriding persisted preset)', async () => {
    mockApi(buildResponse());
    renderDetail();

    await waitFor(() => expect(progressionCalls().length).toBeGreaterThan(0));
    const [, config] = progressionCalls()[0];
    expect(config.params.dateFrom).toBe('2026-04-02T00:00:00.000Z');
    expect(config.params.dateTo).toBe('2026-05-02T00:00:00.000Z');
  });

  it('abandoned toggle starts off and the API is called without includeAbandoned', async () => {
    mockApi(buildResponse());
    renderDetail();
    await waitForTitle();

    const toggle = screen.getByRole('switch', { name: 'Incluir sessões abandonadas' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(progressionCalls()[0][1].params.includeAbandoned).toBeUndefined();
  });

  it('turning the toggle on refetches with includeAbandoned and turning it off drops the flag', async () => {
    const user = userEvent.setup();
    mockApi(buildResponse());
    renderDetail();
    await waitForTitle();

    const toggle = screen.getByRole('switch', { name: 'Incluir sessões abandonadas' });
    const callsBefore = progressionCalls().length;
    await user.click(toggle);

    await waitFor(() => expect(progressionCalls().length).toBeGreaterThan(callsBefore));
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    const calls = progressionCalls();
    expect(calls[calls.length - 1][1].params.includeAbandoned).toBe(true);

    const callsAfterOn = calls.length;
    await user.click(toggle);
    await waitFor(() => expect(progressionCalls().length).toBeGreaterThan(callsAfterOn));
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    const latest = progressionCalls();
    expect(latest[latest.length - 1][1].params.includeAbandoned).toBeUndefined();
  });

  it('renders the "Abandonada" badge only on abandoned sessions', async () => {
    mockApi(buildResponse({ sessions: [sessionOf({ sessionId: 's-ab', status: 'abandoned' })] }));
    renderDetail();

    expect(await screen.findByText('Abandonada')).toBeInTheDocument();
  });

  it('does not render "Abandonada" on completed sessions', async () => {
    mockApi(buildResponse({ sessions: [sessionOf({ sessionId: 's-ok' })] }));
    renderDetail();
    await waitForTitle();

    expect(screen.queryByText('Abandonada')).not.toBeInTheDocument();
  });

  it('renders set rows with reps, load, RPE and completion marks', async () => {
    mockApi(buildResponse({
      sessions: [
        sessionOf({
          sets: [
            { setNumber: 1, repetitions: 8, load: 70, rpe: 7, completed: true },
            { setNumber: 2, repetitions: 0, load: null, rpe: null, completed: false },
          ],
        }),
      ],
    }));
    renderDetail();

    expect(await screen.findByText('Série 1')).toBeInTheDocument();
    expect(screen.getByText('8 reps')).toBeInTheDocument();
    expect(screen.getByText('70 kg')).toBeInTheDocument();
    expect(screen.getByText('RPE 7')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Concluída' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Não concluída' })).toBeInTheDocument();
  });

  it('omits load and RPE when absent', async () => {
    mockApi(buildResponse({
      sessions: [
        sessionOf({
          maxLoad: null,
          sets: [{ setNumber: 1, repetitions: 10, load: null, rpe: null, completed: true }],
        }),
      ],
    }));
    renderDetail();

    expect(await screen.findByText('Série 1')).toBeInTheDocument();
    expect(screen.getByText('10 reps')).toBeInTheDocument();
    expect(screen.queryByText(/RPE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ kg/)).not.toBeInTheDocument();
  });
});
