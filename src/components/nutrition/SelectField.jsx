import PropTypes from 'prop-types';

// Labelled select of the prescription (protocol, routine factor, objective) with an optional note below.
const SelectField = ({ id, label, options, value, onChange, note }) => {
  const handleChange = (event) => {
    const picked = options.find((option) => String(option.value) === event.target.value);
    onChange(picked.value);
  };

  return (
    <div className="prescription-field">
      <label className="prescription-label" htmlFor={id}>{label}</label>
      <select id={id} className="input" value={String(value)} onChange={handleChange}>
        {options.map((option) => <option key={option.value} value={String(option.value)}>{option.label}</option>)}
      </select>
      {note && <p className="prescription-note">{note}</p>}
    </div>
  );
};

SelectField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), label: PropTypes.string })).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  note: PropTypes.string,
};

export default SelectField;
