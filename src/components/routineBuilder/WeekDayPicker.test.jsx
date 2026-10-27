import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import WeekDayPicker from './WeekDayPicker';

// Returns the day radios in DOM order.
const getRadios = () => screen.getAllByRole('radio');

describe('WeekDayPicker', () => {
  it('renders 8 radios: Dom to Sáb plus "Sem dia"', () => {
    render(<WeekDayPicker value="" onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: /Dia do treino/i })).toBeInTheDocument();
    expect(getRadios().map((radio) => radio.textContent)).toEqual([
      'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Sem dia',
    ]);
  });

  it('checks "Sem dia" when the value is empty', () => {
    render(<WeekDayPicker value="" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Sem dia' })).toBeChecked();
    expect(getRadios().filter((radio) => radio.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  });

  it('aria-checked follows the value', () => {
    const { rerender } = render(<WeekDayPicker value="monday" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /^Seg/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Sem dia' })).not.toBeChecked();
    rerender(<WeekDayPicker value="saturday" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /^Sáb/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Seg/ })).not.toBeChecked();
  });

  it('clicking a day calls onChange with its enum value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeekDayPicker value="" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: /^Qua/ }));
    expect(onChange).toHaveBeenCalledWith('wednesday');
    await user.click(screen.getByRole('radio', { name: /^Dom/ }));
    expect(onChange).toHaveBeenLastCalledWith('sunday');
  });

  it('clicking "Sem dia" calls onChange with the empty value (the sheet maps it to null)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeekDayPicker value="monday" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Sem dia' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('uses a roving tabindex: 0 on the checked radio only', () => {
    render(<WeekDayPicker value="thursday" onChange={vi.fn()} />);
    getRadios().forEach((radio) => {
      expect(radio).toHaveAttribute('tabindex', radio.textContent === 'Qui' ? '0' : '-1');
    });
  });

  it('ArrowRight/ArrowDown select the next radio and move focus to it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeekDayPicker value="monday" onChange={onChange} />);
    screen.getByRole('radio', { name: /^Seg/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('tuesday');
    expect(screen.getByRole('radio', { name: /^Ter/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('wednesday');
  });

  it('ArrowLeft/ArrowUp go back, wrapping from Dom to "Sem dia"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeekDayPicker value="sunday" onChange={onChange} />);
    screen.getByRole('radio', { name: /^Dom/ }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(screen.getByRole('radio', { name: 'Sem dia' })).toHaveFocus();
  });

  it('ArrowRight from "Sem dia" wraps to Dom', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeekDayPicker value="" onChange={onChange} />);
    screen.getByRole('radio', { name: 'Sem dia' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('sunday');
    expect(screen.getByRole('radio', { name: /^Dom/ })).toHaveFocus();
  });

  it('ignores other keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WeekDayPicker value="monday" onChange={onChange} />);
    screen.getByRole('radio', { name: /^Seg/ }).focus();
    await user.keyboard('a');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders visible counts and announces them with singular/plural text', () => {
    render(<WeekDayPicker value="" counts={{ monday: 1, friday: 3 }} onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /^Seg.*1 treino$/ })).toHaveTextContent('1');
    expect(screen.getByRole('radio', { name: /^Sex.*3 treinos$/ })).toHaveTextContent('3');
    expect(screen.getByRole('radio', { name: /^Ter/ })).not.toHaveTextContent('treino');
  });

  it('shows no count for days with zero trainings', () => {
    render(<WeekDayPicker value="" counts={{ monday: 0 }} onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /^Seg/ })).toHaveTextContent(/^Seg$/);
  });
});
