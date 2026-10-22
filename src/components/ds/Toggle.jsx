import PropTypes from 'prop-types';

/** Switch (SKILL §4.7). Always pass an accessible name through `label`. */
const Toggle = ({ checked, onChange, label, describedBy, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    aria-describedby={describedBy}
    disabled={disabled}
    className={`toggle${checked ? ' toggle--on' : ''}`}
    onClick={() => onChange(!checked)}
  >
    <span className="toggle__thumb" aria-hidden="true" />
  </button>
);

Toggle.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  describedBy: PropTypes.string,
  disabled: PropTypes.bool,
};

export default Toggle;
