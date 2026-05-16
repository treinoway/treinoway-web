import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SessionExerciseCard from './SessionExerciseCard';

const makeSetLog = (overrides = {}) => ({
  id: 'set-1',
  setNumber: 1,
  load: 60,
  repetitions: 10,
  rpe: 7,
  completed: true,
  notes: null,
  ...overrides,
});

const makeExerciseLog = (overrides = {}) => ({
  id: 'elog-1',
  status: 'completed',
  notes: null,
  exercise: {
    name: 'Remada Curvada',
    sets: 4,
    repetitions: { min: 10, max: 10 },
    restInterval: 90,
  },
  setLogs: [makeSetLog()],
  ...overrides,
});

describe('SessionExerciseCard', () => {
  it('renders exercise name and index', () => {
    render(<SessionExerciseCard index={1} exerciseLog={makeExerciseLog()} />);
    expect(screen.getByText('Remada Curvada')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders meta with sets, reps, and rest', () => {
    render(<SessionExerciseCard index={1} exerciseLog={makeExerciseLog()} />);
    expect(screen.getByText(/4 séries/)).toBeInTheDocument();
    expect(screen.getByText(/10 reps/)).toBeInTheDocument();
    expect(screen.getByText(/desc\. 90s/)).toBeInTheDocument();
  });

  it('starts collapsed and expands on click', async () => {
    const user = userEvent.setup();
    render(<SessionExerciseCard index={1} exerciseLog={makeExerciseLog()} />);

    // The sets table should not be visible initially (collapsed)
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expandir exercício/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('starts open when defaultOpen is true', () => {
    render(<SessionExerciseCard index={1} exerciseLog={makeExerciseLog()} defaultOpen />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('collapses on second click', async () => {
    const user = userEvent.setup();
    render(<SessionExerciseCard index={1} exerciseLog={makeExerciseLog()} defaultOpen />);

    await user.click(screen.getByRole('button', { name: /recolher exercício/i }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders skip callout when exercise status is skipped', async () => {
    const user = userEvent.setup();
    const skippedLog = makeExerciseLog({
      status: 'skipped',
      notes: 'Ombro sobrecarregado',
      setLogs: [],
    });
    render(<SessionExerciseCard index={3} exerciseLog={skippedLog} />);

    expect(screen.getByText(/Pulado/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expandir exercício/i }));
    expect(screen.getByText('Ombro sobrecarregado')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders skip callout when all sets are incomplete', async () => {
    const user = userEvent.setup();
    const allSkipped = makeExerciseLog({
      status: 'pending',
      setLogs: [
        makeSetLog({ id: 'set-1', completed: false }),
        makeSetLog({ id: 'set-2', completed: false }),
      ],
    });
    render(<SessionExerciseCard index={2} exerciseLog={allSkipped} />);

    await user.click(screen.getByRole('button', { name: /expandir exercício/i }));
    // Shows skip note, not a table
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/Motivo · anotação do aluno/i)).toBeInTheDocument();
  });

  it('renders volume stat for non-skipped exercises', () => {
    const log = makeExerciseLog({
      setLogs: [makeSetLog({ load: 70, repetitions: 10, completed: true })],
    });
    render(<SessionExerciseCard index={1} exerciseLog={log} />);
    // 70 × 10 = 700 kg
    expect(screen.getByText(/700/)).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
  });
});
