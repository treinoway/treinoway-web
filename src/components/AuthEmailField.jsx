import PropTypes from 'prop-types';

const ERROR_ID = 'email-error';

// Email field for Login/Signup on DS field markup, with an optional inline error linked to the input.
const AuthEmailField = ({ value, onChange, disabled = false, error = '', required = true }) => (
  <div className="field">
    <label htmlFor="email" className="field-label type-caption-strong">E-mail</label>
    <input
      type="email"
      id="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? ERROR_ID : undefined}
      className={`input${error ? ' input--error' : ''}`}
      placeholder="voce@exemplo.com"
      autoComplete="email"
      disabled={disabled}
    />
    {error && <span id={ERROR_ID} className="field-error type-caption" role="alert">{error}</span>}
  </div>
);

AuthEmailField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  required: PropTypes.bool,
};

export default AuthEmailField;
