import { useId } from 'react';
import PropTypes from 'prop-types';
import FieldError from './FieldError';

/** Optional "Dia de vencimento" number input (1–31) with a hint and inline error. */
const BillingDayField = ({ label, hint, value, error, disabled, onChange }) => {
  const fieldId = useId();
  return (
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        step={1}
        className={`input${error ? ' input--error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value, e.target.validity.badInput)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={`${fieldId}-hint`}
      />
      <span id={`${fieldId}-hint`} className="field-hint type-caption">{hint}</span>
      <FieldError message={error} />
    </div>
  );
};

BillingDayField.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  error: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default BillingDayField;
