import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import useResendCooldown from './useResendCooldown';
import { EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS } from '../constants/emailVerification';

// Resends the e-mail confirmation code under one cooldown per user, following the server's wait time when it refuses.
const useEmailCodeResend = () => {
  const { user } = useAuth();
  const { remainingSeconds, isCoolingDown, startCooldown } = useResendCooldown(
    EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    user?.id ?? null,
  );
  const [resending, setResending] = useState(false);

  const resend = async () => {
    setResending(true);
    try {
      await api.post('/auth/verify-email/resend');
      startCooldown();
    } catch (error) {
      const retryAfterSeconds = Number(error.errorInfo?.details?.retryAfterSeconds);
      if (retryAfterSeconds > 0) startCooldown(retryAfterSeconds);
      throw error;
    } finally {
      setResending(false);
    }
  };

  return { resend, resending, remainingSeconds, isCoolingDown };
};

export default useEmailCodeResend;
