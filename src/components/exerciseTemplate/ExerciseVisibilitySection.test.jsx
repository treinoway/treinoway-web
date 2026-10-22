import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseVisibilitySection from './ExerciseVisibilitySection';

describe('ExerciseVisibilitySection', () => {
  it('reflects the current visibility and requests a toggle', async () => {
    const onToggle = vi.fn();
    render(<ExerciseVisibilitySection className="section-card" isPublic={false} onToggle={onToggle} />);
    const toggle = screen.getByRole('switch', { name: /tornar este modelo público/i });
    expect(toggle).not.toBeChecked();
    await userEvent.setup().click(toggle);
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
