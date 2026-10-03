import { useState } from 'react';
import PropTypes from 'prop-types';
import { Mail, CircleAlert } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { t, translateError, extractErrorInfo } from '../../i18n';
import RowMenu from '../../components/RowMenu';
import useStudentInvites from '../../hooks/useStudentInvites';
import useIntervalTick from '../../hooks/useIntervalTick';
import {
  ResendAvailability,
  StudentInviteMessageCode,
  STUDENT_INVITE_BADGE_CLASS,
  STUDENT_INVITE_COUNTDOWN_TICK_MS,
  STUDENT_INVITE_FILTER_ALL,
  STUDENT_INVITE_STATUS_FILTERS,
} from '../../constants/studentInvite';
import {
  canRevokeInvite,
  formatInviteDate,
  formatSendCount,
  getResendAvailability,
  hasResendCountdown,
  retryAfterSecondsToMinutes,
  showsInviteExpiry,
} from '../../utils/studentInvite';

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), t(key) || '');

const noop = () => {};

// Server state changed under us (cooldown, limit, no longer pending): refresh the row.
const STALE_INVITE_STATUSES = [409, 429];

const getResendErrorMessage = (error) => {
  const { messageCode, details } = extractErrorInfo(error);
  if (messageCode === StudentInviteMessageCode.RESEND_COOLDOWN && details?.retryAfterSeconds) {
    return fill('studentInvites.resendCooldown', { minutes: retryAfterSecondsToMinutes(details.retryAfterSeconds) });
  }
  return error.userMessage || translateError(error);
};

// Returns the row-menu entries for resend (empty when resend is not possible at all).
const buildResendItems = (invite, onResend) => {
  const { state, minutes } = getResendAvailability(invite);
  if (state === ResendAvailability.AVAILABLE) {
    return [{ label: t('studentInvites.resend'), onClick: () => onResend(invite) }];
  }
  if (state === ResendAvailability.COOLDOWN) {
    return [{ label: fill('studentInvites.resendIn', { minutes }), onClick: noop, disabled: true }];
  }
  if (state === ResendAvailability.LIMIT_REACHED) {
    return [{ label: t('studentInvites.resendLimitReached'), onClick: noop, disabled: true }];
  }
  return [];
};

/* ─── InviteStatusFilter ────────────────────────────────────────────────── */

const InviteStatusFilter = ({ value, onChange }) => (
  <div className="students-toolbar">
    <div
      className="students-filter-group students-filter-group--scrollable"
      role="tablist"
      aria-label={t('studentInvites.filterAria')}
    >
      {STUDENT_INVITE_STATUS_FILTERS.map((filterId) => (
        <button
          key={filterId}
          type="button"
          className={`students-filter-btn${value === filterId ? ' active' : ''}`}
          role="tab"
          aria-selected={value === filterId}
          onClick={() => onChange(filterId)}
        >
          {t(`studentInvites.filter_${filterId}`)}
        </button>
      ))}
    </div>
  </div>
);

InviteStatusFilter.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/* ─── InviteRow ─────────────────────────────────────────────────────────── */

const InviteRow = ({ invite, onResend, onRevoke }) => {
  const badgeClass = STUDENT_INVITE_BADGE_CLASS[invite.status] || 'badge-gray';
  const statusLabel = invite.statusLabel || t(`studentInvites.status_${invite.status}`) || invite.status;
  const showsExpiry = showsInviteExpiry(invite);
  const expiry = showsExpiry ? formatInviteDate(invite.expiresAt) : '-';
  const sends = formatSendCount(invite.sendCount);
  const mobileMeta = showsExpiry ? fill('studentInvites.mobileMeta', { date: expiry, sends }) : sends;
  const menuItems = buildResendItems(invite, onResend);
  const revokeHandler = canRevokeInvite(invite) ? () => onRevoke(invite) : undefined;
  const hasActions = menuItems.length > 0 || Boolean(revokeHandler);

  return (
    <tr>
      <td>
        <span className="font-medium">{invite.email}</span>
        <span className="table-col-mobile-only text-sm text-steel">{mobileMeta}</span>
      </td>
      <td>
        <span className={`badge ${badgeClass}`}>{statusLabel}</span>
      </td>
      <td className="table-col-desktop-only">{formatInviteDate(invite.lastSentAt)}</td>
      <td className="table-col-desktop-only">{expiry}</td>
      <td className="table-col-desktop-only student-invites-sends">
        {invite.sendCount ?? 0}
      </td>
      <td>
        {hasActions && (
          <RowMenu
            ariaLabel={fill('studentInvites.rowActions', { email: invite.email })}
            extraItems={menuItems}
            onDelete={revokeHandler}
            deleteLabel={t('studentInvites.revoke')}
          />
        )}
      </td>
    </tr>
  );
};

InviteRow.propTypes = {
  invite: PropTypes.shape({
    id: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    statusLabel: PropTypes.string,
    expiresAt: PropTypes.string,
    lastSentAt: PropTypes.string,
    sendCount: PropTypes.number,
    canResend: PropTypes.bool,
    resendAvailableAt: PropTypes.string,
  }).isRequired,
  onResend: PropTypes.func.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

/* ─── InvitesTable ──────────────────────────────────────────────────────── */

const InvitesTable = ({ invites, onResend, onRevoke }) => (
  <div className="table-container">
    <table className="data-table">
      <thead>
        <tr>
          <th>{t('studentInvites.colEmail')}</th>
          <th>{t('studentInvites.colStatus')}</th>
          <th className="table-col-desktop-only">{t('studentInvites.colLastSent')}</th>
          <th className="table-col-desktop-only">{t('studentInvites.colExpires')}</th>
          <th className="table-col-desktop-only">{t('studentInvites.colSends')}</th>
          <th aria-label={t('studentInvites.colActions')} />
        </tr>
      </thead>
      <tbody>
        {invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} onResend={onResend} onRevoke={onRevoke} />
        ))}
      </tbody>
    </table>
  </div>
);

