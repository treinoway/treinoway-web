import { render, screen } from '../test/test-utils';
import SessionExerciseCard from './SessionExerciseCard';

const exerciseLog = {
  id: 'elog-1',
  status: 'completed',
  notes: null,
  exercise: { name: 'Remada Curvada', sets: 4, repetitions: { min: 10, max: 10 }, restInterval: 90 },
  setLogs: [],
};

describe('SessionExerciseCard replacedExerciseName', () => {
  it('shows the Substituto tag and the replaced exercise name', () => {
    render(<SessionExerciseCard index={1} exerciseLog={exerciseLog} replacedExerciseName="Supino Reto" />);
    expect(screen.getByText('Substituto')).toBeInTheDocument();
    expect(screen.getByText('no lugar de Supino Reto')).toBeInTheDocument();
  });

  it('shows neither without the prop', () => {
    render(<SessionExerciseCard index={1} exerciseLog={exerciseLog} />);
    expect(screen.queryByText('Substituto')).not.toBeInTheDocument();
    expect(screen.queryByText(/no lugar de/)).not.toBeInTheDocument();
  });
});
