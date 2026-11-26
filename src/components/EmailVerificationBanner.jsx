import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Banner from './ds/Banner';
import EmailVerificationModal from './EmailVerificationModal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import useEmailCodeResend from '../hooks/useEmailCodeResend';
import { EMAIL_VERIFIED_EVENT } from '../constants/emailVerification';
import { dismissEmailBanner, isEmailBannerDismissed } from '../utils/emailBannerDismissal';
import { t, tf, translateError } from '../i18n';

const SUCCESS_VISIBLE_MS = 5000;

// Warning banner with the "Inserir código" / "Reenviar" actions and the code modal it opens.
const EmailVerificationNotice = ({ email, onDismiss }) => {
  const { showToast } = useToast();
  const { resend, resending, remainingSeconds, isCoolingDown } = useEmailCodeResend();
  const [modalOpen, setModalOpen] = useState(false);

  const handleResend = async () => {
    try {
      await resend();
      showToast(t('emailVerificationBanner.resent'), 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const resendLabel = isCoolingDown
    ? tf('emailVerificationBanner.resendCooldown', { seconds: remainingSeconds })
    : t('emailVerificationBanner.resend');

  const actions = (
    <div className="ds-banner__actions">
      <button type="button" className="btn btn--secondary" onClick={() => setModalOpen(true)}>
        {t('emailVerificationBanner.enterCode')}
      </button>
      <button type="button" className="btn btn--ghost" onClick={handleResend} disabled={isCoolingDown || resending}>
        {resendLabel}
      </button>
    </div>
  );

  return (
    <div className="email-verification-banner">
      <Banner tone="warning" action={actions} onDismiss={onDismiss}>
        <strong className="type-body-strong">{t('emailVerificationBanner.title')}</strong>
        <span>{tf('emailVerificationBanner.body', { email })}</span>
      </Banner>
      {modalOpen && <EmailVerificationModal onClose={() => setModalOpen(false)} />}
    </div>
  );
};

EmailVerificationNotice.propTypes = {
  email: PropTypes.string,
  onDismiss: PropTypes.func.isRequired,
};

// Non-blocking "confirme seu e-mail" banner for an unverified user; shows a short success state after a code is confirmed here.
const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const [dismissedUserId, setDismissedUserId] = useState(null);
  const [successUserId, setSuccessUserId] = useState(null);

  useEffect(() => {
    const handleVerified = (event) => setSuccessUserId(event.detail?.userId ?? null);
    window.addEventListener(EMAIL_VERIFIED_EVENT, handleVerified);
    return () => window.removeEventListener(EMAIL_VERIFIED_EVENT, handleVerified);
  }, []);

  useEffect(() => {
    if (!successUserId) return undefined;
    const timer = setTimeout(() => setSuccessUserId(null), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [successUserId]);

  if (!user) return null;

  if (successUserId === user.id) {
    return (
      <div className="email-verification-banner">
        <Banner tone="success">{t('emailVerificationBanner.success')}</Banner>
      </div>
    );
  }

  const isDismissed = dismissedUserId === user.id || isEmailBannerDismissed(user.id);
  if (user.emailVerified !== false || isDismissed) return null;

  const handleDismiss = () => {
    dismissEmailBanner(user.id);
    setDismissedUserId(user.id);
  };

  return <EmailVerificationNotice email={user.email} onDismiss={handleDismiss} />;
};

export default EmailVerificationBanner;