InvitesTable.propTypes = {
  invites: PropTypes.array.isRequired,
  onResend: PropTypes.func.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

/* ─── InvitesPagination ─────────────────────────────────────────────────── */

const InvitesPagination = ({ page, pageCount, onPageChange }) => (
  <div className="video-pagination">
    <button
      type="button"
      className="btn-secondary"
      onClick={() => onPageChange(page - 1)}
      disabled={page <= 1}
    >
      {t('studentInvites.prev')}
    </button>
    <span className="video-pagination__status">
      {fill('studentInvites.pageStatus', { page, total: pageCount })}
    </span>
    <button
      type="button"
      className="btn-secondary"
      onClick={() => onPageChange(page + 1)}
      disabled={page >= pageCount}
    >
      {t('studentInvites.next')}
    </button>
  </div>
);

InvitesPagination.propTypes = {
  page: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

/* ─── Feedback states ───────────────────────────────────────────────────── */

const InvitesEmptyState = ({ filtered }) => (
  <div className="students-no-results">
    <div className="students-no-results-icon">
      <Mail size={28} strokeWidth={2} aria-hidden="true" />
    </div>
    {filtered ? (
      <p className="students-empty-state-eyebrow">{t('studentInvites.emptyFiltered')}</p>
    ) : (
      <>
        <p className="students-empty-state-eyebrow">{t('studentInvites.emptyTitle')}</p>
        <p className="students-empty-state-desc">{t('studentInvites.emptyDescription')}</p>
      </>
    )}
  </div>
);

InvitesEmptyState.propTypes = {
  filtered: PropTypes.bool.isRequired,
};

const InvitesErrorState = ({ message, onRetry }) => (
  <div className="students-no-results" role="alert">
    <div className="students-no-results-icon">
      <CircleAlert size={28} strokeWidth={2} aria-hidden="true" />
    </div>
    <p className="students-empty-state-eyebrow">{t('studentInvites.errorTitle')}</p>
    <p className="students-empty-state-desc">{message}</p>
    <button type="button" className="btn-secondary" onClick={onRetry}>
      {t('studentInvites.retry')}
    </button>
  </div>
);

InvitesErrorState.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};

const RevokeConfirmDialog = ({ message, onConfirm, onDismiss }) => (
  <div className="overlay" onClick={onDismiss}>
    <div
      className="confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-label={message}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="confirm-dialog-message">{message}</p>
      <div className="btn-group btn-group--equal">
        <button type="button" onClick={onConfirm} className="btn-danger">
          {t('studentInvites.revokeConfirmAction')}
        </button>
        <button type="button" onClick={onDismiss} className="btn-secondary">
          {t('studentInvites.revokeDismiss')}
        </button>
      </div>
    </div>
  </div>
);

RevokeConfirmDialog.propTypes = {
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};

/* ─── StudentInvitesPanel ───────────────────────────────────────────────── */

const InvitesContent = ({ state, onResend, onRevoke }) => {
  const { invites, loading, loadError, statusFilter, page, pageCount, setPage, reload } = state;

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">{t('studentInvites.loading')}</span>
      </div>
    );
  }
  if (loadError) {
    return (
      <InvitesErrorState message={loadError.userMessage || translateError(loadError)} onRetry={reload} />
    );
  }
  if (invites.length === 0) {
    return <InvitesEmptyState filtered={statusFilter !== STUDENT_INVITE_FILTER_ALL} />;
  }
  return (
    <>
      <InvitesTable invites={invites} onResend={onResend} onRevoke={onRevoke} />
      {pageCount > 1 && <InvitesPagination page={page} pageCount={pageCount} onPageChange={setPage} />}
    </>
  );
};

InvitesContent.propTypes = {
  state: PropTypes.object.isRequired,
  onResend: PropTypes.func.isRequired,
  onRevoke: PropTypes.func.isRequired,
};

const StudentInvitesPanel = ({ refreshKey = 0 }) => {
  const { showToast } = useToast();
  const invitesState = useStudentInvites({ refreshKey });
  const [confirmDialog, setConfirmDialog] = useState(null);
  const hasCountdown = invitesState.invites.some(hasResendCountdown);
  useIntervalTick(hasCountdown ? STUDENT_INVITE_COUNTDOWN_TICK_MS : null);

  const handleResend = async (invite) => {
    try {
      const updated = await invitesState.resendInvite(invite);
      showToast(fill('studentInvites.resendSuccess', { email: updated?.email ?? invite.email }), 'success');
    } catch (error) {
      showToast(getResendErrorMessage(error), 'error');
      if (STALE_INVITE_STATUSES.includes(extractErrorInfo(error).status)) invitesState.reload();
    }
  };

  const handleRevoke = (invite) => {
    setConfirmDialog({
      message: fill('studentInvites.revokeConfirm', { email: invite.email }),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await invitesState.revokeInvite(invite);
          showToast(t('studentInvites.revokeSuccess'), 'success');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  return (
    <div>
      <InviteStatusFilter value={invitesState.statusFilter} onChange={invitesState.setStatusFilter} />
      <InvitesContent state={invitesState} onResend={handleResend} onRevoke={handleRevoke} />
      {confirmDialog && (
        <RevokeConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onDismiss={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

StudentInvitesPanel.propTypes = {
  refreshKey: PropTypes.number,
};

export default StudentInvitesPanel;
