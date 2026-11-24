import PropTypes from 'prop-types';

// One-of-many picker as chips under a caption: the chosen option is the pressed one; `disabled` locks every chip
const ChoiceChips = ({ label, options, value, onChange, disabled = false }) => (
  <div className="field">
    <span className="field-label type-caption-strong" aria-hidden="true">{label}</span>
    <div className="chip-group" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button key={String(option.value)} type="button" className={`chip${active ? ' chip--active' : ''}`} aria-pressed={active} disabled={disabled} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

ChoiceChips.propTypes = {
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.string.isRequired })).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default ChoiceChips;
