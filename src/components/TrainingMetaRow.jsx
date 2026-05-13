import PropTypes from 'prop-types';
import DurationLabel from './DurationLabel';

/**
 * Meta-row composing duration + exercise count + category for a training.
 *
 * Visual priority (high → low): Duration · Count · Category.
 * Overflow drop priority (when space is constrained, controlled via CSS):
 *   Category → Count → Duration. Duration never drops.
 *
 * Variants:
 *   - student-card: card meta-row (Duration · Count · Category)
 *   - student-detail: detail header (Duration | Count, Category on its own line)
 *   - trainer-row: trainer list row (count · category line, duration column-right)
 *
 * When `categoryLabel` is empty the segment is skipped (no double dots).
 */
const TrainingMetaRow = ({
  estimatedDurationSeconds,
  exerciseCount,
  categoryLabel,
  variant = 'student-card',
}) => {
  const baseClass = 'training-meta-row';
  const variantClass = `training-meta-row--${variant}`;
  const className = `${baseClass} ${variantClass}`;

  if (variant === 'trainer-row') {
    return (
      <div className={className}>
        <div className="training-meta-row__primary">
          <span className="training-meta-row__count">
            {exerciseCount} {pluralCount(exerciseCount)}
          </span>
          {categoryLabel && (
            <>
              <span className="training-meta-row__sep" aria-hidden="true">·</span>
              <span className="training-meta-row__category">{categoryLabel}</span>
            </>
          )}
        </div>
        <DurationLabel
          seconds={estimatedDurationSeconds}
          variant="column"
          className="training-meta-row__duration"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <DurationLabel
        seconds={estimatedDurationSeconds}
        variant="inline"
        className="training-meta-row__duration"
      />
      <span className="training-meta-row__sep" aria-hidden="true">·</span>
      <span className="training-meta-row__count">
        {exerciseCount} {pluralCount(exerciseCount)}
      </span>
      {categoryLabel && (
        <>
          <span
            className="training-meta-row__sep training-meta-row__sep--category"
            aria-hidden="true"
          >
            ·
          </span>
          <span className="training-meta-row__category">{categoryLabel}</span>
        </>
      )}
    </div>
  );
};

function pluralCount(count) {
  return count === 1 ? 'exercício' : 'exercícios';
}

TrainingMetaRow.propTypes = {
  estimatedDurationSeconds: PropTypes.number,
  exerciseCount: PropTypes.number.isRequired,
  categoryLabel: PropTypes.string,
  variant: PropTypes.oneOf(['student-card', 'student-detail', 'trainer-row']),
};

export default TrainingMetaRow;
