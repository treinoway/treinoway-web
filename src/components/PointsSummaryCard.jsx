import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';
import { countDiffs } from '../utils/pointsDiff';
import { POINTS_FIELDS } from '../constants/points-fields';

const CHIP_LABELS = {
  ptsWorkoutCompleted: 'Treino',
  ptsStreak7Days: 'Seq. 7d',
  ptsStreak30Days: 'Seq. 30d',
  ptsDailyCheckin: 'Check-in',
  ptsEvolutionRecord: 'Evolução',
  ptsWorkoutFeedback: 'Feedback',
  dailyPointsCap: 'Limite',
};

const VISIBLE_CHIPS = 3;

const pointFields = POINTS_FIELDS.filter((f) => f.key !== 'dailyPointsCap' && CHIP_LABELS[f.key]);
const visibleFields = pointFields.slice(0, VISIBLE_CHIPS);
const remainingCount = pointFields.length - VISIBLE_CHIPS;

const PointsSummaryCard = ({ values, template, editable, onAction, showDiff }) => {
  const shouldShowDiff = showDiff !== false && !!template;
  const ptsDiffCount = shouldShowDiff ? countDiffs(values, template) : 0;
  const anonymousDiff = shouldShowDiff ? !!values.anonymousRanking !== !!template.anonymousRanking : false;
  const diffCount = ptsDiffCount + (anonymousDiff ? 1 : 0);
  const isCustomized = diffCount > 0;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAction();
    }
  };

  const clickProps = editable
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: onAction,
        onKeyDown: handleKeyDown,
        style: { cursor: 'pointer' },
      }
    : {};

  return (
    <div className="card card--mb points-summary-card" {...clickProps}>
      <div className="points-summary-card__header">
        <div className="points-summary-card__header-left">
          <span className="points-summary-card__title">Pontuação</span>
          {shouldShowDiff && isCustomized && (
            <span className="badge badge-blue">Personalizado</span>
          )}
        </div>
        {editable && (
          <span className="points-summary-card__chevron" aria-hidden="true">
            <ChevronRight size={20} strokeWidth={1.6} />
          </span>
        )}
      </div>

      <div className="points-chip-grid">
        {visibleFields.map((field) => {
          const val = values[field.key];
          const display = val != null ? `${val} pts` : '--';
          return (
            <span key={field.key} className="points-chip">
              <span className="points-chip__label">{CHIP_LABELS[field.key]}</span>
              <span className="points-chip__value">{display}</span>
            </span>
          );
        })}
        {remainingCount > 0 && (
          <span className="points-chip points-chip--muted">+{remainingCount} regras</span>
        )}
      </div>
    </div>
  );
};

PointsSummaryCard.propTypes = {
  values: PropTypes.object.isRequired,
  template: PropTypes.object,
  editable: PropTypes.bool,
  onAction: PropTypes.func.isRequired,
  showDiff: PropTypes.bool,
};

export default PointsSummaryCard;
