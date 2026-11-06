import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { MessageSquare } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError, t } from '../../i18n';
import { listFeedbacks, updateFeedbackStatus } from '../../api/admin';
import useAdminQuery from '../../hooks/useAdminQuery';
import useResettablePage from '../../hooks/useResettablePage';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import Badge from '../../components/ds/Badge';
import EmptyBlock from '../../components/ds/EmptyBlock';
import Segmented from '../../components/ds/Segmented';
import SkeletonRows from '../../components/ds/SkeletonRows';
import QueryFeedback from '../../components/admin/QueryFeedback';
import AdminPagination from '../../components/admin/AdminPagination';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';

const PAGE_SIZE = 20;
const FILTER_IDS = ['NEW', 'READ', 'ALL'];

const CATEGORY_BADGE_TONE = {
  BUG: 'error',
  SUGGESTION: 'brand',
  PRAISE: 'success',
};

// Query data after `id` was marked read: dropped from the "new" list, flagged read elsewhere.
const applyMarkedRead = (current, id, filter) => {
  if (!current) return current;
  if (filter === 'NEW') {
    return { ...current, items: current.items.filter((item) => item.id !== id), total: Math.max(0, current.total - 1) };
  }
  return { ...current, items: current.items.map((item) => (item.id === id ? { ...item, status: 'READ' } : item)) };
};

// One feedback row; only unread items offer the "mark as read" action.
const FeedbackRow = ({ feedback, pendingId, onMarkRead }) => (
  <tr>
    <td>
      <span className="type-body-strong">{feedback.trainer.name}</span>
      <span className="admin-table__sub type-caption">{feedback.trainer.email}</span>
      <span className="table-col-mobile-only admin-table__sub type-caption">
        {formatDateTimeForDisplay(feedback.createdAt)}
      </span>
    </td>
    <td><Badge tone={CATEGORY_BADGE_TONE[feedback.category] || 'neutral'}>{feedback.categoryLabel}</Badge></td>
    <td className="admin-feedback__message">{feedback.message}</td>
    <td className="table-col-desktop-only">{feedback.pagePath || '-'}</td>
    <td className="table-col-desktop-only">{formatDateTimeForDisplay(feedback.createdAt)}</td>
    <td className="admin-table__actions">
      {feedback.status === 'NEW' && (
        <button
          type="button"
          className="btn btn--secondary"
          disabled={pendingId === feedback.id}
          onClick={() => onMarkRead(feedback)}
        >
          {pendingId === feedback.id ? t('adminFeedbacks.markingRead') : t('adminFeedbacks.markRead')}
        </button>
      )}
    </td>
  </tr>
);

FeedbackRow.propTypes = {
  feedback: PropTypes.object.isRequired,
  pendingId: PropTypes.string,
  onMarkRead: PropTypes.func.isRequired,
};

// Responsive feedback table (date and page collapse on mobile).
const FeedbackTable = ({ feedbacks, busy, pendingId, onMarkRead }) => (
  <div className="section-card admin-table-wrap" aria-busy={busy}>
    <table className="admin-table type-body">
      <thead>
        <tr>
          <th className="type-caption-strong">{t('adminFeedbacks.colTrainer')}</th>
          <th className="type-caption-strong">{t('adminFeedbacks.colCategory')}</th>
          <th className="type-caption-strong">{t('adminFeedbacks.colMessage')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('adminFeedbacks.colPage')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('adminFeedbacks.colDate')}</th>
          <th aria-label={t('adminFeedbacks.colActions')} />
        </tr>
      </thead>
      <tbody>
        {feedbacks.map((feedback) => (
          <FeedbackRow key={feedback.id} feedback={feedback} pendingId={pendingId} onMarkRead={onMarkRead} />
        ))}
      </tbody>
    </table>
  </div>
);

FeedbackTable.propTypes = {
  feedbacks: PropTypes.array.isRequired,
  busy: PropTypes.bool.isRequired,
  pendingId: PropTypes.string,
  onMarkRead: PropTypes.func.isRequired,
};

// Admin page: read the criticism and suggestions sent by beta trainers.
const FeedbackList = () => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState('NEW');
  const [pendingId, setPendingId] = useState(null);
  const [page, setPage] = useResettablePage(filter);
  const params = useMemo(
    () => ({ ...(filter !== 'ALL' && { status: filter }), page, pageSize: PAGE_SIZE }),
    [filter, page]
  );
  const { data, staleData, loading, error, reload, setData } = useAdminQuery(listFeedbacks, params);

  const shown = data ?? staleData;
  const feedbacks = shown?.items ?? [];

  const handleMarkRead = async (feedback) => {
    setPendingId(feedback.id);
    try {
      await updateFeedbackStatus(feedback.id, 'READ');
      setData((current) => applyMarkedRead(current, feedback.id, filter));
      if (filter === 'NEW' && feedbacks.length <= 1) reload();
      showToast(t('adminFeedbacks.markReadSuccess'), 'success');
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setPendingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil((shown?.total ?? 0) / PAGE_SIZE));
  const hasRows = feedbacks.length > 0;
  const isEmpty = !loading && !error && !hasRows;
  const filterItems = FILTER_IDS.map((id) => ({ id, label: t(`adminFeedbacks.filter.${id}`) }));

  return (
    <div className="admin-page">
      <LibraryPageHeader icon={MessageSquare} title={t('adminFeedbacks.title')} />
      <Segmented ariaLabel={t('adminFeedbacks.filterLabel')} items={filterItems} value={filter} onChange={setFilter} />
      {loading && !hasRows && <SkeletonRows label={t('adminFeedbacks.loading')} count={5} />}
      <QueryFeedback
        loading={false}
        error={error}
        loadingLabel={t('adminFeedbacks.loading')}
        errorTitle={t('adminFeedbacks.errorTitle')}
        retryLabel={t('adminFeedbacks.retry')}
        onRetry={reload}
      />
      {isEmpty && (
        <EmptyBlock
          icon={MessageSquare}
          title={t('adminFeedbacks.emptyTitle')}
          description={t(`adminFeedbacks.emptyDescription.${filter}`)}
        />
      )}
      {!error && hasRows && (
        <>
          <FeedbackTable feedbacks={feedbacks} busy={loading} pendingId={pendingId} onMarkRead={handleMarkRead} />
          <AdminPagination page={page} pageCount={pageCount} onPageChange={setPage} i18nPrefix="adminFeedbacks" />
        </>
      )}
    </div>
  );
};

export default FeedbackList;
