import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import AuthEmailField from './AuthEmailField';

describe('AuthEmailField', () => {
  it('renders an editable email input and reports changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AuthEmailField value="" onChange={handleChange} />);

    const input = screen.getByLabelText('E-mail');
    expect(input).not.toHaveAttribute('readonly');
    await user.type(input, 'a');

    expect(handleChange).toHaveBeenCalledWith('a');
  });

  it('disables the editable input when disabled', () => {
    render(<AuthEmailField value="" onChange={vi.fn()} disabled />);

    expect(screen.getByLabelText('E-mail')).toBeDisabled();
  });

  it('renders the field on DS markup', () => {
    render(<AuthEmailField value="" onChange={vi.fn()} />);

    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveClass('input');
    expect(input.closest('.field')).not.toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the inline error as an alert and marks the input invalid', () => {
    render(<AuthEmailField value="ana" onChange={vi.fn()} error="E-mail em formato inválido." />);

    const input = screen.getByLabelText('E-mail');
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail em formato inválido.');
    expect(input).toHaveClass('input--error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('E-mail em formato inválido.');
  });
});
