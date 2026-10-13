import PropTypes from 'prop-types';
import { Calendar, ChevronRight, FileText, Plus } from 'lucide-react';
import Badge from '../ds/Badge';
import SkeletonRows from '../ds/SkeletonRows';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { formatExpiryHint, td } from '../../utils/studentCockpit';
import { getStatusLabel } from '../../constants/protocolStatus';

const FEATURED_LIMIT = 2;
const ARCHIVED_STATUS = 'archived';

const STATUS_TONE = { active: 'success', completed: 'neutral', archived: 'neutral' };

const RoutineItem = ({ protocol, onOpen }) => {
  const isActive = protocol.status === 'active';
  const expiryHint = isActive ? formatExpiryHint(protocol.expirationDate) : null;
  const range = `${formatDateForDisplay(protocol.startDate)} – ${formatDateForDisplay(protocol.expirationDate)}`;

  return (
    <li className="cockpit-card__item">
      <button
        type="button"
        className="cockpit-card__item-button"
        aria-label={td('routines.openAria', { name: protocol.name })}
        onClick={() => onOpen(protocol)}
      >
        <span className="cockpit-card__item-head">
          <span className="cockpit-card__item-title type-body-lg-strong">{protocol.name}</span>
          <Badge tone={STATUS_TONE[protocol.status] ?? 'neutral'}>{getStatusLabel(protocol.status)}</Badge>
        </span>
        <span className="cockpit-card__item-meta type-caption">
          <Calendar size={16} strokeWidth={2} aria-hidden="true" />
          {range}
          {expiryHint && <span className="cockpit-card__item-hint type-caption-strong">· {expiryHint}</span>}
        </span>
      </button>
    </li>
  );
};

RoutineItem.propTypes = {
  protocol: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    status: PropTypes.string,
    startDate: PropTypes.string,
    expirationDate: PropTypes.string,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
};

const RoutinesEmpty = ({ onCreate }) => (
  <div className="cockpit-card__empty">
    <span className="cockpit-card__empty-icon" aria-hidden="true">
      <FileText size={20} strokeWidth={2} />
    </span>
    <div className="cockpit-card__empty-text">
      <p className="type-body-strong">{td('routines.emptyTitle')}</p>
      <p className="type-caption">{td('routines.emptyDescription')}</p>
    </div>
    <button type="button" className="btn btn--primary" onClick={onCreate}>
      {td('routines.create')}
    </button>
  </div>
);

RoutinesEmpty.propTypes = { onCreate: PropTypes.func.isRequired };

const RoutinesBody = ({ protocols, onOpen, onCreate, onViewAll }) => {
  if (protocols.length === 0) return <RoutinesEmpty onCreate={onCreate} />;
  const current = protocols.filter((protocol) => protocol.status !== ARCHIVED_STATUS);
  const featured = (current.length > 0 ? current : protocols).slice(0, FEATURED_LIMIT);
  const archivedCount = protocols.length - current.length;
  const archivedLabel = archivedCount === 1
    ? td('routines.archivedOne')
    : td('routines.archivedOther', { count: archivedCount });

  return (
    <>
      <ul className="cockpit-card__list">
        {featured.map((protocol) => (
          <RoutineItem key={protocol.id} protocol={protocol} onOpen={onOpen} />
        ))}
      </ul>
      {archivedCount > 0 && (
        <button type="button" className="cockpit-card__footer-link type-body" onClick={onViewAll}>
          {archivedLabel}
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </>
  );
};

RoutinesBody.propTypes = {
  protocols: PropTypes.array.isRequired,
  onOpen: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onViewAll: PropTypes.func.isRequired,
};

/** "Rotinas" card: the student's routines (active first) from GET /trainer/protocols?assigneeId. */
const StudentRoutinesCard = ({ protocols, loading, onOpen, onCreate, onViewAll }) => (
  <section className="section-card cockpit-card" aria-labelledby="student-routines-heading">
    <header className="cockpit-card__header">
      <h3 id="student-routines-heading" className="cockpit-card__title type-h3">{td('routines.title')}</h3>
      <div className="cockpit-card__actions">
        <button type="button" className="btn btn--ghost" onClick={onViewAll} aria-label={td('routines.viewAllAria')}>
          {td('routines.viewAll')}
        </button>
        {protocols.length > 0 && (
          <button type="button" className="btn btn--secondary" onClick={onCreate}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            {td('routines.create')}
          </button>
        )}
      </div>
    </header>
    {loading
      ? <SkeletonRows label={td('loading.routines')} count={2} />
      : <RoutinesBody protocols={protocols} onOpen={onOpen} onCreate={onCreate} onViewAll={onViewAll} />}
  </section>
);

StudentRoutinesCard.propTypes = {
  protocols: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onViewAll: PropTypes.func.isRequired,
};

export default StudentRoutinesCard;
