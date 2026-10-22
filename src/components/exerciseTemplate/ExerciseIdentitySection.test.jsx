import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseIdentitySection from './ExerciseIdentitySection';

const renderSection = (props = {}) => {
  const handlers = { onNameChange: vi.fn(), onTypeChange: vi.fn() };
  render(<ExerciseIdentitySection className="section-card" name="" type="strength" {...handlers} {...props} />);
  return handlers;
};

describe('ExerciseIdentitySection', () => {
  it('marks the current type as checked and reports a new choice', async () => {
    const { onTypeChange } = renderSection();
    expect(screen.getByRole('radio', { name: /força/i })).toHaveAttribute('aria-checked', 'true');
    await userEvent.setup().click(screen.getByRole('radio', { name: /cardio/i }));
    expect(onTypeChange).toHaveBeenCalledWith('cardio');
  });

  it('reports name changes and shows the name error', async () => {
    const { onNameChange } = renderSection({ nameError: 'Informe o nome do exercício.' });
    await userEvent.setup().type(screen.getByLabelText(/nome/i), 'S');
    expect(onNameChange).toHaveBeenCalledWith('S');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome do exercício.');
  });
});
