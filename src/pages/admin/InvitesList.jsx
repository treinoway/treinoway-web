import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Mail, Send, Copy, Search } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError, t, tf } from '../../i18n';
import { listTrainerInvites, createTrainerInvite, revokeTrainerInvite } from '../../api/admin';
import useAdminQuery from '../../hooks/useAdminQuery';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import useResettablePage from '../../hooks/useResettablePage';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import Select from '../../components/Select';
import RowMenu from '../../components/RowMenu';
import Badge from '../../components/ds/Badge';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import QueryFeedback from '../../components/admin/QueryFeedback';
import AdminPagination from '../../components/admin/AdminPagination';
import { formatDateForDisplay } from '../../utils/dateFormat';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const MAGIC_LINK_BASE = 'https://teufit.com.br/invite?code=';

const STATUS_FILTER_VALUES = ['pending', 'accepted', 'revoked', 'expired'];

const STATUS_BADGE_TONE = {
  pending: 'brand',
  accepted: 'success',
  revoked: 'error',
  expired: 'neutral',
};

// Builds the shareable invite link for a code.
const buildMagicLink = (code) => `${MAGIC_LINK_BASE}${code}`;

// Label + value + copy button for the freshly created invite.
const CopyField = ({ label, value, copyLabel, onCopy, isCode = false }) => (
  <div className="field">
    <span className="field-label type-caption-strong">{label}</span>
    <div className="admin-copy-row">
      <span className={`admin-copy-value type-body${isCode ? ' admin-copy-value--code' : ''}`}>{value}</span>
      <button type="button" className="btn btn--secondary" onClick={onCopy}>
        <Copy size={16} strokeWidth={2} aria-hidden="true" />
        {copyLabel}
      </button>
    </div>
  </div>
);

CopyField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  copyLabel: PropTypes.string.isRequired,
  onCopy: PropTypes.func.isRequired,
  isCode: PropTypes.bool,
};

// Code and magic link of the invite that was just created.
const CreatedInvite = ({ invite, onCopy }) => (
  <div className="admin-result">
    <p className="type-body-strong">{tf('adminInvites.createdTitle', { email: invite.email || '' })}</p>
    <CopyField
      label={t('adminInvites.codeLabel')}
      value={invite.code}
      copyLabel={t('adminInvites.copyCode')}
      onCopy={() => onCopy(invite.code)}
      isCode
    />
    <CopyField
      label={t('adminInvites.linkLabel')}
      value={buildMagicLink(invite.code)}
      copyLabel={t('adminInvites.copyLink')}
      onCopy={() => onCopy(buildMagicLink(invite.code))}
    />
  </div>
);

CreatedInvite.propTypes = {
  invite: PropTypes.object.isRequired,
  onCopy: PropTypes.func.isRequired,
};

// Form that sends a beta invite and reveals the generated code.
const InviteSendForm = ({ onSent, onCopy }) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdInvite, setCreatedInvite] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setFormError('');
    try {
      const { invite, code } = await createTrainerInvite(email.trim());
      setCreatedInvite({ ...invite, code });
      setEmail('');
      showToast(t('adminInvites.sendSuccess'), 'success');
      onSent();
    } catch (error) {
      const message = error.userMessage || translateError(error);
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="section-card">
      <form className="admin-form-row" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="invite-email">
            {t('adminInvites.emailLabel')}
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            placeholder={t('adminInvites.emailPlaceholder')}
            disabled={sending}
            required
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={sending}>
          <Send size={16} strokeWidth={2} aria-hidden="true" />
          {sending ? t('adminInvites.sending') : t('adminInvites.send')}
        </button>
      </form>
      {formError && <p className="field-error type-caption" role="alert">{formError}</p>}
      {createdInvite && <CreatedInvite invite={createdInvite} onCopy={onCopy} />}
    </div>
  );
};

