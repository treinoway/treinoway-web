import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from './ds/Modal';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import useEmailCodeResend from '../hooks/useEmailCodeResend';
import { announceEmailVerified } from '../lib/emailVerificationGate';
import { EMAIL_VERIFICATION_CODE_LENGTH, EMAIL_VERIFICATION_REASON_AI } from '../constants/emailVerification';
import { t, tf, translateError } from '../i18n';

const TITLE_KEY_BY_REASON = { [EMAIL_VERIFICATION_REASON_AI]: 'emailVerificationModal.titleAi' };

// Keeps only the digits of the typed code, up to its length.
const sanitizeCode = (value) => value.replace(/\D/g, '').slice(0, EMAIL_VERIFICATION_CODE_LENGTH);

// Code-entry dialog that confirms the logged-in user's e-mail; `reason` names the blocked action in the title.
const EmailVerificationModal = ({ onClose, reason }) => {
  const formId = useId();
  const codeId = useId();
  const hintId = useId();
  const errorId = useId();
  const { user, updateUser } = useAuth();
  const { resend, resending, remainingSeconds, isCoolingDown } = useEmailCodeResend();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCodeChange = (value) => {
    setCode(sanitizeCode(value));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (code.length !== EMAIL_VERIFICATION_CODE_LENGTH || submitting) return;
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await api.post('/auth/verify-email', { code });
      announceEmailVerified(user?.id);
      updateUser({ ...user, emailVerified: true });
      onClose();
    } catch (requestError) {
      setError(requestError.userMessage || translateError(requestError));
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    try {
      await resend();
      setNotice(t('emailVerificationModal.resent'));
    } catch (requestError) {
      setError(requestError.userMessage || translateError(requestError));
    }
  };

  const canSubmit = code.length === EMAIL_VERIFICATION_CODE_LENGTH && !submitting;
  const resendLabel = isCoolingDown
    ? tf('emailVerificationModal.resendCooldown', { seconds: remainingSeconds })
    : t('emailVerificationModal.resend');

  const footer = (
    <>
      <button type="button" className="btn btn--ghost" onClick={handleResend} disabled={isCoolingDown || resending || submitting}>
        {resendLabel}
      </button>
      <button type="submit" form={formId} className="btn btn--primary" disabled={!canSubmit}>
        {submitting ? t('emailVerificationModal.loading') : t('emailVerificationModal.submit')}
      </button>
    </>
  );

  return (
    <Modal title={t(TITLE_KEY_BY_REASON[reason] || 'emailVerificationModal.title')} onClose={onClose} closeDisabled={submitting} footer={footer}>
      <form id={formId} onSubmit={handleSubmit} className="email-verification-form" noValidate>
        <div className="field">
          <label htmlFor={codeId} className="field-label type-caption-strong">{t('emailVerificationModal.codeLabel')}</label>
          <input
            type="text"
            id={codeId}
            value={code}
            onChange={(event) => handleCodeChange(event.target.value)}
            inputMode="numeric"
            maxLength={EMAIL_VERIFICATION_CODE_LENGTH}
            autoComplete="one-time-code"
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={error ? 'true' : undefined}
            className={`input${error ? ' input--error' : ''}`}
            placeholder="000000"
            disabled={submitting}
          />
          <span id={hintId} className="field-hint type-caption">{tf('emailVerificationModal.codeHint', { email: user?.email })}</span>
          {error && <span id={errorId} className="field-error type-caption" role="alert">{error}</span>}
        </div>
        {notice && <p className="field-hint type-caption" role="status">{notice}</p>}
      </form>
    </Modal>
  );
};

EmailVerificationModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  reason: PropTypes.string,
};

export default EmailVerificationModal;
