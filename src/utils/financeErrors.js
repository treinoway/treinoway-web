import { extractErrorInfo, t, translateError } from '../i18n';
import { FINANCE_ERROR } from '../constants/finance';

/** User-facing message for any API error (never reads response.data.message). */
export const getErrorMessage = (err) => err?.userMessage || translateError(err || {});

export const getErrorCode = (err) => extractErrorInfo(err || {}).errorCode;

const PAYMENT_INLINE_FIELD = {
  [FINANCE_ERROR.INVALID_PAID_AT]: 'paidAt',
  [FINANCE_ERROR.INVALID_AMOUNT]: 'amount',
};

/**
 * Spec §6.3 mapping for payment mutations (mark-paid, mark-pending, void,
 * PATCH). Returns how to surface the error:
 *  - `field`: show `message` inline under that field (sheet stays open);
 *  - otherwise a toast of `toastType`;
 *  - `refetch`: the UI is stale (409) and the owner must reload;
 *  - `closeSheet`: the sheet no longer makes sense.
 */
export const classifyPaymentError = (err) => {
  const code = getErrorCode(err);
  const message = getErrorMessage(err);
  if (PAYMENT_INLINE_FIELD[code]) {
    return { field: PAYMENT_INLINE_FIELD[code], message, refetch: false, closeSheet: false };
  }
  if (code === FINANCE_ERROR.CONFLICT) {
    return { toastType: 'info', message: t('finance.toast.conflict'), refetch: true, closeSheet: true };
  }
  if (code === FINANCE_ERROR.ALREADY_PAID || code === FINANCE_ERROR.PAYMENT_CANCELLED) {
    return { toastType: 'error', message, refetch: true, closeSheet: true };
  }
  return { toastType: 'error', message, refetch: false, closeSheet: false };
};

const ASSIGN_INLINE = {
  [FINANCE_ERROR.ALREADY_ACTIVE]: { field: 'form', copyKey: 'finance.assign.alreadyActive' },
  [FINANCE_ERROR.PLAN_ARCHIVED]: { field: 'plan', copyKey: 'finance.assign.planArchived' },
  [FINANCE_ERROR.STUDENT_NOT_LINKED]: { field: 'form', copyKey: 'finance.assign.notLinked' },
  [FINANCE_ERROR.BOTH_DISCOUNTS]: { field: 'discount' },
  [FINANCE_ERROR.DISCOUNT_EXCEEDS_PRICE]: { field: 'discount' },
  [FINANCE_ERROR.INVALID_AMOUNT]: { field: 'discount' },
};

/** Spec §6.3 mapping for POST /students/:id/subscriptions. Always inline. */
export const classifyAssignError = (err) => {
  const code = getErrorCode(err);
  const rule = ASSIGN_INLINE[code];
  if (!rule) return { code, field: 'form', message: getErrorMessage(err) };
  return { code, field: rule.field, message: rule.copyKey ? t(rule.copyKey) : getErrorMessage(err) };
};

const MONEY_ERROR_KEY = {
  empty: 'finance.money.required',
  invalid: 'finance.money.invalid',
  decimals: 'finance.money.decimals',
  max: 'finance.money.max',
};

/** Client-side validation copy for a `parseMoneyToCents` error code. */
export const moneyErrorMessage = (errorCode) => t(MONEY_ERROR_KEY[errorCode] || 'finance.money.invalid');
