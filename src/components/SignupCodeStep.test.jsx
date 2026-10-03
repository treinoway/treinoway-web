import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test/test-utils';
import SignupCodeStep from './SignupCodeStep';

const CODE_LABEL = /código de verificação/i;

const renderStep = (props = {}) => {
  const handlers = {
    onVerify: vi.fn().mockResolvedValue({ success: true }),
    onResend: vi.fn().mockResolvedValue({ success: true }),
    onChangeEmail: vi.fn(),
  };
  render(
    <SignupCodeStep
      email="aluno@example.com"
      changeEmailLabel="Trocar e-mail"
      {...handlers}
      {...props}
    />
  );
  return { ...handlers, ...props };
};

describe('SignupCodeStep', () => {
  it('renders the uniform notice with the email emphasised', () => {
    renderStep();

    expect(screen.getByText('aluno@example.com').tagName).toBe('STRONG');
    expect(screen.getByText(/ainda não tiver conta/i)).toHaveTextContent(
      'Se aluno@example.com ainda não tiver conta, enviamos um código de 6 dígitos. Se já tiver, enviamos as instruções para entrar.'
    );
  });

  it('configures the code field for one-time codes and focuses it', () => {
    renderStep();

    const input = screen.getByLabelText(CODE_LABEL);
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveFocus();
  });

  it('auto-submits once the 6th digit is typed', async () => {
    const user = userEvent.setup();
    const { onVerify } = renderStep();

    await user.type(screen.getByLabelText(CODE_LABEL), '12345');
    expect(onVerify).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(CODE_LABEL), '6');
    await waitFor(() => expect(onVerify).toHaveBeenCalledWith('123456'));
  });

  it('marks the field invalid when confirming an incomplete code', async () => {
    const user = userEvent.setup();
    const { onVerify } = renderStep();

    await user.type(screen.getByLabelText(CODE_LABEL), '12');
    await user.click(screen.getByRole('button', { name: /confirmar código/i }));

    const input = screen.getByLabelText(CODE_LABEL);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Informe o código de 6 dígitos.');
    expect(onVerify).not.toHaveBeenCalled();
  });

  it('disables resend during the initial cooldown', () => {
    renderStep();

    expect(screen.getByRole('button', { name: /reenviar código \(60s\)/i })).toBeDisabled();
  });

  it('calls onChangeEmail with the provided label', async () => {
    const user = userEvent.setup();
    const { onChangeEmail } = renderStep({ changeEmailLabel: 'Voltar' });

    await user.click(screen.getByRole('button', { name: /^voltar$/i }));

    expect(onChangeEmail).toHaveBeenCalledTimes(1);
  });
});
