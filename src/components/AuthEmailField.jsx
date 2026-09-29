import PropTypes from 'prop-types';
import { Lock } from 'lucide-react';

const LOCKED_HINT_ID = 'email-locked-hint';

// Email field for Login/Signup. When `lockedEmail` is set (invite preview),
// the field is read-only and bound to the invited address.
const AuthEmailField = ({ value, onChange, disabled = false, lockedEmail = null, hint = '' }) => {
  if (lockedEmail) {
    return (
      <div className="form-group">
        <label htmlFor="email" className="form-label">E-mail</label>
        <div className="input-locked">
          <input
            type="email"
            id="email"
            value={lockedEmail}
            readOnly
            aria-describedby={LOCKED_HINT_ID}
            className="form-input input-locked__field"
            autoComplete="email"
          />
          <Lock size={16} strokeWidth={2} className="input-locked__icon" aria-hidden="true" />
        </div>
        <span id={LOCKED_HINT_ID} className="auth-password-hint">E-mail do convite</span>
      </div>
    );
  }

  return (
    <div className="form-group">
      <label htmlFor="email" className="form-label">E-mail</label>
      <input
        type="email"
        id="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="form-input"
        placeholder="voce@exemplo.com"
        autoComplete="email"
        disabled={disabled}
      />
      {hint && <span className="auth-password-hint">{hint}</span>}
    </div>
  );
};

AuthEmailField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  lockedEmail: PropTypes.string,
  hint: PropTypes.string,
};

export default AuthEmailField;
