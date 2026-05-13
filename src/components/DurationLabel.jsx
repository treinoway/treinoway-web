import PropTypes from 'prop-types';
import { Clock } from 'lucide-react';
import { formatDuration } from '../utils/formatDuration';

/**
 * Single source of truth for rendering an estimated workout duration.
 *
 * Variants:
 *   - inline (default): Clock icon + text on the same line, muted color.
 *   - bare: text only, no icon (e.g. embedded in a CTA).
 *   - column: right-aligned, used in trainer lists and detail headers.
 *
 * Accessibility: the wrapper carries an `aria-label` with a full sentence,
 * the icon is `aria-hidden`. Visual content is read via the label, not the
 * abbreviated minutes string.
 */
const DurationLabel = ({ seconds, variant = 'inline', className = '' }) => {
  const { text, ariaLabel, state } = formatDuration(seconds);

  const baseClass = 'duration-label';
  const variantClass = `duration-label--${variant}`;
  const stateClass = `duration-label--${state}`;
  const composedClassName = [baseClass, variantClass, stateClass, className]
    .filter(Boolean)
    .join(' ');

  const showIcon = variant !== 'bare';

  return (
    <span className={composedClassName} aria-label={ariaLabel}>
      {showIcon && (
        <Clock
          size={14}
          strokeWidth={2}
          aria-hidden="true"
          className="duration-label__icon"
        />
      )}
      <span className="duration-label__text">{text}</span>
    </span>
  );
};

DurationLabel.propTypes = {
  seconds: PropTypes.number,
  variant: PropTypes.oneOf(['inline', 'bare', 'column']),
  className: PropTypes.string,
};

export default DurationLabel;
