import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import InviteRow from './InviteRow';
import { buildInvite } from '../../test/nutritionFixtures';

// Test helper: renders the row inside a table.
const renderRow = (props = {}) => render(
  <table><tbody><InviteRow invite={buildInvite()} onResend={vi.fn()} onRevoke={vi.fn()} {...props} /></tbody></table>,
);

describe('InviteRow', () => {
  it('keeps resend enabled for a declined invite even when canResend is false', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn();
    renderRow({ invite: buildInvite({ status: 'declined', canResend: false }), onResend });
    await user.click(screen.getByRole('button', { name: 'Ações do convite maria@example.com' }));
    const resend = screen.getByRole('button', { name: 'Reenviar convite' });
    expect(resend).toBeEnabled();
    await user.click(resend);
    expect(onResend).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv-1' }));
  });

  it('disables resend for a pending invite with canResend false', async () => {
    const user = userEvent.setup();
    renderRow({ invite: buildInvite({ canResend: false }) });
    await user.click(screen.getByRole('button', { name: 'Ações do convite maria@example.com' }));
    expect(screen.getByRole('button', { name: 'Reenviar convite' })).toBeDisabled();
  });

  it('marks a declined invite and leaves a pending one unmarked', () => {
    renderRow({ invite: buildInvite({ status: 'declined' }) });
    expect(screen.getByText('Recusado')).toBeInTheDocument();
  });

  it('shows no status badge on a pending invite', () => {
    renderRow();
    expect(screen.queryByText('Recusado')).not.toBeInTheDocument();
  });

  it('shows the e-mail, the send count and the expiry', () => {
    renderRow({ invite: buildInvite({ sendCount: 3 }) });
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    expect(screen.getByText('3 envios · expira em 20/11/2026')).toBeInTheDocument();
  });

  it('resends and revokes from the row menu', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn();
    const onRevoke = vi.fn();
    renderRow({ onResend, onRevoke });

    await user.click(screen.getByRole('button', { name: 'Ações do convite maria@example.com' }));
    await user.click(screen.getByRole('button', { name: 'Reenviar convite' }));
    expect(onResend).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv-1' }));

    await user.click(screen.getByRole('button', { name: 'Ações do convite maria@example.com' }));
    await user.click(screen.getByRole('button', { name: 'Revogar convite' }));
    expect(onRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv-1' }));
  });

  it('disables the resend when the API says it cannot be resent', async () => {
    const user = userEvent.setup();
    renderRow({ invite: buildInvite({ canResend: false }) });
    await user.click(screen.getByRole('button', { name: 'Ações do convite maria@example.com' }));
    expect(screen.getByRole('button', { name: 'Reenviar convite' })).toBeDisabled();
  });
});
