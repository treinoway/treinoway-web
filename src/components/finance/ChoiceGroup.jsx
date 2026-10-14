import PropTypes from 'prop-types';

/**
 * Single-choice option group for forms (`.chip-group` of `.chip` toggle
 * buttons with `aria-pressed`). Unlike `Segmented` (a tablist for views), this
 * is a form control, so it is a labelled `role="group"` that wraps at 375px.
 */
const ChoiceGroup = ({ labelId, ariaLabel, options, value, onChange, disabled = false }) => (
  <div className="chip-group" role="group" aria-labelledby={labelId} aria-label={labelId ? undefined : ariaLabel}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          className={`chip${active ? ' chip--active' : ''}`}
          aria-pressed={active}
          onClick={() => onChange(option.value)}
          disabled={disabled || option.disabled}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

ChoiceGroup.propTypes = {
  labelId: PropTypes.string,
  ariaLabel: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    disabled: PropTypes.bool,
  })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ChoiceGroup;
