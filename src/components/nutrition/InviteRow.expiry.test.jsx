import { render, screen } from '../../test/test-utils';
import InviteRow from './InviteRow';
import { buildInvite } from '../../test/nutritionFixtures';

// Test helper: renders the row inside a table.
const renderRow = (invite) => render(
  <table><tbody><InviteRow invite={invite} onResend={vi.fn()} onRevoke={vi.fn()} /></tbody></table>,
);

describe('InviteRow expiry', () => {
  it('does not announce an expiry for a declined invite', () => {
    renderRow(buildInvite({ status: 'declined', sendCount: 2 }));
    expect(screen.getByText('2 envios')).toBeInTheDocument();
    expect(screen.queryByText(/expira em/)).not.toBeInTheDocument();
  });

  it('formats the expiry on the Sao Paulo calendar day, not UTC', () => {
    renderRow(buildInvite({ expiresAt: '2026-11-21T01:30:00.000Z' }));
    expect(screen.getByText('1 envio · expira em 20/11/2026')).toBeInTheDocument();
  });
});
