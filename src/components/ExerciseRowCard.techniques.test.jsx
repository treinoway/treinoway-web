import { render, screen } from '../test/test-utils';
import ExerciseRowCard from './ExerciseRowCard';

describe('ExerciseRowCard technique chips', () => {
  it('shows technique chips next to the summary', () => {
    render(
      <ExerciseRowCard
        name="Supino"
        summary="4x8"
        techniques={[{ id: 'a', name: 'Drop set', order: 0 }]}
        onClick={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Editar exercício Supino' })).toHaveTextContent('Drop set');
  });

  it('shows no chips when techniques are missing', () => {
    render(<ExerciseRowCard name="Supino" summary="4x8" onClick={() => {}} />);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });
});
