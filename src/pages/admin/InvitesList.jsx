import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Send, Copy } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError, t } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import RowMenu from '../../components/RowMenu';
import { formatDateForDisplay } from '../../utils/dateFormat';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const MAGIC_LINK_BASE = 'https://teufit.com.br/invite?code=';

const STATUS_FILTER_VALUES = ['pending', 'accepted', 'revoked', 'expired'];

const STATUS_BADGE_CLASS = {
  pending: 'badge-blue',
  accepted: 'badge-green',
  revoked: 'badge-red',
  expired: 'badge-gray',
};

const buildMagicLink = (code) => `${MAGIC_LINK_BASE}${code}`;

const buildQueryString = ({ status, email, page }) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (email) params.append('email', email);
  params.append('page', String(page));
  params.append('pageSize', String(PAGE_SIZE));
  return params.toString();
};

const InvitesList = () => {
  const { showToast } = useToast();

  const [invites, setInvites] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdInvite, setCreatedInvite] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setEmailFilter(emailInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [emailInput]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQueryString({ status, email: emailFilter, page });
      const response = await api.get(`/admin/trainer-invites?${query}`);
      setInvites(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [status, emailFilter, page, showToast]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!inviteEmail.trim() || sending) return;
    setSending(true);
    setFormError('');
    try {
      const response = await api.post('/admin/trainer-invites', { email: inviteEmail.trim() });
      const { invite, code } = response.data || {};
      setCreatedInvite({ ...invite, code });
      setInviteEmail('');
      showToast(t('adminInvites.sendSuccess'), 'success');
      fetchInvites();
    } catch (error) {
      const message = error.userMessage || translateError(error);
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard?.writeText(text);
      showToast(t('adminInvites.copied'), 'success');
    } catch {
      showToast(t('adminInvites.copyError'), 'error');
    }
  };

  const handleRevoke = (invite) => {
    setConfirmDialog({
      message: t('adminInvites.revokeConfirm').replace('{email}', invite.email),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.post(`/admin/trainer-invites/${invite.id}/revoke`);
          showToast(t('adminInvites.revokeSuccess'), 'success');
          fetchInvites();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const buildRowMenuItems = (invite) => {
    if (!invite.code) return [];
    return [
      { label: t('adminInvites.copyCode'), onClick: () => handleCopy(invite.code) },
      { label: t('adminInvites.copyLink'), onClick: () => handleCopy(buildMagicLink(invite.code)) },
    ];
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(status || emailFilter);
  const showEmptyAll = !loading && invites.length === 0 && !hasFilters;
  const showEmptyFiltered = !loading && invites.length === 0 && hasFilters;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <Mail size={24} className="page-header-title-icon" strokeWidth={2} />
          <h1>{t('adminInvites.title')}</h1>
        </div>
      </div>

      <div className="card card--mb">
        <form className="invite-send-form" onSubmit={handleSend}>
          <div className="invite-send-field">
            <label className="form-label" htmlFor="invite-email">
              {t('adminInvites.emailLabel')}
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              className="form-input"
              placeholder={t('adminInvites.emailPlaceholder')}
              disabled={sending}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={sending}>
            <Send size={16} strokeWidth={2} />
            {sending ? t('adminInvites.sending') : t('adminInvites.send')}
          </button>
        </form>

        {formError && <p className="form-error" role="alert">{formError}</p>}

        {createdInvite && (
          <div className="invite-result">
            <p className="invite-result-title">
              {t('adminInvites.createdTitle').replace('{email}', createdInvite.email || '')}
            </p>

            <div className="invite-result-field">
              <span className="form-label">{t('adminInvites.codeLabel')}</span>
              <div className="invite-copy-row">
                <span className="invite-copy-value invite-copy-value--code">{createdInvite.code}</span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => handleCopy(createdInvite.code)}
                >
                  <Copy size={14} strokeWidth={2} />
                  {t('adminInvites.copyCode')}
                </button>
              </div>
            </div>

            <div className="invite-result-field">
              <span className="form-label">{t('adminInvites.linkLabel')}</span>
              <div className="invite-copy-row">
                <span className="invite-copy-value">{buildMagicLink(createdInvite.code)}</span>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => handleCopy(buildMagicLink(createdInvite.code))}
                >
                  <Copy size={14} strokeWidth={2} />
                  {t('adminInvites.copyLink')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="invite-filter-bar">
        <div>
          <label className="form-label" htmlFor="invites-status">{t('adminInvites.statusLabel')}</label>
          <Select
            id="invites-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">{t('adminInvites.statusAll')}</option>
            {STATUS_FILTER_VALUES.map((value) => (
              <option key={value} value={value}>{t(`adminInvites.status_${value}`)}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="form-label" htmlFor="invites-email">{t('adminInvites.searchLabel')}</label>
          <input
            id="invites-email"
            type="text"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            className="form-input"
            placeholder={t('adminInvites.searchPlaceholder')}
          />
        </div>
      </div>

      {loading && (
        <div className="loading-screen">
          <span className="loading-text">{t('adminInvites.loading')}</span>
        </div>
      )}

      {!loading && invites.length > 0 && (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('adminInvites.colEmail')}</th>
                  <th>{t('adminInvites.colStatus')}</th>
                  <th className="table-col-desktop-only">{t('adminInvites.colSent')}</th>
                  <th className="table-col-desktop-only">{t('adminInvites.colExpires')}</th>
                  <th className="table-col-desktop-only">{t('adminInvites.colAccepted')}</th>
                  <th aria-label={t('adminInvites.colActions')} />
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const badgeClass = STATUS_BADGE_CLASS[invite.status] || 'badge-gray';
                  const isPending = invite.status === 'pending';
                  return (
                    <tr key={invite.id}>
                      <td>
                        <span className="font-medium">{invite.email}</span>
                        <span className="table-col-mobile-only text-sm text-light">
                          {formatDateForDisplay(invite.createdAt)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{invite.statusLabel}</span>
                      </td>
                      <td className="table-col-desktop-only">{formatDateForDisplay(invite.createdAt)}</td>
                      <td className="table-col-desktop-only">{formatDateForDisplay(invite.expiresAt)}</td>
                      <td className="table-col-desktop-only">{formatDateForDisplay(invite.acceptedAt)}</td>
                      <td>
                        {isPending && (
                          <RowMenu
                            ariaLabel={t('adminInvites.rowActions').replace('{email}', invite.email)}
                            deleteLabel={t('adminInvites.revoke')}
                            onDelete={() => handleRevoke(invite)}
                            extraItems={buildRowMenuItems(invite)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="video-pagination">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                {t('adminInvites.prev')}
              </button>
              <span className="video-pagination__status">
                {t('adminInvites.pageStatus').replace('{page}', page).replace('{total}', pageCount)}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page === pageCount}
              >
                {t('adminInvites.next')}
              </button>
            </div>
          )}
        </>
      )}

      {showEmptyFiltered && (
        <div className="empty-state">
          <p className="empty-state-title">{t('adminInvites.emptyFiltered')}</p>
        </div>
      )}

      {showEmptyAll && (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <Mail size={32} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">{t('adminInvites.emptyTitle')}</p>
          <p>{t('adminInvites.emptyDescription')}</p>
        </div>
      )}

      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog">
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group btn-group--equal">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger btn-flex-1"
              >
                {t('adminInvites.confirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary btn-flex-1"
              >
                {t('adminInvites.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitesList;
