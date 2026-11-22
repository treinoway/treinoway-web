import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff } from 'lucide-react';

// Password input on DS field markup with a show/hide icon button, optional hint and inline error.
const PasswordField = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  autoComplete = 'current-password',
  disabled = false,
  required = false,
  error = '',
  hint = '',
  showLabel = 'Mostrar senha',
  hideLabel = 'Ocultar senha',
}) => {
  const [visible, setVisible] = useState(false);
  const errorId = useId();
  const hintId = useId();
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  const toggleLabel = visible ? hideLabel : showLabel;
  const ToggleIcon = visible ? EyeOff : Eye;

  return (
    <div className="field">
      <label htmlFor={id} className="field-label type-caption-strong">{label}</label>
      <div className="input-reveal">
        <input
          type={visible ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`input input-reveal__input${error ? ' input--error' : ''}`}
          placeholder="••••••••"
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          className="icon-button input-reveal__toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <ToggleIcon size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {error && <span id={errorId} className="field-error type-caption" role="alert">{error}</span>}
      {hint && <span id={hintId} className="field-hint type-caption">{hint}</span>}
    </div>
  );
};

PasswordField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onBlur: PropTypes.func,
  autoComplete: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  showLabel: PropTypes.string,
  hideLabel: PropTypes.string,
};

export default PasswordField;
