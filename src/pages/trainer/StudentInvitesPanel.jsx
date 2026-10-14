import { useState } from 'react';
import PropTypes from 'prop-types';
import { Mail, CircleAlert } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { t, translateError, extractErrorInfo } from '../../i18n';
import RowMenu from '../../components/RowMenu';
import Badge from '../../components/ds/Badge';
import Segmented from '../../components/ds/Segmented';
import EmptyBlock from '../../components/ds/EmptyBlock';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import useStudentInvites from '../../hooks/useStudentInvites';
import useIntervalTick from '../../hooks/useIntervalTick';
import {
  ResendAvailability,
  StudentInviteMessageCode,
  STUDENT_INVITE_BADGE_TONE,
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
  <div className="students-bar">
    <Segmented
      ariaLabel={t('studentInvites.filterAria')}
      items={STUDENT_INVITE_STATUS_FILTERS.map((filterId) => ({
        id: filterId,
        label: t(`studentInvites.filter_${filterId}`),
      }))}
      value={value}
      onChange={onChange}
    />
  </div>
);

InviteStatusFilter.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/* ─── InviteRow ─────────────────────────────────────────────────────────── */

const InviteRow = ({ invite, onResend, onRevoke }) => {
  const badgeTone = STUDENT_INVITE_BADGE_TONE[invite.status] || 'neutral';
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
        <span className="type-body-strong">{invite.email}</span>
        <span className="table-col-mobile-only type-caption invites-table__sub">{mobileMeta}</span>
      </td>
      <td>
        <Badge tone={badgeTone}>{statusLabel}</Badge>
      </td>
      <td className="table-col-desktop-only">{formatInviteDate(invite.lastSentAt)}</td>
      <td className="table-col-desktop-only">{expiry}</td>
      <td className="table-col-desktop-only invites-table__number">
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
  <div className="section-card invites-table-wrap">
    <table className="invites-table type-body">
      <thead>
        <tr>
          <th className="type-caption-strong">{t('studentInvites.colEmail')}</th>
          <th className="type-caption-strong">{t('studentInvites.colStatus')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('studentInvites.colLastSent')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('studentInvites.colExpires')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('studentInvites.colSends')}</th>
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
  <div className="pagination-bar">
    <button
      type="button"
      className="btn btn--secondary"
      onClick={() => onPageChange(page - 1)}
      disabled={page <= 1}
    >
      {t('studentInvites.prev')}
    </button>
    <span className="pagination-bar__status type-body">
      {fill('studentInvites.pageStatus', { page, total: pageCount })}
    </span>
    <button
      type="button"
      className="btn btn--secondary"
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

const InvitesEmptyState = ({ filtered }) =>
  filtered ? (
    <EmptyBlock icon={Mail} title={t('studentInvites.emptyFiltered')} />
  ) : (
    <EmptyBlock icon={Mail} title={t('studentInvites.emptyTitle')} description={t('studentInvites.emptyDescription')} />
  );

InvitesEmptyState.propTypes = {
  filtered: PropTypes.bool.isRequired,
};

const InvitesErrorState = ({ message, onRetry }) => (
  <EmptyBlock
    icon={CircleAlert}
    role="alert"
    title={t('studentInvites.errorTitle')}
    description={message}
    actionLabel={t('studentInvites.retry')}
    onAction={onRetry}
  />
);

InvitesErrorState.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};

/* ─── StudentInvitesPanel ───────────────────────────────────────────────── */

const InvitesContent = ({ state, onResend, onRevoke }) => {
  const { invites, loading, loadError, statusFilter, page, pageCount, setPage, reload } = state;

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text type-body">{t('studentInvites.loading')}</span>
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
        <ConfirmDialog
          message={confirmDialog.message}
          confirmLabel={t('studentInvites.revokeConfirmAction')}
          cancelLabel={t('studentInvites.revokeDismiss')}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

StudentInvitesPanel.propTypes = {
  refreshKey: PropTypes.number,
};

export default StudentInvitesPanel;
