import PropTypes from 'prop-types';

/**
 * Single stat chip inside the Pulse Band footstrip.
 * Renders label + value in the Athletic-Tech stadium palette.
 */
const PulseStatChip = ({ label, value, isEmpty }) => (
  <div className="pulse-stat">
    <span className={`pulse-stat-value${isEmpty ? ' pulse-stat-value--empty' : ''}`}>
      {value ?? '—'}
    </span>
    <span className="pulse-stat-label">{label}</span>
  </div>
);

PulseStatChip.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isEmpty: PropTypes.bool,
};

export default PulseStatChip;
