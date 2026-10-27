import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import PickedExercise from './PickedExercise';

describe('PickedExercise', () => {
  it('shows the exercise name and its type label', () => {
    render(<PickedExercise template={{ name: 'Supino reto', type: 'strength' }} onChange={vi.fn()} />);
    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    expect(screen.getByText('Força')).toBeInTheDocument();
  });

  it('omits the type when the template has none', () => {
    render(<PickedExercise template={{ name: 'Livre' }} onChange={vi.fn()} />);
    expect(screen.getByText('Livre')).toBeInTheDocument();
    expect(screen.queryByText('Força')).not.toBeInTheDocument();
  });

  it('calls onChange when "Trocar" is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PickedExercise template={{ name: 'Supino reto', type: 'strength' }} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Trocar' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('moves focus to "Trocar" on mount', () => {
    render(<PickedExercise template={{ name: 'Supino reto', type: 'strength' }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Trocar' })).toHaveFocus();
  });
});
