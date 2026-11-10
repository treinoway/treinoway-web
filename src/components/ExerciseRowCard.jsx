import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';
import TechniqueChips from './advancedTechniques/TechniqueChips';
import VideoBadge from './VideoBadge';
import { hasDemoMedia } from '../utils/demoMedia';

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
  techniques,
  media,
  emptyHint,
  sourceDeleted = false,
  sourceDeletedLabel = 'Exercício original removido',
  onClick,
  ariaLabel,
}) => {
  const label = ariaLabel || `Editar exercício ${name}`;
  const showEmptyHint = !summary && !techniques?.length && !hasDemoMedia(media) && !sourceDeleted && !!emptyHint;

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
        {(summary || techniques?.length > 0 || hasDemoMedia(media)) && (
          <span className="exercise-row-card__summary">
            {summary}
            <VideoBadge exercise={media} />
            <TechniqueChips techniques={techniques} />
          </span>
        )}
        {showEmptyHint && (
          <span className="exercise-row-card__empty-hint">{emptyHint}</span>
        )}
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
  techniques: PropTypes.array,
  /** Object carrying videoUrl/gifUrl; drives the "Vídeo" badge. */
  media: PropTypes.shape({ videoUrl: PropTypes.string, videoFileKey: PropTypes.string, videoFileUrl: PropTypes.string, gifUrl: PropTypes.string }),
  emptyHint: PropTypes.string,
  sourceDeleted: PropTypes.bool,
  sourceDeletedLabel: PropTypes.string,
  onClick: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
};

export default ExerciseRowCard;
