import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import RestQuickChips from './RestQuickChips';

describe('RestQuickChips', () => {
  it('renders the default presets as chips', () => {
    render(<RestQuickChips value={60} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: '30s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '45s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1min 30s' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3min' })).toBeInTheDocument();
  });

  it('marks the selected chip as pressed when its value matches', () => {
    render(<RestQuickChips value={90} onChange={() => {}} />);

    const activeChip = screen.getByRole('button', { name: '1min 30s' });
    expect(activeChip).toHaveAttribute('aria-pressed', 'true');

    const inactiveChip = screen.getByRole('button', { name: '30s' });
    expect(inactiveChip).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the chip value when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RestQuickChips value={60} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '2min' }));

    expect(onChange).toHaveBeenCalledWith(120);
  });

  it('disables chips when disabled is true', () => {
    render(<RestQuickChips value={60} onChange={() => {}} disabled />);

    screen.getAllByRole('button').forEach((chip) => {
      expect(chip).toBeDisabled();
    });
  });
});
