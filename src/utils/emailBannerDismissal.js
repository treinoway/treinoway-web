import { EMAIL_BANNER_DISMISSED_KEY_PREFIX } from '../constants/emailVerification';

// Builds the sessionStorage key that records the dismissal for one user.
const dismissalKey = (userId) => `${EMAIL_BANNER_DISMISSED_KEY_PREFIX}${userId}`;

// True when this user closed the e-mail confirmation banner in the current browser session.
export const isEmailBannerDismissed = (userId) => {
  if (!userId) return false;
  try {
    return sessionStorage.getItem(dismissalKey(userId)) !== null;
  } catch {
    return false;
  }
};

// Records that this user closed the e-mail confirmation banner, for the current browser session only.
export const dismissEmailBanner = (userId) => {
  if (!userId) return;
  try {
    sessionStorage.setItem(dismissalKey(userId), '1');
  } catch {
    return;
  }
};
