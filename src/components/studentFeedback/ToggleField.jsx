import PropTypes from 'prop-types';
import Toggle from '../ds/Toggle';

// One on/off setting: its name, what it does and the switch; `children` is an extra control shown between the text and the switch; `disabled` locks the switch
const ToggleField = ({ id, label, description, checked, onChange, disabled = false, children }) => (
  <div className={`student-feedback-setting${children ? ' student-feedback-setting--with-select' : ''}`}>
    <div className="student-feedback-setting__text">
      <span className="type-body-strong">{label}</span>
      <span id={id} className="type-caption student-feedback-setting__description">{description}</span>
    </div>
    {children}
    <Toggle checked={checked} onChange={onChange} label={label} describedBy={id} disabled={disabled} />
  </div>
);

ToggleField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  children: PropTypes.node,
};

export default ToggleField;
