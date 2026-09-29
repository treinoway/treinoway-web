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

  it('shows the optional hint', () => {
    render(<AuthEmailField value="" onChange={vi.fn()} hint="Use o e-mail em que você recebeu o convite." />);

    expect(screen.getByText('Use o e-mail em que você recebeu o convite.')).toBeInTheDocument();
  });

  it('disables the editable input when disabled', () => {
    render(<AuthEmailField value="" onChange={vi.fn()} disabled />);

    expect(screen.getByLabelText('E-mail')).toBeDisabled();
  });

  it('locks the field to the invited email', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AuthEmailField value="" onChange={handleChange} lockedEmail="convidado@teufit.com.br" hint="ignored" />);

    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveValue('convidado@teufit.com.br');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveAccessibleDescription('E-mail do convite');
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();

    await user.type(input, 'x');
    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('convidado@teufit.com.br');
  });
});
