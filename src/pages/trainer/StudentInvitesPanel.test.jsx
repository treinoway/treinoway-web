import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within, act } from '../../test/test-utils';
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

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const hoursAgo = (hours) => new Date(Date.now() - hours * HOUR_MS).toISOString();
const msFromNow = (ms) => new Date(Date.now() + ms).toISOString();

const buildInvite = (overrides = {}) => ({
  id: 'inv-1',
  email: 'ana@example.com',
  status: 'pending',
  statusLabel: 'Pendente',
  studentId: null,
  expiresAt: '2026-10-29T12:00:00.000Z',
  acceptedAt: null,
  revokedAt: null,
  lastSentAt: hoursAgo(2),
  sendCount: 1,
  createdAt: hoursAgo(2),
  canResend: true,
  resendAvailableAt: null,
  ...overrides,
});

const listResponse = (items, extra = {}) => ({
  data: { items, total: items.length, page: 1, pageSize: 20, ...extra },
});

const buildApiError = ({ status, error, messageCode, details, userMessage }) => {
  const err = new Error(error);
  err.response = { status, data: { error, messageCode, message: 'fallback', details } };
  if (userMessage) err.userMessage = userMessage;
  return err;
};

const openRowMenu = async (user, email) => {
  await user.click(await screen.findByRole('button', { name: `Ações do convite ${email}` }));
};

