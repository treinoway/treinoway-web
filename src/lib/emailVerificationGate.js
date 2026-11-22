import {
  EMAIL_VERIFICATION_REASON_AI,
  EMAIL_VERIFICATION_REQUIRED_CODE,
  EMAIL_VERIFICATION_REQUIRED_EVENT,
  EMAIL_VERIFIED_EVENT,
} from '../constants/emailVerification';

const AI_URL_PATTERN = /\/ai(\/|\?|$)/;

// True when the API refused the request until the user confirms the e-mail.
export const isEmailVerificationRequired = (error) => {
  const messageCode = error?.errorInfo?.messageCode ?? error?.response?.data?.messageCode;
  return messageCode === EMAIL_VERIFICATION_REQUIRED_CODE;
};

// Returns the blocked-action reason for a request URL ('ai' for AI endpoints, undefined otherwise).
export const getEmailVerificationReason = (url) => (
  AI_URL_PATTERN.test(url || '') ? EMAIL_VERIFICATION_REASON_AI : undefined
);

// Tells the app shell that a request was blocked, so it opens the confirmation modal.
export const announceEmailVerificationRequired = (reason) => {
  if (typeof window === 'undefined') return;
  const detail = reason ? { reason } : {};
  window.dispatchEvent(new CustomEvent(EMAIL_VERIFICATION_REQUIRED_EVENT, { detail }));
};

// Tells the app shell that this user just confirmed the e-mail with a code in this session.
export const announceEmailVerified = (userId) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EMAIL_VERIFIED_EVENT, { detail: { userId } }));
};
