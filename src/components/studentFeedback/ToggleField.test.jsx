import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import ToggleField from './ToggleField';

const DESCRIPTION = 'O aluno não consegue pular esta pergunta.';

// Renders the "Obrigatória" setting with the given state; extra props replace the defaults
const renderField = (props = {}) => {
  const onChange = vi.fn();
  render(<ToggleField id="feedback-question-required" label="Obrigatória" description={DESCRIPTION} checked={false} onChange={onChange} {...props} />);
  return onChange;
};

describe('ToggleField', () => {
  it('shows the name and the description of the setting with a switch named after it', () => {
    renderField();

    expect(screen.getByText('Obrigatória')).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: 'Obrigatória' });
    expect(toggle).toHaveClass('toggle');
    expect(toggle).toHaveAccessibleDescription(DESCRIPTION);
  });

  it('shows the switch off when not checked and on when checked', () => {
    const { rerender } = render(<ToggleField id="setting" label="Obrigatória" description={DESCRIPTION} checked={false} onChange={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'Obrigatória' })).not.toBeChecked();

    rerender(<ToggleField id="setting" label="Obrigatória" description={DESCRIPTION} checked onChange={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'Obrigatória' })).toBeChecked();
  });

  it('calls onChange with true when an off switch is clicked', async () => {
    const user = userEvent.setup();
    const onChange = renderField({ checked: false });

    await user.click(screen.getByRole('switch', { name: 'Obrigatória' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when an on switch is clicked', async () => {
    const user = userEvent.setup();
    const onChange = renderField({ checked: true });

    await user.click(screen.getByRole('switch', { name: 'Obrigatória' }));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('can be switched with the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = renderField();

    await user.tab();
    expect(screen.getByRole('switch', { name: 'Obrigatória' })).toHaveFocus();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows an extra control given as children next to the switch', () => {
    renderField({
      children: (
        <select aria-label="Modelo do marco">
          <option>Padrão TeuFit</option>
        </select>
      ),
    });

    expect(screen.getByRole('combobox', { name: 'Modelo do marco' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Obrigatória' })).toBeInTheDocument();
  });
});
