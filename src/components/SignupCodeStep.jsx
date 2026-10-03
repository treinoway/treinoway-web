import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { t } from '../i18n';
import {
  SIGNUP_CODE_DEAD_MESSAGE_CODES,
  SIGNUP_CODE_LENGTH,
  SIGNUP_RESEND_COOLDOWN_SECONDS,
} from '../constants/signupVerification';

const CODE_INPUT_ID = 'signup-code';
const CODE_ERROR_ID = 'signup-code-error';

const sanitizeCode = (value) => value.replace(/\D/g, '').slice(0, SIGNUP_CODE_LENGTH);

const getResendLabel = (resending, cooldown, needsNewCode) => {
  if (resending) return t('signupVerification.resending');
  const label = needsNewCode ? t('signupVerification.resendRequestNew') : t('signupVerification.resend');
  if (cooldown > 0) return `${label} (${cooldown}s)`;
  return label;
};

// Uniform copy on purpose: it must read the same whether or not the e-mail
// already has an account (anti-enumeration).
const SentNotice = ({ email }) => {
  const [before, after] = t('signupVerification.sentNotice').split('{email}');
  return (
    <p className="auth-info">
      {before}<strong>{email}</strong>{after}
    </p>
  );
};

SentNotice.propTypes = {
  email: PropTypes.string.isRequired,
};

const useResendCooldown = () => {
  const [cooldown, setCooldown] = useState(SIGNUP_RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown === 0) return undefined;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return [cooldown, () => setCooldown(SIGNUP_RESEND_COOLDOWN_SECONDS)];
};

// Code step of the signup flow. Purely presentational over the callbacks the
// page provides: `onVerify(code)` and `onResend()` resolve to `{ success, error }`.
const SignupCodeStep = ({ email, onVerify, onResend, onChangeEmail, changeEmailLabel }) => {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, restartCooldown] = useResendCooldown();
  const codeInputRef = useRef(null);

  const submitCode = async (candidate) => {
    if (verifying) return;
    if (candidate.length !== SIGNUP_CODE_LENGTH) {
      setCodeError(t('signupVerification.codeRequired'));
      return;
    }

    setError('');
    setResent(false);
    setVerifying(true);
    const result = await onVerify(candidate);
    if (result.success) return;

    setError(result.error);
    setNeedsNewCode(SIGNUP_CODE_DEAD_MESSAGE_CODES.includes(result.messageCode));
    setVerifying(false);
  };

  const handleCodeChange = (value) => {
    const nextCode = sanitizeCode(value);
    setCode(nextCode);
    setCodeError('');
    if (nextCode.length === SIGNUP_CODE_LENGTH && nextCode !== code) submitCode(nextCode);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitCode(code);
  };

  const handleResend = async () => {
    setError('');
    setResent(false);
    setResending(true);
    const result = await onResend();
    setResending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setNeedsNewCode(false);
    setCode('');
    setResent(true);
    restartCooldown();
    codeInputRef.current?.focus();
  };

  const isResendDisabled = cooldown > 0 || resending || verifying;
  const resendClassName = needsNewCode ? 'btn-primary-full' : 'auth-forgot-link';

  return (
    <>
      <h2 className="auth-heading">{t('signupVerification.title')}</h2>
      <SentNotice email={email} />

      {error && <p className="auth-error" role="alert">{error}</p>}
      {resent && <p className="auth-status" role="status">{t('signupVerification.resent')}</p>}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor={CODE_INPUT_ID} className="form-label">{t('signupVerification.codeLabel')}</label>
          <input
            ref={codeInputRef}
            type="text"
            id={CODE_INPUT_ID}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className={`form-input auth-code-input${codeError ? ' form-input--error' : ''}`}
            placeholder="000000"
            aria-invalid={Boolean(codeError)}
            aria-describedby={codeError ? CODE_ERROR_ID : undefined}
            disabled={verifying}
            autoFocus
          />
          {codeError && (
            <span id={CODE_ERROR_ID} className="form-error" role="alert">{codeError}</span>
          )}
        </div>

        {!needsNewCode && (
          <button type="submit" disabled={verifying || resending} className="btn-primary-full">
            {verifying ? t('signupVerification.submitting') : t('signupVerification.submit')}
          </button>
        )}
      </form>

      <button type="button" onClick={handleResend} disabled={isResendDisabled} className={resendClassName}>
        {getResendLabel(resending, cooldown, needsNewCode)}
      </button>

      <button type="button" onClick={onChangeEmail} disabled={verifying} className="auth-forgot-link">
        {changeEmailLabel}
      </button>
    </>
  );
};

SignupCodeStep.propTypes = {
  email: PropTypes.string.isRequired,
  onVerify: PropTypes.func.isRequired,
  onResend: PropTypes.func.isRequired,
  onChangeEmail: PropTypes.func.isRequired,
  changeEmailLabel: PropTypes.string.isRequired,
};

export default SignupCodeStep;
