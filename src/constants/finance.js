/**
 * Fallback for copy only (popover/hints) when the API does not send
 * `overdueGraceDays`. Never used to compute a payment status — status always
 * comes from the API (`effectiveStatus`, `daysOverdue`).
 */
export const FINANCE_OVERDUE_GRACE_DAYS_FALLBACK = 3;

export const FINANCE_TAB = Object.freeze({
  CHARGES: 'charges',
  PLANS: 'plans',
});

export const CHARGE_FILTER = Object.freeze({
  ALL: 'all',
  OVERDUE: 'overdue',
  PENDING: 'pending',
  PAID: 'paid',
});

export const HISTORY_FILTER = Object.freeze({
  ALL: 'all',
  OPEN: 'open',
  PAID: 'paid',
  VOID: 'void',
});

/** window event carrying `{ overdueCount, overdueAmount }` after an overview load. */
export const FINANCE_OVERDUE_EVENT = 'treinoway:finance-overdue-changed';

export const FINANCE_SEARCH_DEBOUNCE_MS = 200;
export const FINANCE_UNDO_TOAST_MS = 5000;
export const SUBSCRIPTION_OPEN_CHARGES_LIMIT = 3;
export const SIDEBAR_BADGE_MAX = 99;

/** Backend error codes the finance UI maps to specific feedback (spec §6.3). */
export const FINANCE_ERROR = Object.freeze({
  INVALID_PAID_AT: 'SUBSCRIPTION_INVALID_PAID_AT',
  ALREADY_PAID: 'SUBSCRIPTION_PAYMENT_ALREADY_PAID',
  CONFLICT: 'SUBSCRIPTION_PAYMENT_CONFLICT',
  PAYMENT_CANCELLED: 'SUBSCRIPTION_PAYMENT_CANCELLED',
  INVALID_AMOUNT: 'SUBSCRIPTION_INVALID_AMOUNT',
  ALREADY_ACTIVE: 'SUBSCRIPTION_ALREADY_ACTIVE',
  PLAN_ARCHIVED: 'SUBSCRIPTION_PLAN_ARCHIVED',
  BOTH_DISCOUNTS: 'SUBSCRIPTION_BOTH_DISCOUNTS_SET',
  DISCOUNT_EXCEEDS_PRICE: 'SUBSCRIPTION_DISCOUNT_EXCEEDS_PRICE',
  STUDENT_NOT_LINKED: 'SUBSCRIPTION_STUDENT_NOT_LINKED',
  CANNOT_EDIT_CANCELLED: 'SUBSCRIPTION_CANNOT_EDIT_CANCELLED',
});

/** Which payment sheet / confirm dialog `usePaymentActions` has open. */
export const PAYMENT_SHEET = Object.freeze({ MARK_PAID: 'markPaid', EDIT: 'edit' });
export const PAYMENT_CONFIRM = Object.freeze({ VOID: 'void', REVERT: 'revert' });

export const ASSIGN_MODE = Object.freeze({ ASSIGN: 'assign', REPLACE: 'replace' });

export const PAYMENT_ROW_VARIANT = Object.freeze({ OVERVIEW: 'overview', HISTORY: 'history' });

/** AssignPlanSheet: when the subscription starts and which discount applies. */
export const START_MODE = Object.freeze({ TODAY: 'today', NEXT_MONTH: 'nextMonth', CUSTOM: 'custom' });
export const DISCOUNT_CHOICE = Object.freeze({ PLAN: 'plan', NONE: 'none', CUSTOM: 'custom' });
