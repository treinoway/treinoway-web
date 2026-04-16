import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import ExerciseRowCard from './ExerciseRowCard';

describe('ExerciseRowCard', () => {
  it('renders the exercise name and summary', () => {
    render(
      <ExerciseRowCard
        name="Supino reto"
        summary="4×10 · 60s · 20kg"
        onClick={() => {}}
      />
    );

    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    expect(screen.getByText('4×10 · 60s · 20kg')).toBeInTheDocument();
  });

  it('calls onClick when the row is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ExerciseRowCard name="Supino reto" summary="4×10" onClick={onClick} />
    );

    await user.click(screen.getByRole('button', { name: /editar exercício supino reto/i }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders a warning caption when the source is deleted', () => {
    render(
      <ExerciseRowCard
        name="Supino reto"
        summary="4×10"
        sourceDeleted
        onClick={() => {}}
      />
    );

    expect(screen.getByText('Exercício original removido')).toBeInTheDocument();
  });

  it('uses a custom aria label when provided', () => {
    render(
      <ExerciseRowCard
        name="Supino reto"
        onClick={() => {}}
        ariaLabel="Abrir editor do exercício"
      />
    );

    expect(screen.getByRole('button', { name: /abrir editor do exercício/i })).toBeInTheDocument();
  });
});
