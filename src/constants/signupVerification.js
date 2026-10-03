export const SIGNUP_CODE_LENGTH = 6;
export const SIGNUP_RESEND_COOLDOWN_SECONDS = 60;

// The current code is dead after these errors — the only way forward is a new code.
export const SIGNUP_CODE_DEAD_MESSAGE_CODES = [
  'emailVerification.codeExpired',
  'emailVerification.tooManyAttempts',
];
