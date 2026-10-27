import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import FormLayoutToggle from './FormLayoutToggle';

describe('FormLayoutToggle', () => {
  it('renders a "Formulários" radio group with the current value checked', () => {
    render(<FormLayoutToggle value="side" onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: 'Formulários' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Painel lateral' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Janela' })).not.toBeChecked();
  });

  it('calls onChange with the picked layout', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormLayoutToggle value="modal" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Painel lateral' }));
    expect(onChange).toHaveBeenCalledWith('side');
  });

  it('uses a roving tabindex: 0 on the checked radio, -1 on the other', () => {
    render(<FormLayoutToggle value="modal" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Janela' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Painel lateral' })).toHaveAttribute('tabindex', '-1');
  });

  it.each([['ArrowRight', 'side'], ['ArrowDown', 'side'], ['ArrowLeft', 'side'], ['ArrowUp', 'side']])(
    '%s from "Janela" selects "%s" with wraparound',
    async (key, expected) => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<FormLayoutToggle value="modal" onChange={onChange} />);
      screen.getByRole('radio', { name: 'Janela' }).focus();
      await user.keyboard(`{${key}}`);
      expect(onChange).toHaveBeenCalledWith(expected);
    }
  );

  it('moves focus to the newly selected radio', async () => {
    const user = userEvent.setup();
    render(<FormLayoutToggle value="modal" onChange={vi.fn()} />);
    screen.getByRole('radio', { name: 'Janela' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Painel lateral' })).toHaveFocus();
  });

  it('wraps from the last radio back to the first', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormLayoutToggle value="side" onChange={onChange} />);
    screen.getByRole('radio', { name: 'Painel lateral' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('modal');
  });
});
