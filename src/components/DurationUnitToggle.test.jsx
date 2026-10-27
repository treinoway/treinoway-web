import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import DurationUnitToggle from './DurationUnitToggle';

describe('DurationUnitToggle', () => {
  it('renders a "Unidade da duração" radiogroup with "seg" and "min"', () => {
    render(<DurationUnitToggle value="seg" onChange={vi.fn()} />);
    const group = screen.getByRole('radiogroup', { name: 'Unidade da duração' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'seg' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'min' })).toBeInTheDocument();
  });

  it('reflects the value in aria-checked', () => {
    render(<DurationUnitToggle value="min" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'min' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'seg' })).not.toBeChecked();
  });

  it('calls onChange with the clicked unit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DurationUnitToggle value="seg" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'min' }));
    expect(onChange).toHaveBeenCalledWith('min');
  });

  it('uses a roving tabindex: 0 on the checked radio, -1 on the other', () => {
    render(<DurationUnitToggle value="min" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'min' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'seg' })).toHaveAttribute('tabindex', '-1');
  });

  it.each([['ArrowRight'], ['ArrowDown']])('%s moves to the next radio, calls onChange and focuses it', async (key) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DurationUnitToggle value="seg" onChange={onChange} />);
    screen.getByRole('radio', { name: 'seg' }).focus();
    await user.keyboard(`{${key}}`);
    expect(onChange).toHaveBeenCalledWith('min');
    expect(screen.getByRole('radio', { name: 'min' })).toHaveFocus();
  });

  it.each([['ArrowLeft'], ['ArrowUp']])('%s from the first radio wraps to the last', async (key) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DurationUnitToggle value="seg" onChange={onChange} />);
    screen.getByRole('radio', { name: 'seg' }).focus();
    await user.keyboard(`{${key}}`);
    expect(onChange).toHaveBeenCalledWith('min');
  });

  it('ArrowRight from the last radio wraps to the first', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DurationUnitToggle value="min" onChange={onChange} />);
    screen.getByRole('radio', { name: 'min' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('seg');
    expect(screen.getByRole('radio', { name: 'seg' })).toHaveFocus();
  });

  it('ignores other keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DurationUnitToggle value="seg" onChange={onChange} />);
    screen.getByRole('radio', { name: 'seg' }).focus();
    await user.keyboard('a');
    expect(onChange).not.toHaveBeenCalled();
  });
});
