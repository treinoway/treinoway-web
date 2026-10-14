import PropTypes from 'prop-types';

const WIDTH_CLASS = { short: ' skeleton-text-line--short', medium: '', long: ' skeleton-text-line--long' };

/**
 * One line of text placeholder. It takes the typography class of the text it stands in
 * for (`type-h1`, `type-caption`…), so its height is exactly one line of that text.
 */
const SkeletonText = ({ typeClass, width = 'medium' }) => (
  <span className={`skeleton-text-line ${typeClass}${WIDTH_CLASS[width]}`} aria-hidden="true">{' '}</span>
);

SkeletonText.propTypes = {
  typeClass: PropTypes.string.isRequired,
  width: PropTypes.oneOf(['short', 'medium', 'long']),
};

export default SkeletonText;
