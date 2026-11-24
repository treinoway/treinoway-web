import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../test/test-utils';
import StudentInvitesPanel from './StudentInvitesPanel';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Invite as the service serializes it; a declined one cannot be resent.
const buildInvite = (overrides = {}) => ({
  id: 'inv-1',
  email: 'ana@example.com',
  status: 'pending',
  statusLabel: 'Pendente',
  studentId: null,
  expiresAt: '2026-10-29T12:00:00.000Z',
  acceptedAt: null,
  revokedAt: null,
  lastSentAt: '2026-09-29T12:00:00.000Z',
  sendCount: 1,
  createdAt: '2026-09-29T12:00:00.000Z',
  canResend: true,
  resendAvailableAt: null,
  ...overrides,
});

// Declined invite: status and label exactly as the service sends them.
const buildDeclinedInvite = (overrides = {}) =>
  buildInvite({
    id: 'inv-dec',
    email: 'recusou@example.com',
    status: 'declined',
    statusLabel: 'Recusado',
    canResend: false,
    ...overrides,
  });

// Paginated list body of GET /trainer/student-invites.
const listResponse = (items) => ({
  data: { items, total: items.length, page: 1, pageSize: 20 },
});

describe('StudentInvitesPanel — declined invites', () => {
  beforeEach(() => {
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    api.get.mockResolvedValue(listResponse([buildInvite(), buildDeclinedInvite()]));
  });

  it('offers a "Recusados" filter next to the existing status filters', async () => {
    render(<StudentInvitesPanel />);
    await screen.findByText('ana@example.com');

    const filters = screen.getByRole('tablist', { name: 'Filtrar convites por status' });
    expect(within(filters).getByRole('tab', { name: 'Recusados' })).toBeInTheDocument();
    expect(within(filters).getAllByRole('tab')).toHaveLength(6);
  });

  it('requests status=declined from page 1 when "Recusados" is selected', async () => {
    const user = userEvent.setup();
    render(<StudentInvitesPanel />);
    await screen.findByText('ana@example.com');

    api.get.mockResolvedValue(listResponse([buildDeclinedInvite()]));
    await user.click(screen.getByRole('tab', { name: 'Recusados' }));

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/trainer/student-invites', {
        params: { status: 'declined', page: 1, pageSize: 20 },
      }),
    );
    expect(screen.getByRole('tab', { name: 'Recusados' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('recusou@example.com')).toBeInTheDocument();
    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument();
  });

  it('shows the filtered empty state when no invite was declined', async () => {
    const user = userEvent.setup();
    render(<StudentInvitesPanel />);
    await screen.findByText('ana@example.com');

    api.get.mockResolvedValue(listResponse([]));
    await user.click(screen.getByRole('tab', { name: 'Recusados' }));

    expect(await screen.findByText('Nenhum convite com este status.')).toBeInTheDocument();
  });

  it('renders a declined invite with a warning DS badge reading "Recusado"', async () => {
    render(<StudentInvitesPanel />);

    const row = (await screen.findByText('recusou@example.com')).closest('tr');
    const badge = within(row).getByText('Recusado');
    expect(badge).toHaveClass('badge');
    expect(badge).toHaveClass('badge--warning');
  });

  it('labels a declined invite "Recusado" even when the service omits statusLabel', async () => {
    api.get.mockResolvedValue(listResponse([buildDeclinedInvite({ statusLabel: undefined })]));
    render(<StudentInvitesPanel />);

    const row = (await screen.findByText('recusou@example.com')).closest('tr');
    const badge = within(row).getByText('Recusado');
    expect(badge).toHaveClass('badge');
    expect(badge).toHaveClass('badge--warning');
  });

  it('offers neither resend nor revoke on a declined invite', async () => {
    render(<StudentInvitesPanel />);

    const row = (await screen.findByText('recusou@example.com')).closest('tr');
    expect(within(row).getByText('Recusado')).toHaveClass('badge--warning');
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ações do convite recusou@example.com' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ações do convite ana@example.com' })).toBeInTheDocument();
  });
});
