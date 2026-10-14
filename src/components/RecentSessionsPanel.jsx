import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';
import Badge from './ds/Badge';
import SkeletonRows from './ds/SkeletonRows';
import formatRpe from '../utils/formatRpe';
import { formatDuration } from '../utils/formatDuration';
import { td } from '../utils/studentCockpit';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const STATUS_BADGE = {
  in_progress: { tone: 'brand', labelKey: 'sessions.inProgress' },
  abandoned: { tone: 'error', labelKey: 'sessions.abandoned' },
};

const toDateParts = (iso) => {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return { weekday: '-', day: '-', month: '-' };
  return {
    weekday: WEEKDAYS[date.getDay()],
    day: String(date.getDate()).padStart(2, '0'),
    month: MONTHS[date.getMonth()],
  };
};

const buildMeta = (session) => {
  const duration = session.durationSeconds ? formatDuration(session.durationSeconds).text : null;
  return [duration, formatRpe(session.avgRpe ?? null)].filter(Boolean).join(' · ');
};

const SessionItem = ({ session, onOpen }) => {
  const { weekday, day, month } = toDateParts(session.startedAt);
  const name = session.trainingName ?? td('sessions.fallbackName');
  const meta = buildMeta(session);
  const badge = STATUS_BADGE[session.status];

  return (
    <li>
      <button
        type="button"
        className="session-item"
        aria-label={td('sessions.openAria', { name, date: `${day} ${month}` })}
        onClick={() => onOpen(session)}
      >
        <span className="date-block" aria-hidden="true">
          <span className="date-block__overline type-overline">{weekday}</span>
          <span className="date-block__day type-h3">{day}</span>
          <span className="date-block__overline type-overline">{month}</span>
        </span>
        <span className="session-item__body">
          <span className="session-item__name type-body-lg">{name}</span>
          {meta && <span className="session-item__meta type-caption">{meta}</span>}
        </span>
        {badge && <Badge tone={badge.tone}>{td(badge.labelKey)}</Badge>}
        <ChevronRight className="session-item__chevron" size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  );
};

SessionItem.propTypes = {
  session: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
};

const SessionsBody = ({ sessions, loading, error, onRetry, onOpen }) => {
  if (loading && sessions.length === 0 && !error) {
    return <SkeletonRows label={td('loading.sessions')} count={3} />;
  }
  if (error && sessions.length === 0) {
    return (
      <div className="cockpit-card__error" role="alert">
        <p className="type-body">{td('sessions.error')}</p>
        <button type="button" className="btn btn--secondary" onClick={onRetry}>{td('retry')}</button>
      </div>
    );
  }
  if (sessions.length === 0) {
    return <p className="cockpit-card__muted type-body">{td('sessions.empty')}</p>;
  }
  return (
    <ul className="session-items">
      {sessions.map((session) => <SessionItem key={session.id} session={session} onOpen={onOpen} />)}
    </ul>
  );
};

SessionsBody.propTypes = {
  sessions: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.any,
  onRetry: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

/** "Sessões recentes": latest sessions in the period, from GET dashboard/recent-sessions. */
const RecentSessionsPanel = ({ sessions, loading, error, onViewAll, onRetry, onOpen }) => (
  <section className="section-card cockpit-card" aria-labelledby="cockpit-recent-heading">
    <header className="cockpit-card__header cockpit-card__header--action-slot">
      <h3 id="cockpit-recent-heading" className="cockpit-card__title type-h3">{td('sessions.title')}</h3>
      {sessions.length > 0 && (
        <button type="button" className="btn btn--ghost" onClick={onViewAll} aria-label={td('sessions.viewAllAria')}>
          {td('sessions.viewAll')}
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </header>
    <SessionsBody sessions={sessions} loading={loading} error={error} onRetry={onRetry} onOpen={onOpen} />
  </section>
);

RecentSessionsPanel.propTypes = {
  sessions: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.any,
  onViewAll: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default RecentSessionsPanel;
