import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';

/**
 * Clickable exercise row used on training template detail views.
 * The entire row is a single tappable target that opens the edit flow.
 * When the source exercise has been deleted, the row shows an amber
 * warning dot and caption but remains tappable so the trainer can still
 * edit the snapshot.
 */
const ExerciseRowCard = ({
  name,
  summary,
  sourceDeleted = false,
  sourceDeletedLabel = 'Exercício original removido',
  onClick,
  ariaLabel,
}) => {
  const label = ariaLabel || `Editar exercício ${name}`;

  return (
    <button
      type="button"
      className={`exercise-row-card${sourceDeleted ? ' exercise-row-card--warning' : ''}`}
      onClick={onClick}
      aria-label={label}
    >
      <span className="exercise-row-card__body">
        <span className="exercise-row-card__title-row">
          {sourceDeleted && (
            <span className="exercise-row-card__warning-dot" aria-hidden="true" />
          )}
          <span className="exercise-row-card__name">{name}</span>
        </span>
        {sourceDeleted && (
          <span className="exercise-row-card__warning-text">{sourceDeletedLabel}</span>
        )}
        {summary && <span className="exercise-row-card__summary">{summary}</span>}
      </span>
      <ChevronRight
        size={20}
        strokeWidth={2}
        className="exercise-row-card__chevron"
        aria-hidden="true"
      />
    </button>
  );
};

ExerciseRowCard.propTypes = {
  name: PropTypes.string.isRequired,
  summary: PropTypes.string,
  sourceDeleted: PropTypes.bool,
  sourceDeletedLabel: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
};

export default ExerciseRowCard;
