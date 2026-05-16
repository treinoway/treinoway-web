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
});