InviteSendForm.propTypes = {
  onSent: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

// Status select + email search.
const InviteFilters = ({ status, onStatusChange, emailInput, onEmailChange }) => (
  <div className="admin-filter-bar">
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="invites-status">{t('adminInvites.statusLabel')}</label>
      <Select id="invites-status" value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="">{t('adminInvites.statusAll')}</option>
        {STATUS_FILTER_VALUES.map((value) => (
          <option key={value} value={value}>{t(`adminInvites.status_${value}`)}</option>
        ))}
      </Select>
    </div>
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="invites-email">{t('adminInvites.searchLabel')}</label>
      <div className="input--search-wrap">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          id="invites-email"
          type="text"
          value={emailInput}
          onChange={(event) => onEmailChange(event.target.value)}
          className="input input--search"
          placeholder={t('adminInvites.searchPlaceholder')}
        />
      </div>
    </div>
  </div>
);

InviteFilters.propTypes = {
  status: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func.isRequired,
  emailInput: PropTypes.string.isRequired,
  onEmailChange: PropTypes.func.isRequired,
};

// One invite row; only pending invites can be revoked or copied.
const InviteRow = ({ invite, onRevoke, onCopy }) => {
  const extraItems = invite.code
    ? [
        { label: t('adminInvites.copyCode'), onClick: () => onCopy(invite.code) },
        { label: t('adminInvites.copyLink'), onClick: () => onCopy(buildMagicLink(invite.code)) },
      ]
    : [];
  return (
    <tr>
      <td>
        <span className="type-body-strong">{invite.email}</span>
        <span className="table-col-mobile-only admin-table__sub type-caption">
          {formatDateForDisplay(invite.createdAt)}
        </span>
      </td>
      <td><Badge tone={STATUS_BADGE_TONE[invite.status] || 'neutral'}>{invite.statusLabel}</Badge></td>
      <td className="table-col-desktop-only">{formatDateForDisplay(invite.createdAt)}</td>
      <td className="table-col-desktop-only">{formatDateForDisplay(invite.expiresAt)}</td>
      <td className="table-col-desktop-only">{formatDateForDisplay(invite.acceptedAt)}</td>
      <td className="admin-table__actions">
        {invite.status === 'pending' && (
          <RowMenu
            ariaLabel={tf('adminInvites.rowActions', { email: invite.email })}
            deleteLabel={t('adminInvites.revoke')}
            onDelete={() => onRevoke(invite)}
            extraItems={extraItems}
          />
        )}
      </td>
    </tr>
  );
};

InviteRow.propTypes = {
  invite: PropTypes.object.isRequired,
  onRevoke: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

// Responsive invites table (dates collapse under the email on mobile).
const InvitesTable = ({ invites, busy, onRevoke, onCopy }) => (
  <div className="section-card admin-table-wrap" aria-busy={busy}>
    <table className="admin-table type-body">
      <thead>
        <tr>
          <th className="type-caption-strong">{t('adminInvites.colEmail')}</th>
          <th className="type-caption-strong">{t('adminInvites.colStatus')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('adminInvites.colSent')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('adminInvites.colExpires')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('adminInvites.colAccepted')}</th>
          <th aria-label={t('adminInvites.colActions')} />
        </tr>
      </thead>
      <tbody>
        {invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} onRevoke={onRevoke} onCopy={onCopy} />
        ))}
      </tbody>
    </table>
  </div>
);

InvitesTable.propTypes = {
  busy: PropTypes.bool.isRequired,
  invites: PropTypes.array.isRequired,
  onRevoke: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

// Empty state: first-use prompt, or "no match" when filters are active.
const InvitesEmpty = ({ filtered }) =>
  filtered ? (
    <EmptyBlock icon={Mail} title={t('adminInvites.emptyFiltered')} />
  ) : (
    <EmptyBlock icon={Mail} title={t('adminInvites.emptyTitle')} description={t('adminInvites.emptyDescription')} />
  );

InvitesEmpty.propTypes = { filtered: PropTypes.bool.isRequired };

// Admin page: send beta invites and manage the ones already sent.
const InvitesList = () => {
  const { showToast } = useToast();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [status, setStatus] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const emailFilter = useDebouncedValue(emailInput.trim(), SEARCH_DEBOUNCE_MS);
  const [page, setPage] = useResettablePage(`${status}|${emailFilter}`);
  const params = useMemo(
    () => ({ status, email: emailFilter, page, pageSize: PAGE_SIZE }),
    [status, emailFilter, page]
  );
  const { data, staleData, loading, error, reload } = useAdminQuery(listTrainerInvites, params);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard?.writeText(text);
      showToast(t('adminInvites.copied'), 'success');
    } catch {
      showToast(t('adminInvites.copyError'), 'error');
    }
  };

  const handleRevoke = (invite) =>
    requestConfirm({
      message: tf('adminInvites.revokeConfirm', { email: invite.email }),
      confirmLabel: t('adminInvites.revoke'),
      busyLabel: t('adminInvites.revoking'),
      onConfirm: async () => {
        await revokeTrainerInvite(invite.id);
        showToast(t('adminInvites.revokeSuccess'), 'success');
        reload();
      },
    });

  const shown = data ?? staleData;
  const invites = shown?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((shown?.total ?? 0) / PAGE_SIZE));
  const hasRows = invites.length > 0;
  const isEmpty = !loading && !error && !hasRows;

  return (
    <div className="admin-page">
      <LibraryPageHeader icon={Mail} title={t('adminInvites.title')} />
      <InviteSendForm onSent={reload} onCopy={handleCopy} />
      <InviteFilters status={status} onStatusChange={setStatus} emailInput={emailInput} onEmailChange={setEmailInput} />
      <QueryFeedback
        loading={loading && !hasRows}
        error={error}
        loadingLabel={t('adminInvites.loading')}
        errorTitle={t('adminInvites.errorTitle')}
        retryLabel={t('adminInvites.retry')}
        onRetry={reload}
      />
      {isEmpty && <InvitesEmpty filtered={!!(status || emailFilter)} />}
      {!error && hasRows && (
        <>
          <InvitesTable invites={invites} busy={loading} onRevoke={handleRevoke} onCopy={handleCopy} />
          <AdminPagination page={page} pageCount={pageCount} onPageChange={setPage} i18nPrefix="adminInvites" />
        </>
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

export default InvitesList;
