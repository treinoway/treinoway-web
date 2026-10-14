import PropTypes from 'prop-types';

const BADGE_TONES = ['success', 'warning', 'error', 'brand', 'neutral'];

const Badge = ({ tone = 'neutral', variant = 'status', children }) => (
  <span className={`badge badge--${variant} badge--${tone}`}>{children}</span>
);

Badge.propTypes = {
  tone: PropTypes.oneOf(BADGE_TONES),
  variant: PropTypes.oneOf(['status', 'tag']),
  children: PropTypes.node.isRequired,
};

export default Badge;
