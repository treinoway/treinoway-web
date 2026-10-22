import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Toggle from './Toggle';

describe('Toggle', () => {
  it('exposes a switch with its checked state', () => {
    render(<Toggle checked label="Tornar público" onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Tornar público' })).toBeChecked();
  });

  it('calls onChange with the next value', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} label="Tornar público" onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Tornar público' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not fire when disabled', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} label="Tornar público" onChange={onChange} disabled />);
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Tornar público' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
