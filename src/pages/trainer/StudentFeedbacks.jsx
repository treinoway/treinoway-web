import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCheck, ClipboardList, MessagesSquare, Settings2 } from 'lucide-react';
import Avatar from '../../components/ds/Avatar';
import Banner from '../../components/ds/Banner';
import EmptyBlock from '../../components/ds/EmptyBlock';
import MetricCard from '../../components/ds/MetricCard';
import Segmented from '../../components/ds/Segmented';
import SkeletonRows from '../../components/ds/SkeletonRows';
import FeedbackIndex from '../../components/studentFeedback/FeedbackIndex';
import useStudentFeedbackInbox from '../../hooks/useStudentFeedbackInbox';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';
import { formatRate, formatScore, isUnreadFeedback, milestoneLabelOf } from '../../utils/studentFeedback';
import { FEEDBACK_MILESTONES, FEEDBACK_STATUS_FILTER, STUDENT_FEEDBACK_SETTINGS_PATH, STUDENT_FEEDBACK_TEMPLATES_PATH, studentFeedbackHistoryPath } from '../../constants/studentFeedback';
import { t } from '../../i18n';

const SKELETON_COUNT = 6;

// Text of the inbox under the `studentFeedback.inbox` namespace
const ti = (key) => t(`studentFeedback.inbox.${key}`);

// Tone of a count tile: highlighted only while there is something to look at
const countToneOf = (count, tone) => (count > 0 ? tone : 'neutral');

// Title of the page and the ways into the templates and the auto-send configuration
const InboxHeader = ({ onOpenTemplates, onConfigure }) => (
  <header className="ds-page-header">
    <h1 className="ds-page-header__title type-h1">{ti('title')}</h1>
    <div className="ds-page-header__actions">
      <button type="button" className="btn btn--secondary" onClick={onOpenTemplates}>
        <ClipboardList size={16} strokeWidth={2} aria-hidden="true" />
        {ti('templates')}
      </button>
      <button type="button" className="btn btn--secondary" onClick={onConfigure}>
        <Settings2 size={16} strokeWidth={2} aria-hidden="true" />
        {ti('configure')}
      </button>
    </div>
  </header>
);

InboxHeader.propTypes = {
  onOpenTemplates: PropTypes.func.isRequired,
  onConfigure: PropTypes.func.isRequired,
};

// The four tiles of the summary, which the service computes over every feedback regardless of the filters
const SummaryTiles = ({ summary }) => (
  <section className="metric-grid" aria-label={ti('summaryAria')}>
    <MetricCard label={ti('tiles.responseRate')} value={formatRate(summary.responseRate30d)} support={ti('tiles.responseRateSupport')} />
    <MetricCard label={ti('tiles.averageIndex')} value={formatScore(summary.averageIndex)} support={ti('tiles.averageIndexSupport')} />
    <MetricCard label={ti('tiles.unanswered')} value={summary.unansweredCount} support={ti('tiles.unansweredSupport')} tone={countToneOf(summary.unansweredCount, 'warning')} />
    <MetricCard label={ti('tiles.unread')} value={summary.unreadCount} support={ti('tiles.unreadSupport')} tone={countToneOf(summary.unreadCount, 'brand')} />
  </section>
);

SummaryTiles.propTypes = { summary: PropTypes.object.isRequired };

// One chip of the milestone filter
const MilestoneChip = ({ label, active, onSelect }) => (
  <button type="button" className={`chip${active ? ' chip--active' : ''}`} aria-pressed={active} onClick={onSelect}>
    {label}
  </button>
);

MilestoneChip.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};

// Status filter with the unread and unanswered counts, and one chip per milestone
const InboxFilters = ({ inbox }) => {
  const summary = inbox.data?.summary;
  const statusItems = [
    { id: FEEDBACK_STATUS_FILTER.ALL, label: ti('status.all') },
    { id: FEEDBACK_STATUS_FILTER.UNREAD, label: ti('status.unread'), count: summary?.unreadCount },
    { id: FEEDBACK_STATUS_FILTER.UNANSWERED, label: ti('status.unanswered'), count: summary?.unansweredCount },
  ];
  return (
    <div className="student-feedback-filters">
      <Segmented ariaLabel={ti('statusAria')} items={statusItems} value={inbox.status} onChange={inbox.setStatus} />
      <div className="chip-group" role="group" aria-label={ti('milestoneAria')}>
        <MilestoneChip label={ti('milestoneAll')} active={!inbox.milestone} onSelect={() => inbox.setMilestone(null)} />
        {FEEDBACK_MILESTONES.map((milestone) => (
          <MilestoneChip
            key={milestone}
            label={t(`studentFeedback.milestone.${milestone}`)}
            active={inbox.milestone === milestone}
            onSelect={() => inbox.setMilestone(milestone)}
          />
        ))}
      </div>
    </div>
  );
};

