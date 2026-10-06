import { CHARGE_FILTER, HISTORY_FILTER } from '../constants/finance';
import { PAYMENT_STATUS, normalizeForSearch } from './subscriptionHelpers';

const byName = (a, b) => (a.student?.name || '').localeCompare(b.student?.name || '', 'pt-BR');

const SECTION_SORT = {
  [PAYMENT_STATUS.OVERDUE]: (a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0) || byName(a, b),
  [PAYMENT_STATUS.PENDING]: (a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') || byName(a, b),
  [PAYMENT_STATUS.PAID]: (a, b) => (b.paidAt || '').localeCompare(a.paidAt || ''),
};

/** Overview rows split into the three sections, each with its fixed sort. */
export const groupChargesByStatus = (payments) => {
  const groups = { [PAYMENT_STATUS.OVERDUE]: [], [PAYMENT_STATUS.PENDING]: [], [PAYMENT_STATUS.PAID]: [] };
  payments.forEach((payment) => groups[payment.effectiveStatus]?.push(payment));
  Object.keys(groups).forEach((status) => groups[status].sort(SECTION_SORT[status]));
  return groups;
};

/** Counting rows is fine on the client; summing amounts is not. */
export const countChargesByFilter = (groups) => ({
  [CHARGE_FILTER.ALL]: groups.overdue.length + groups.pending.length + groups.paid.length,
  [CHARGE_FILTER.OVERDUE]: groups.overdue.length,
  [CHARGE_FILTER.PENDING]: groups.pending.length,
  [CHARGE_FILTER.PAID]: groups.paid.length,
});

export const filterChargesByStudent = (payments, query) => {
  const needle = normalizeForSearch(query);
  if (!needle) return payments;
  return payments.filter((payment) => normalizeForSearch(payment.student?.name).includes(needle));
};

const HISTORY_FILTER_STATUSES = {
  [HISTORY_FILTER.OPEN]: [PAYMENT_STATUS.OVERDUE, PAYMENT_STATUS.PENDING],
  [HISTORY_FILTER.PAID]: [PAYMENT_STATUS.PAID],
  [HISTORY_FILTER.VOID]: [PAYMENT_STATUS.CANCELLED],
};

export const filterHistoryPayments = (payments, filter) => {
  const statuses = HISTORY_FILTER_STATUSES[filter];
  return statuses ? payments.filter((payment) => statuses.includes(payment.effectiveStatus)) : payments;
};

export const countHistoryByFilter = (payments) => ({
  [HISTORY_FILTER.ALL]: payments.length,
  [HISTORY_FILTER.OPEN]: filterHistoryPayments(payments, HISTORY_FILTER.OPEN).length,
  [HISTORY_FILTER.PAID]: filterHistoryPayments(payments, HISTORY_FILTER.PAID).length,
  [HISTORY_FILTER.VOID]: filterHistoryPayments(payments, HISTORY_FILTER.VOID).length,
});

/** History rows grouped by the year of `cycleStartDate`, newest year first (API order kept inside). */
export const groupPaymentsByYear = (payments) => {
  const groups = new Map();
  payments.forEach((payment) => {
    const year = (payment.cycleStartDate || '').slice(0, 4) || '—';
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(payment);
  });
  return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
};

const OPEN_STATUSES = [PAYMENT_STATUS.OVERDUE, PAYMENT_STATUS.PENDING];

/** Open charges (overdue + pending): overdue first by most days overdue, then pending by due date. */
export const sortOpenCharges = (payments) => payments
  .filter((payment) => OPEN_STATUSES.includes(payment.effectiveStatus))
  .sort((a, b) => {
    const aOverdue = a.effectiveStatus === PAYMENT_STATUS.OVERDUE;
    const bOverdue = b.effectiveStatus === PAYMENT_STATUS.OVERDUE;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (aOverdue) return (b.daysOverdue || 0) - (a.daysOverdue || 0);
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

/**
 * The charge that drives a subscription's renewal metric: its most urgent open
 * charge, else its most recent cycle. null without a subscription or charges.
 */
export const pickCurrentCharge = (payments, subscriptionId) => {
  if (!subscriptionId) return null;
  const own = payments.filter((payment) => payment.subscriptionId === subscriptionId);
  const [mostUrgent] = sortOpenCharges(own);
  if (mostUrgent) return mostUrgent;
  return [...own].sort((a, b) => (b.cycleStartDate || '').localeCompare(a.cycleStartDate || ''))[0] || null;
};
