import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import InvitePatientModal from './InvitePatientModal';

describe('InvitePatientModal', () => {
  it('submits the trimmed e-mail', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<InvitePatientModal submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('E-mail do paciente'), '  nina@example.com ');
    await user.click(screen.getByRole('button', { name: 'Convidar' }));
    expect(onSubmit).toHaveBeenCalledWith('nina@example.com');
  });

  it('disables submit while the e-mail is blank', async () => {
    const user = userEvent.setup();
    render(<InvitePatientModal submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Convidar' })).toBeDisabled();
    await user.type(screen.getByLabelText('E-mail do paciente'), '   ');
    expect(screen.getByRole('button', { name: 'Convidar' })).toBeDisabled();
  });

  it('locks the form while submitting and cancels', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<InvitePatientModal submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<InvitePatientModal submitting onClose={onClose} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('E-mail do paciente')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Convidando…' })).toBeDisabled();
  });
});
