import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import RoutineTrainingItem from './RoutineTrainingItem';

const training = { id: 't1', name: 'Peito', order: 1, weekDay: 'monday', estimatedDurationSeconds: 3600 };
const exercises = [
  { id: 'e1', name: 'Supino', sets: 3, repetitions: { min: 10, max: 10 }, notes: 'Controlar descida' },
];

describe('RoutineTrainingItem', () => {
  it('links the toggle to its panel and reflects the open state', () => {
    render(<RoutineTrainingItem training={training} exercises={exercises} open onToggle={() => {}} />);
    const toggle = screen.getByRole('button', { name: 'Treino Peito' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.getAttribute('aria-controls')).toBe('routine-training-panel-t1');
    expect(screen.getByText('Controlar descida')).toBeVisible();
  });

  it('calls onToggle with the training id', async () => {
    const onToggle = vi.fn();
    render(<RoutineTrainingItem training={training} exercises={exercises} open={false} onToggle={onToggle} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Treino Peito' }));
    expect(onToggle).toHaveBeenCalledWith('t1');
  });

  it('labels a training without weekday as Livre and shows the empty message when open', () => {
    render(<RoutineTrainingItem training={{ ...training, weekDay: null }} exercises={[]} open onToggle={() => {}} />);
    expect(screen.getByText('Livre')).toBeInTheDocument();
    expect(screen.getByText('Nenhum exercício cadastrado.')).toBeInTheDocument();
  });
});
