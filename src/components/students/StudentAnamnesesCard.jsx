import PropTypes from 'prop-types';
import { ClipboardList, Plus } from 'lucide-react';
import Badge from '../ds/Badge';
import SkeletonRows from '../ds/SkeletonRows';
import RowMenu from '../RowMenu';
import { canFillLink, canViewLinkResponses, getLinkStatusInfo, sortLinksByResponseStatus } from '../../utils/anamnesisLinkStatus';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';
import { td } from '../../utils/studentCockpit';

const PREVIEW_LIMIT = 2;

const STATUS_TONE = {
  pending: 'warning',
  draft: 'neutral',
  awaiting_confirmation: 'brand',
  submitted: 'success',
};

const buildMeta = (link, status) => {
  const linkedAt = link.createdAt ? td('anamneses.linkedAt', { date: formatDateTimeForDisplay(link.createdAt) }) : null;
  const detail = status.key === 'pending' ? linkedAt : status.detail;
  return [link.anamnesis.isGeneral ? td('anamneses.general') : null, detail].filter(Boolean).join(' · ');
};

const buildActions = (link, { onFill, onViewResponses }) => [
  ...(canFillLink(link) ? [{ label: td('anamneses.fill'), onClick: () => onFill(link) }] : []),
  ...(canViewLinkResponses(link) ? [{ label: td('anamneses.viewResponses'), onClick: () => onViewResponses(link) }] : []),
];

/* One action → direct button; two or more → row menu (CLAUDE.md rule 5). */
const AnamnesisActions = ({ title, actions }) => {
  if (actions.length === 0) return null;
  if (actions.length === 1) {
    const [action] = actions;
    return (
      <button type="button" className="btn btn--ghost" onClick={action.onClick}>
        {action.label}
      </button>
    );
  }
  return <RowMenu ariaLabel={td('anamneses.optionsAria', { title })} extraItems={actions} />;
};

AnamnesisActions.propTypes = {
  title: PropTypes.string.isRequired,
  actions: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, onClick: PropTypes.func })).isRequired,
};

const AnamnesisItem = ({ link, handlers }) => {
  const status = getLinkStatusInfo(link);
  const meta = buildMeta(link, status);

  return (
    <li className="cockpit-card__item cockpit-card__item--static">
      <div className="cockpit-card__item-body">
        <span className="cockpit-card__item-title type-body-lg-strong">{link.anamnesis.title}</span>
        {meta && <span className="cockpit-card__item-meta type-caption">{meta}</span>}
      </div>
      <div className="cockpit-card__item-side">
        <Badge tone={STATUS_TONE[status.key] ?? 'neutral'}>{status.label}</Badge>
        <AnamnesisActions title={link.anamnesis.title} actions={buildActions(link, handlers)} />
      </div>
    </li>
  );
};

AnamnesisItem.propTypes = {
  link: PropTypes.object.isRequired,
  handlers: PropTypes.shape({ onFill: PropTypes.func, onViewResponses: PropTypes.func }).isRequired,
};

const AnamnesesEmpty = ({ onLink }) => (
  <div className="cockpit-card__empty">
    <span className="cockpit-card__empty-icon" aria-hidden="true">
      <ClipboardList size={20} strokeWidth={2} />
    </span>
    <div className="cockpit-card__empty-text">
      <p className="type-body-strong">{td('anamneses.emptyTitle')}</p>
      <p className="type-caption">{td('anamneses.emptyDescription')}</p>
    </div>
    <button type="button" className="btn btn--primary" onClick={onLink}>
      {td('anamneses.link')}
    </button>
  </div>
);

AnamnesesEmpty.propTypes = { onLink: PropTypes.func.isRequired };

/** "Anamneses" card: linked questionnaires and their response status from GET /trainer/students/:id/anamneses. */
const StudentAnamnesesCard = ({ anamneses, loading, onViewAll, onLink, onFill, onViewResponses }) => {
  const preview = sortLinksByResponseStatus(anamneses).slice(0, PREVIEW_LIMIT);
  const hasLinks = preview.length > 0;

  return (
    <section className="section-card cockpit-card" aria-labelledby="student-anamneses-heading">
      <header className="cockpit-card__header">
        <h3 id="student-anamneses-heading" className="cockpit-card__title type-h3">{td('anamneses.title')}</h3>
        <div className="cockpit-card__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onViewAll}
            aria-label={td('anamneses.viewAllAria', { count: anamneses.length })}
          >
            {td('anamneses.viewAll', { count: anamneses.length })}
          </button>
          {hasLinks && (
            <button type="button" className="btn btn--secondary" onClick={onLink}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              {td('anamneses.link')}
            </button>
          )}
        </div>
      </header>
      {loading && <SkeletonRows label={td('loading.anamneses')} count={2} />}
      {!loading && !hasLinks && <AnamnesesEmpty onLink={onLink} />}
      {!loading && hasLinks && (
        <ul className="cockpit-card__list">
          {preview.map((link) => (
            <AnamnesisItem key={link.id} link={link} handlers={{ onFill, onViewResponses }} />
          ))}
        </ul>
      )}
    </section>
  );
};

StudentAnamnesesCard.propTypes = {
  anamneses: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  onViewAll: PropTypes.func.isRequired,
  onLink: PropTypes.func.isRequired,
  onFill: PropTypes.func.isRequired,
  onViewResponses: PropTypes.func.isRequired,
};

export default StudentAnamnesesCard;