InboxFilters.propTypes = { inbox: PropTypes.object.isRequired };

// One feedback: student linked to the history, milestone, date received, index with band and, while unread, mark as read
const FeedbackRow = ({ item, marking, onMarkRead }) => {
  const name = item.student.name || t('studentFeedback.unnamedStudent');
  const unread = isUnreadFeedback(item);
  const received = formatDateTimeForDisplay(item.submittedAt);
  return (
    <tr>
      <td>
        <div className="student-feedback-student">
          <Avatar name={name} src={item.student.avatarUrl ?? undefined} />
          <div className="student-feedback-student__identity">
            <Link className={`student-feedback-student__link ${unread ? 'type-body-strong' : 'type-body'}`} to={studentFeedbackHistoryPath(item.student.id)}>{name}</Link>
            {item.submittedAt && <span className="table-col-mobile-only admin-table__sub type-caption">{received}</span>}
          </div>
        </div>
      </td>
      <td>{milestoneLabelOf(item)}</td>
      <td className="table-col-desktop-only">{received}</td>
      <td><FeedbackIndex feedback={item} /></td>
      <td className="admin-table__actions">
        {unread && (
          <button type="button" className="icon-button" aria-label={ti('markRead')} title={ti('markRead')} disabled={marking} onClick={() => onMarkRead(item.id)}>
            <CheckCheck size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </td>
    </tr>
  );
};

FeedbackRow.propTypes = {
  item: PropTypes.object.isRequired,
  marking: PropTypes.bool.isRequired,
  onMarkRead: PropTypes.func.isRequired,
};

// Feedbacks of the current filters; the date column folds under the student name on a phone
const FeedbackTable = ({ inbox }) => (
  <div className="section-card admin-table-wrap" aria-busy={inbox.loading}>
    <table className="admin-table student-feedback-table type-body">
      <thead>
        <tr>
          <th className="type-caption-strong">{ti('columns.student')}</th>
          <th className="type-caption-strong">{ti('columns.milestone')}</th>
          <th className="type-caption-strong table-col-desktop-only">{ti('columns.received')}</th>
          <th className="type-caption-strong">{ti('columns.index')}</th>
          <th aria-label={ti('columns.actions')} />
        </tr>
      </thead>
      <tbody>
        {inbox.data.items.map((item) => (
          <FeedbackRow key={item.id} item={item} marking={inbox.markingId === item.id} onMarkRead={inbox.markRead} />
        ))}
      </tbody>
    </table>
  </div>
);

FeedbackTable.propTypes = { inbox: PropTypes.object.isRequired };

// Under the filters: the error with retry, the placeholder (first load, or an empty list still reloading for new filters), the table or the empty block, which leads to the auto-send settings while no filter is on
const InboxContent = ({ inbox, onConfigure }) => {
  const { data, error, loading } = inbox;
  const isFiltered = inbox.status !== FEEDBACK_STATUS_FILTER.ALL || Boolean(inbox.milestone);
  if (error) {
    const retry = <button type="button" className="btn btn--secondary" onClick={() => inbox.reload()}>{t('studentFeedback.retry')}</button>;
    return <Banner tone="error" action={retry}>{error}</Banner>;
  }
  if (!data) return <SkeletonRows label={ti('loading')} count={SKELETON_COUNT} />;
  if (data.items.length > 0) return <FeedbackTable inbox={inbox} />;
  // why: an empty list still reloading belongs to the previous filters, so neither empty message is known to be true yet.
  if (loading) return <SkeletonRows label={ti('loading')} count={SKELETON_COUNT} />;
  if (isFiltered) return <EmptyBlock icon={MessagesSquare} title={ti('emptyTitle')} description={ti('emptyFilteredDescription')} />;
  return <EmptyBlock icon={MessagesSquare} title={ti('emptyTitle')} description={ti('emptyDescription')} actionLabel={ti('emptyAction')} onAction={onConfigure} />;
};

InboxContent.propTypes = {
  inbox: PropTypes.object.isRequired,
  onConfigure: PropTypes.func.isRequired,
};

// Inbox of the student feedbacks: summary tiles, status and milestone filters and the feedbacks they return
const StudentFeedbacks = () => {
  const navigate = useNavigate();
  const inbox = useStudentFeedbackInbox();
  const handleConfigure = () => navigate(STUDENT_FEEDBACK_SETTINGS_PATH);

  return (
    <div className="student-feedback-page">
      <InboxHeader onOpenTemplates={() => navigate(STUDENT_FEEDBACK_TEMPLATES_PATH)} onConfigure={handleConfigure} />
      {inbox.data && <SummaryTiles summary={inbox.data.summary} />}
      <InboxFilters inbox={inbox} />
      <InboxContent inbox={inbox} onConfigure={handleConfigure} />
    </div>
  );
};

export default StudentFeedbacks;
