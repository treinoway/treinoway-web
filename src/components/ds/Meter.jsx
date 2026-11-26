import PropTypes from 'prop-types';

const METER_TONES = ['neutral', 'success', 'warning', 'danger'];
const METER_MAX = 100;

// Value as a percentage of the bar, kept within 0-100; a missing value fills nothing
const fillPercentOf = (value) => (typeof value === 'number' ? Math.min(METER_MAX, Math.max(0, value)) : 0);

/** Read-only 0-100 bar (`.meter`) announced through its label; the tone colors the filled part. Presentation only. */
const Meter = ({ value, label, tone = 'neutral', className = '' }) => (
  <span className={`meter meter--${tone}${className ? ` ${className}` : ''}`} role="img" aria-label={label}>
    <span className="meter__fill" style={{ width: `${fillPercentOf(value)}%` }} />
  </span>
);

Meter.propTypes = {
  value: PropTypes.number,
  label: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(METER_TONES),
  className: PropTypes.string,
};

export default Meter;
