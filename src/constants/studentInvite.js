export const StudentInviteStatus = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
});

export const StudentInviteOutcome = Object.freeze({
  LINKED: 'linked',
  INVITED: 'invited',
});

export const StudentInviteMessageCode = Object.freeze({
  ALREADY_PENDING: 'studentInvite.alreadyPending',
  RESEND_COOLDOWN: 'studentInvite.resendCooldown',
  DAILY_LIMIT: 'studentInvite.dailyLimit',
});

// UI state of the resend action, derived only from the server's canResend/resendAvailableAt.
export const ResendAvailability = Object.freeze({
  AVAILABLE: 'available',
  COOLDOWN: 'cooldown',
  LIMIT_REACHED: 'limitReached',
  UNAVAILABLE: 'unavailable',
});

export const STUDENT_INVITE_FILTER_ALL = 'all';

export const STUDENT_INVITE_STATUS_FILTERS = Object.freeze([
  STUDENT_INVITE_FILTER_ALL,
  StudentInviteStatus.PENDING,
  StudentInviteStatus.ACCEPTED,
  StudentInviteStatus.EXPIRED,
  StudentInviteStatus.REVOKED,
]);

export const STUDENT_INVITE_BADGE_TONE = Object.freeze({
  [StudentInviteStatus.PENDING]: 'warning',
  [StudentInviteStatus.ACCEPTED]: 'success',
  [StudentInviteStatus.EXPIRED]: 'neutral',
  [StudentInviteStatus.REVOKED]: 'error',
});

// How often the invites list re-renders while a resend cooldown countdown is visible.
export const STUDENT_INVITE_COUNTDOWN_TICK_MS = 30 * 1000;
export const STUDENT_INVITE_PAGE_SIZE = 20;
