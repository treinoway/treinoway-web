import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../test/test-utils';
import PasswordField from './PasswordField';

// Renders the field with a change spy and optional prop overrides.
const renderField = (props = {}) => {
  const onChange = vi.fn();
  render(<PasswordField id="password" label="Senha" value="" onChange={onChange} {...props} />);
  return { onChange };
};

describe('PasswordField', () => {
  it('renders a masked DS input inside a DS field and reports changes', async () => {
    const user = userEvent.setup();
    const { onChange } = renderField();

    const input = screen.getByLabelText('Senha');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveClass('input');
    expect(input.closest('.field')).not.toBeNull();

    await user.type(input, 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('shows and hides the password through the icon button', async () => {
    const user = userEvent.setup();
    renderField({ value: 'pass1234' });

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('uses the custom show/hide labels', () => {
    renderField({ showLabel: 'Mostrar confirmação de senha', hideLabel: 'Ocultar confirmação de senha' });

    expect(screen.getByRole('button', { name: 'Mostrar confirmação de senha' })).toHaveAttribute('type', 'button');
  });

  it('renders the hint and no alert when there is no error', () => {
    renderField({ hint: 'Mínimo 8 caracteres' });

    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Mínimo 8 caracteres');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).not.toHaveClass('input--error');
  });

  it('renders the error as an alert inside the field and marks the input invalid', () => {
    renderField({ error: 'A senha deve ter pelo menos 8 caracteres.' });

    const input = screen.getByLabelText('Senha');
    expect(within(input.closest('.field')).getByRole('alert')).toHaveTextContent('A senha deve ter pelo menos 8 caracteres.');
    expect(input).toHaveClass('input--error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('A senha deve ter pelo menos 8 caracteres.');
  });

  it('describes the input with the error and the hint together', () => {
    renderField({ error: 'A senha deve ter pelo menos 8 caracteres.', hint: 'Mínimo 8 caracteres' });

    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      'A senha deve ter pelo menos 8 caracteres. Mínimo 8 caracteres'
    );
  });

  it('has no description without hint or error', () => {
    renderField();

    expect(screen.getByLabelText('Senha')).not.toHaveAttribute('aria-describedby');
  });

  it('disables the input when disabled', () => {
    renderField({ disabled: true });

    expect(screen.getByLabelText('Senha')).toBeDisabled();
  });
});
