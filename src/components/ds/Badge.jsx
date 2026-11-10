import PropTypes from 'prop-types';

const BADGE_TONES = ['success', 'warning', 'error', 'brand', 'neutral'];

const Badge = ({ tone = 'neutral', variant = 'status', className = '', children }) => (
  <span className={`badge badge--${variant} badge--${tone}${className ? ` ${className}` : ''}`}>{children}</span>
);

Badge.propTypes = {
  tone: PropTypes.oneOf(BADGE_TONES),
  variant: PropTypes.oneOf(['status', 'tag']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default Badge;
