import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';
import Badge from './ds/Badge';
import formatRpe from '../utils/formatRpe';
import { formatDuration } from '../utils/formatDuration';
import { td } from '../utils/studentCockpit';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const STATUS_BADGE = {
  in_progress: { tone: 'brand', labelKey: 'sessions.inProgress' },
  abandoned: { tone: 'error', labelKey: 'sessions.abandoned' },
};

// Splits an ISO date into weekday, day and month labels.
const toDateParts = (iso) => {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return { weekday: '-', day: '-', month: '-' };
  return {
    weekday: WEEKDAYS[date.getDay()],
    day: String(date.getDate()).padStart(2, '0'),
    month: MONTHS[date.getMonth()],
  };
};

// Joins duration and RPE into the row's meta line.
const buildMeta = (session) => {
  const duration = session.durationSeconds ? formatDuration(session.durationSeconds).text : null;
  return [duration, formatRpe(session.avgRpe ?? null)].filter(Boolean).join(' · ');
};

// One clickable session row (date block, name, meta, status badge).
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

export default SessionItem;
