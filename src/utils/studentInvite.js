import { t } from '../i18n';
import { StudentInviteStatus, ResendAvailability } from '../constants/studentInvite';

const MS_PER_MINUTE = 60 * 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const EXPIRY_VISIBLE_STATUSES = [StudentInviteStatus.PENDING, StudentInviteStatus.EXPIRED];

export const canRevokeInvite = (invite) => invite.status === StudentInviteStatus.PENDING;

export const showsInviteExpiry = (invite) => EXPIRY_VISIBLE_STATUSES.includes(invite.status);

const minutesUntil = (isoValue, now) => {
  const targetMs = new Date(isoValue).getTime();
  if (Number.isNaN(targetMs)) return 0;
  const remainingMs = targetMs - now;
  return remainingMs > 0 ? Math.ceil(remainingMs / MS_PER_MINUTE) : 0;
};

/**
 * Resend action state, driven only by the server-computed `canResend` / `resendAvailableAt`.
 * A non-null `resendAvailableAt` means the cooldown is the only blocker, so once that
 * instant passes on the client the action becomes available without a reload.
 * A pending invite with neither field set has hit the send limit; any other status
 * (accepted, revoked, stored-expired) simply cannot be resent.
 */
export const getResendAvailability = (invite, now = Date.now()) => {
  if (invite.canResend) return { state: ResendAvailability.AVAILABLE, minutes: 0 };
  if (invite.resendAvailableAt) {
    const minutes = minutesUntil(invite.resendAvailableAt, now);
    const state = minutes > 0 ? ResendAvailability.COOLDOWN : ResendAvailability.AVAILABLE;
    return { state, minutes };
  }
  if (invite.status === StudentInviteStatus.PENDING) {
    return { state: ResendAvailability.LIMIT_REACHED, minutes: 0 };
  }
  return { state: ResendAvailability.UNAVAILABLE, minutes: 0 };
};

export const hasResendCountdown = (invite) => !invite.canResend && Boolean(invite.resendAvailableAt);

/**
 * Rounds a backend `retryAfterSeconds` up to whole minutes (minimum 1).
 */
export const retryAfterSecondsToMinutes = (seconds) =>
  Math.max(1, Math.ceil(Number(seconds) / SECONDS_PER_MINUTE));

/**
 * Formats a backend `retryAfterSeconds` as a short duration ("2 h 15 min", "3 h", "40 min").
 */
export const formatRetryAfterDuration = (seconds) => {
  const totalMinutes = retryAfterSecondsToMinutes(seconds);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return t('studentInvites.durationMinutes').replace('{minutes}', minutes);
  if (minutes === 0) return t('studentInvites.durationHours').replace('{hours}', hours);
  return t('studentInvites.durationHoursMinutes')
    .replace('{hours}', hours)
    .replace('{minutes}', minutes);
};

/**
 * Pluralized send count label ("1 envio", "3 envios").
 */
export const formatSendCount = (count) => {
  const safeCount = Number(count) || 0;
  const key = safeCount === 1 ? 'studentInvites.sendsOne' : 'studentInvites.sendsOther';
  return t(key).replace('{count}', safeCount);
};

/**
 * Formats an invite timestamp as a local date (dd/mm/yyyy). Returns '-' when missing/invalid.
 */
export const formatInviteDate = (isoValue) => {
  if (!isoValue) return '-';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};