describe('StudentInvitesPanel', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    api.get.mockResolvedValue(listResponse([buildInvite()]));
  });

  // ── States ────────────────────────────────────────────────────────────

  it('shows the loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    render(<StudentInvitesPanel />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('fetches the first page with no status filter by default', async () => {
    render(<StudentInvitesPanel />);
    await screen.findByText('ana@example.com');
    expect(api.get).toHaveBeenCalledWith('/trainer/student-invites', { params: { page: 1, pageSize: 20 } });
  });

  it('renders email, status label, dates and send count for each invite', async () => {
    api.get.mockResolvedValue(listResponse([
      buildInvite({ lastSentAt: '2026-09-29T12:00:00.000Z', sendCount: 2 }),
      buildInvite({
        id: 'inv-2', email: 'bia@example.com', status: 'accepted', statusLabel: 'Aceito', canResend: false,
      }),
    ]));
    render(<StudentInvitesPanel />);

    const row = (await screen.findByText('ana@example.com')).closest('tr');
    expect(within(row).getByText('Pendente')).toBeInTheDocument();
    expect(within(row).getByText('29/09/2026')).toBeInTheDocument();
    expect(within(row).getByText('29/10/2026')).toBeInTheDocument();
    // Only the send count: the max is a backend rule and is not duplicated in the UI
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('Expira em 29/10/2026 · 2 envios')).toBeInTheDocument();
    expect(within(row).queryByText(/\/5/)).not.toBeInTheDocument();

    const acceptedRow = screen.getByText('bia@example.com').closest('tr');
    expect(within(acceptedRow).getByText('Aceito')).toBeInTheDocument();
    // Accepted invites have no actions
    expect(within(acceptedRow).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no invites', async () => {
    api.get.mockResolvedValue(listResponse([]));
    render(<StudentInvitesPanel />);

    expect(await screen.findByText('Sem convites ainda')).toBeInTheDocument();
    expect(screen.getByText('Os convites que você enviar aparecem aqui.')).toBeInTheDocument();
  });

  it('shows the filtered empty state when a status filter has no results', async () => {
    const user = userEvent.setup();
    render(<StudentInvitesPanel />);
    await screen.findByText('ana@example.com');

    api.get.mockResolvedValue(listResponse([]));
    await user.click(screen.getByRole('tab', { name: 'Revogados' }));

    expect(await screen.findByText('Nenhum convite com este status.')).toBeInTheDocument();
  });

  it('shows an error state with retry when the list fails to load', async () => {
    const user = userEvent.setup();
    const err = new Error('boom');
    err.userMessage = 'Erro interno do servidor.';
    api.get.mockRejectedValueOnce(err);
    render(<StudentInvitesPanel />);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Não foi possível carregar os convites')).toBeInTheDocument();
    expect(within(alert).getByText('Erro interno do servidor.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('reloads when refreshKey changes', async () => {
    const { rerender } = render(<StudentInvitesPanel refreshKey={0} />);
    await screen.findByText('ana@example.com');
    expect(api.get).toHaveBeenCalledTimes(1);

    rerender(<StudentInvitesPanel refreshKey={1} />);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  // ── Filter & pagination ───────────────────────────────────────────────

  it('filters by status and resets to the first page', async () => {
    const user = userEvent.setup();
    render(<StudentInvitesPanel />);
    await screen.findByText('ana@example.com');

    await user.click(screen.getByRole('tab', { name: 'Expirados' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/trainer/student-invites', {
        params: { status: 'expired', page: 1, pageSize: 20 },
      });
    });
    expect(screen.getByRole('tab', { name: 'Expirados' })).toHaveAttribute('aria-selected', 'true');
  });

  it('paginates when total exceeds the page size', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(listResponse([buildInvite()], { total: 45 }));
    render(<StudentInvitesPanel />);

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/trainer/student-invites', {
        params: { page: 2, pageSize: 20 },
      });
    });
  });

  it('hides pagination when everything fits in one page', async () => {
    render(<StudentInvitesPanel />);
    await screen.findByText('ana@example.com');
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument();
  });

  // ── Resend ────────────────────────────────────────────────────────────

  it('resends a pending invite and updates the row from the server response', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      data: {
        invite: buildInvite({
          sendCount: 2,
          lastSentAt: new Date().toISOString(),
          canResend: false,
          resendAvailableAt: msFromNow(HOUR_MS),
        }),
      },
    });
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Reenviar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/student-invites/inv-1/resend');
    });
    expect(showToast).toHaveBeenCalledWith('Convite reenviado para ana@example.com.', 'success');
    expect(await screen.findByText(/2 envios/)).toBeInTheDocument();

    await openRowMenu(user, 'ana@example.com');
    expect(screen.getByRole('button', { name: /reenviar em (59|60) min/i })).toBeDisabled();
  });

  it('offers resend (but not cancel) for a time-expired invite the server still allows resending', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(listResponse([
      buildInvite({ status: 'expired', statusLabel: 'Expirado', lastSentAt: hoursAgo(24 * 31), canResend: true }),
    ]));
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Cancelar convite' })).not.toBeInTheDocument();
  });

  it('offers no actions for a stored-expired invite the server does not allow resending', async () => {
    api.get.mockResolvedValue(listResponse([
      buildInvite({
        status: 'expired', statusLabel: 'Expirado', lastSentAt: hoursAgo(24 * 31), canResend: false,
      }),
    ]));
    render(<StudentInvitesPanel />);

    const row = (await screen.findByText('ana@example.com')).closest('tr');
    expect(within(row).getByText('Expirado')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('trusts canResend over the local send count', async () => {
    // The UI never re-derives resendability from status or sendCount: canResend wins.
    const user = userEvent.setup();
    api.get.mockResolvedValue(listResponse([buildInvite({ sendCount: 5, canResend: true })]));
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled();
  });

  it('shows a friendly cooldown message using retryAfterSeconds on 429 and refreshes the list', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(buildApiError({
      status: 429,
      error: 'STUDENT_INVITE_RESEND_COOLDOWN',
      messageCode: 'studentInvite.resendCooldown',
      details: { retryAfterSeconds: 1500 },
    }));
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Reenviar' }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Você poderá reenviar este convite em 25 min.', 'error');
    });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('shows a retryable message when the invite e-mail fails to send (502) without reloading', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(buildApiError({
      status: 502,
      error: 'STUDENT_INVITE_EMAIL_SEND_FAILED',
      messageCode: 'studentInvite.emailSendFailed',
    }));
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Reenviar' }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Não foi possível enviar o e-mail do convite. Tente novamente.',
        'error'
      );
    });
    expect(api.get).toHaveBeenCalledTimes(1);

    // Nothing was consumed: resend is still offered
    await openRowMenu(user, 'ana@example.com');
    expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled();
  });

  it('falls back to the translated message for other resend errors', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(buildApiError({
      status: 409,
      error: 'STUDENT_INVITE_RESEND_LIMIT',
      messageCode: 'studentInvite.resendLimit',
      userMessage: 'Você atingiu o limite de reenvios deste convite.',
    }));
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Reenviar' }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Você atingiu o limite de reenvios deste convite.', 'error');
    });
  });

  it('disables resend with a countdown to resendAvailableAt while cooling down', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(listResponse([
      buildInvite({ canResend: false, resendAvailableAt: msFromNow(50 * MINUTE_MS) }),
    ]));
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    expect(screen.getByRole('button', { name: /reenviar em (49|50) min/i })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('enables resend once the countdown reaches resendAvailableAt', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      api.get.mockResolvedValue(listResponse([
        buildInvite({ canResend: false, resendAvailableAt: msFromNow(20 * 1000) }),
      ]));
      render(<StudentInvitesPanel />);

      await openRowMenu(user, 'ana@example.com');
      expect(screen.getByRole('button', { name: 'Reenviar em 1 min' })).toBeDisabled();

      await act(async () => { vi.advanceTimersByTime(31 * 1000); });
      expect(screen.getByRole('button', { name: 'Reenviar' })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the resend limit as disabled when a pending invite has no resendAvailableAt', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(listResponse([
      buildInvite({ sendCount: 5, canResend: false, resendAvailableAt: null }),
    ]));
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    expect(screen.getByRole('button', { name: 'Limite de reenvios atingido' })).toBeDisabled();
    // Cancel is still available for a pending invite
    expect(screen.getByRole('button', { name: 'Cancelar convite' })).toBeEnabled();
  });

  // ── Cancel (revoke) ───────────────────────────────────────────────────

  it('cancels a pending invite after confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({ data: { invite: buildInvite({ status: 'revoked', statusLabel: 'Revogado' }) } });
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Cancelar convite' }));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/cancelar o convite de ana@example.com\?/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar convite' }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/student-invites/inv-1');
    });
    expect(showToast).toHaveBeenCalledWith('Convite cancelado.', 'success');
    expect(await screen.findByText('Revogado')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('does not cancel when the confirmation is dismissed', async () => {
    const user = userEvent.setup();
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Cancelar convite' }));
    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('removes a cancelled invite from the list when filtering by pending', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({ data: { invite: buildInvite({ status: 'revoked', statusLabel: 'Revogado' }) } });
    render(<StudentInvitesPanel />);
    await screen.findByText('ana@example.com');

    await user.click(screen.getByRole('tab', { name: 'Pendentes' }));
    await openRowMenu(user, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Cancelar convite' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar convite' }));

    expect(await screen.findByText('Nenhum convite com este status.')).toBeInTheDocument();
  });

  it('shows an error toast when cancelling fails', async () => {
    const user = userEvent.setup();
    api.delete.mockRejectedValue(buildApiError({
      status: 409,
      error: 'STUDENT_INVITE_NOT_PENDING',
      messageCode: 'studentInvite.notPending',
      userMessage: 'Este convite não está mais pendente.',
    }));
    render(<StudentInvitesPanel />);

    await openRowMenu(user, 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Cancelar convite' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar convite' }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Este convite não está mais pendente.', 'error');
    });
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
});
