import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import SessionDetailHero from './SessionDetailHero';

const makeSession = (overrides = {}) => ({
  status: 'completed',
  startedAt: '2026-05-13T18:32:00.000Z',
  finishedAt: '2026-05-13T19:30:00.000Z',
  durationSeconds: 3480,
  training: { name: 'Treino B · Costas e Bíceps', category: 'Hipertrofia' },
  exerciseLogs: [
    {
      id: 'elog-1',
      status: 'completed',
      exercise: { sets: 2 },
      setLogs: [
        { id: 's1', setNumber: 1, load: 70, repetitions: 10, rpe: 7, completed: true },
        { id: 's2', setNumber: 2, load: 75, repetitions: 10, rpe: 8, completed: true },
      ],
    },
  ],
  ...overrides,
});

describe('SessionDetailHero', () => {
  const onEditNote = vi.fn();
  const onAskIArnold = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders training name as heading', () => {
    render(
      <SessionDetailHero
        session={makeSession()}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    expect(screen.getByRole('heading', { name: /Treino B · Costas e Bíceps/i })).toBeInTheDocument();
  });

  it('renders Duração KPI label', () => {
    render(
      <SessionDetailHero
        session={makeSession()}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    expect(screen.getByText('Duração')).toBeInTheDocument();
  });

  it('renders Volume total KPI label', () => {
    render(
      <SessionDetailHero
        session={makeSession()}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    expect(screen.getByText('Volume total')).toBeInTheDocument();
  });

  it('renders Séries KPI label', () => {
    render(
      <SessionDetailHero
        session={makeSession()}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    expect(screen.getByText('Séries')).toBeInTheDocument();
  });

  it('renders RPE médio KPI label', () => {
    render(
      <SessionDetailHero
        session={makeSession()}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    expect(screen.getByText('RPE médio')).toBeInTheDocument();
  });

  it('renders duration value from durationSeconds', () => {
    render(
      <SessionDetailHero
        session={makeSession({ durationSeconds: 3480 })}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    // 3480s = 58 min
    expect(screen.getByText('58')).toBeInTheDocument();
    expect(screen.getByText('min')).toBeInTheDocument();
  });

  it('renders — for duration when durationSeconds is null', () => {
    render(
      <SessionDetailHero
        session={makeSession({ durationSeconds: null })}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    // Should render em dashes for missing duration
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('does not render edit note button in hero (lives in notes panel instead)', () => {
    render(<SessionDetailHero session={makeSession()} />);
    expect(screen.queryByRole('button', { name: /editar anotação/i })).not.toBeInTheDocument();
  });

  it('does not render iArnold button in hero (uses FAB instead)', () => {
    render(<SessionDetailHero session={makeSession()} />);
    expect(screen.queryByRole('button', { name: /analisar.*iarnold/i })).not.toBeInTheDocument();
  });

  it('shows abandoned status for abandoned session', () => {
    render(
      <SessionDetailHero
        session={makeSession({ status: 'abandoned' })}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    expect(screen.getByText('Abandonado')).toBeInTheDocument();
  });

  it('shows completed status when all sets are done', () => {
    render(
      <SessionDetailHero
        session={makeSession({ status: 'completed' })}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('shows partial status when some sets are incomplete', () => {
    const partialSession = makeSession({
      status: 'completed',
      exerciseLogs: [
        {
          id: 'elog-1',
          status: 'partial',
          exercise: { sets: 2 },
          setLogs: [
            { id: 's1', setNumber: 1, load: 70, repetitions: 10, rpe: 7, completed: true },
            { id: 's2', setNumber: 2, load: 70, repetitions: 10, rpe: 7, completed: false },
          ],
        },
      ],
    });
    render(
      <SessionDetailHero
        session={partialSession}
        onEditNote={onEditNote}
        onAskIArnold={onAskIArnold}
      />,
    );
    expect(screen.getByText('Parcial')).toBeInTheDocument();
  });

  describe('Séries KPI (completed/planned)', () => {
    it('shows 3/3 when planned=3 and student completed all 3 setLogs', () => {
      const session = makeSession({
        exerciseLogs: [
          {
            id: 'elog-1',
            status: 'completed',
            exercise: { sets: 3 },
            setLogs: [
              { id: 's1', setNumber: 1, load: 50, repetitions: 10, completed: true },
              { id: 's2', setNumber: 2, load: 50, repetitions: 10, completed: true },
              { id: 's3', setNumber: 3, load: 50, repetitions: 10, completed: true },
            ],
          },
        ],
      });
      render(<SessionDetailHero session={session} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('/3')).toBeInTheDocument();
    });

    it('shows 3/4 when planned=4 but only 3 setLogs exist (one set never started)', () => {
      const session = makeSession({
        exerciseLogs: [
          {
            id: 'elog-1',
            status: 'partial',
            exercise: { sets: 4 },
            setLogs: [
              { id: 's1', setNumber: 1, load: 50, repetitions: 10, completed: true },
              { id: 's2', setNumber: 2, load: 50, repetitions: 10, completed: true },
              { id: 's3', setNumber: 3, load: 50, repetitions: 10, completed: true },
            ],
          },
        ],
      });
      render(<SessionDetailHero session={session} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('/4')).toBeInTheDocument();
    });

    it('shows 5/3 when student logs extra sets beyond what was planned', () => {
      const session = makeSession({
        exerciseLogs: [
          {
            id: 'elog-1',
            status: 'completed',
            exercise: { sets: 3 },
            setLogs: [
              { id: 's1', setNumber: 1, load: 50, repetitions: 10, completed: true },
              { id: 's2', setNumber: 2, load: 50, repetitions: 10, completed: true },
              { id: 's3', setNumber: 3, load: 50, repetitions: 10, completed: true },
              { id: 's4', setNumber: 4, load: 50, repetitions: 10, completed: true },
              { id: 's5', setNumber: 5, load: 50, repetitions: 10, completed: true },
            ],
          },
        ],
      });
      render(<SessionDetailHero session={session} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('/3')).toBeInTheDocument();
    });

    it('shows 0/4 for a skipped exerciseLog with no setLogs', () => {
      const session = makeSession({
        exerciseLogs: [
          {
            id: 'elog-1',
            status: 'skipped',
            exercise: { sets: 4 },
            setLogs: [],
          },
        ],
      });
      render(<SessionDetailHero session={session} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('/4')).toBeInTheDocument();
    });

    it('excludes exerciseLogs without prescribed sets (exercise.sets == null) from totals', () => {
      const session = makeSession({
        exerciseLogs: [
          {
            id: 'elog-1',
            status: 'completed',
            exercise: { sets: null },
            setLogs: [
              { id: 's1', setNumber: 1, load: 100, repetitions: 10, completed: true },
            ],
          },
        ],
      });
      render(<SessionDetailHero session={session} />);
      // Sets unit not rendered when totalSets is 0
      expect(screen.queryByText(/^\/\d+$/)).not.toBeInTheDocument();
      // Volume should also be excluded — Volume total shows em dash
      expect(screen.queryByText('1.000')).not.toBeInTheDocument();
    });

    it('sums planned sets and completed setLogs across mixed exerciseLogs (excluding those without prescribed sets)', () => {
      const session = makeSession({
        exerciseLogs: [
          // Included: planned=3, 3 completed → +3 total, +3 completed, vol = 3 * 50*10 = 1500
          {
            id: 'elog-1',
            status: 'completed',
            exercise: { sets: 3 },
            setLogs: [
              { id: 's1', setNumber: 1, load: 50, repetitions: 10, completed: true },
              { id: 's2', setNumber: 2, load: 50, repetitions: 10, completed: true },
              { id: 's3', setNumber: 3, load: 50, repetitions: 10, completed: true },
            ],
          },
          // Included: planned=4, 2 completed → +4 total, +2 completed, vol = 2 * 20*5 = 200
          {
            id: 'elog-2',
            status: 'partial',
            exercise: { sets: 4 },
            setLogs: [
              { id: 's4', setNumber: 1, load: 20, repetitions: 5, completed: true },
              { id: 's5', setNumber: 2, load: 20, repetitions: 5, completed: true },
              { id: 's6', setNumber: 3, load: 20, repetitions: 5, completed: false },
            ],
          },
          // Excluded: exercise.sets == null — volume from this set must NOT count
          {
            id: 'elog-3',
            status: 'completed',
            exercise: { sets: null },
            setLogs: [
              { id: 's7', setNumber: 1, load: 999, repetitions: 99, completed: true },
            ],
          },
        ],
      });
      render(<SessionDetailHero session={session} />);
      // Total sets = 3 + 4 = 7; completed = 3 + 2 = 5
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('/7')).toBeInTheDocument();
      // Volume = 1500 + 200 = 1700 (excluded log's 999*99 = 98901 must NOT appear)
      expect(screen.getByText('1.700')).toBeInTheDocument();
      expect(screen.queryByText('98.901')).not.toBeInTheDocument();
    });
  });
});
