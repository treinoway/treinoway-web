import { parseCurrencyBRL } from './currencyFormat';
import { formatDateForDisplay } from './dateFormat';

export const PAYMENT_STATUS = Object.freeze({
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
});

export const SUBSCRIPTION_RECURRENCE = Object.freeze({
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMIANNUAL: 'semiannual',
  ANNUAL: 'annual',
});

export const RECURRENCE_LABEL = Object.freeze({
  [SUBSCRIPTION_RECURRENCE.MONTHLY]: 'Mensal',
  [SUBSCRIPTION_RECURRENCE.QUARTERLY]: 'Trimestral',
  [SUBSCRIPTION_RECURRENCE.SEMIANNUAL]: 'Semestral',
  [SUBSCRIPTION_RECURRENCE.ANNUAL]: 'Anual',
});

export const RECURRENCE_MONTHS = Object.freeze({
  [SUBSCRIPTION_RECURRENCE.MONTHLY]: 1,
  [SUBSCRIPTION_RECURRENCE.QUARTERLY]: 3,
  [SUBSCRIPTION_RECURRENCE.SEMIANNUAL]: 6,
  [SUBSCRIPTION_RECURRENCE.ANNUAL]: 12,
});

/**
 * Return today's date as "YYYY-MM-DD" in the user's locale, never UTC.
 */
export const todayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Derive the effective payment status taking into account local "today".
 * A pending payment whose cycleEndDate (or dueDate fallback) is before today
 * is considered overdue. Cancelled subscriptions keep their explicit status.
 */
export const deriveEffectivePaymentStatus = (payment) => {
  if (!payment) return PAYMENT_STATUS.PENDING;
  if (payment.status === PAYMENT_STATUS.PAID) return PAYMENT_STATUS.PAID;
  if (payment.status === PAYMENT_STATUS.CANCELLED) return PAYMENT_STATUS.CANCELLED;
  const reference = payment.cycleEndDate || payment.dueDate;
  if (reference && reference < todayDateString()) return PAYMENT_STATUS.OVERDUE;
  return PAYMENT_STATUS.PENDING;
};

/**
 * Given a "YYYY-MM-DD" cycleStartDate and a recurrence, returns the inclusive
 * cycleEndDate (one day before next cycle start). Pure string-only logic,
 * never constructs a Date from "YYYY-MM-DD" to avoid timezone shifts.
 */
export const addMonthsToDateString = (dateString, months) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ''));
  if (!match) return dateString;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const targetMonthIndex = (month - 1) + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  // Clamp to the last day of the target month to handle e.g. Jan 31 + 1 month.
  const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  const result = new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
  return result.toISOString().slice(0, 10);
};

/**
 * Compute the discount preview for a plan or override pair. Returns the final
 * amount in number form, or null if the input is invalid. Percent takes
 * precedence over amount when both are provided (and the API should reject that).
 */
export const computeDiscountedAmount = (basePrice, { discountPercent, discountAmount }) => {
  const price = typeof basePrice === 'number' ? basePrice : Number(basePrice);
  if (!Number.isFinite(price)) return null;

  const percentRaw = discountPercent !== null && discountPercent !== undefined && discountPercent !== ''
    ? Number(discountPercent)
    : null;
  const amountRaw = discountAmount !== null && discountAmount !== undefined && discountAmount !== ''
    ? Number(discountAmount)
    : null;

  if (Number.isFinite(percentRaw) && percentRaw > 0) {
    const discounted = price - (price * percentRaw) / 100;
    return Math.max(discounted, 0);
  }
  if (Number.isFinite(amountRaw) && amountRaw > 0) {
    return Math.max(price - amountRaw, 0);
  }
  return price;
};

/**
 * Parse a user-typed currency string into a number suitable for the API payload.
 */
export const parseCurrencyForApi = (text) => {
  const value = parseCurrencyBRL(text);
  if (value === null) return null;
  return Math.round(value * 100) / 100;
};

/**
 * Format "YYYY-MM" as "Mês de YYYY" in Portuguese (e.g., "Maio de 2026").
 */
const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const formatMonthLabel = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(yearMonth || ''));
  if (!match) return yearMonth;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return yearMonth;
  return `${MONTH_NAMES_PT[monthIndex]} de ${match[1]}`;
};

export const currentYearMonth = () => todayDateString().slice(0, 7);

/**
 * Returns "YYYY-MM-DD" for the first day of the year-month string.
 */
export const firstDayOfMonth = (yearMonth) => `${yearMonth}-01`;

/**
 * Returns "YYYY-MM-DD" for the first day of the next month.
 */
export const firstDayOfNextMonth = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(yearMonth || ''));
  if (!match) return yearMonth;
  let year = Number(match[1]);
  let month = Number(match[2]) + 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

/**
 * Returns true when a "YYYY-MM-DD" date falls inside the year-month.
 */
export const isDateInYearMonth = (dateString, yearMonth) => {
  if (!dateString || !yearMonth) return false;
  return dateString.slice(0, 7) === yearMonth;
};

/**
 * Compute progress through the billing cycle as a 0–100 percentage.
 * Returns null when dates are unavailable.
 */
export const computeCyclePct = (cycleStartDate, cycleEndDate) => {
  if (!cycleStartDate || !cycleEndDate) return null;
  const today = todayDateString();
  if (today <= cycleStartDate) return 0;
  if (today >= cycleEndDate) return 100;
  const start = new Date(cycleStartDate).getTime();
  const end = new Date(cycleEndDate).getTime();
  const now = new Date(today).getTime();
  const total = end - start;
  if (total <= 0) return 100;
  return Math.round(((now - start) / total) * 100);
};

/**
 * Human-readable label for a billing cycle track.
 * Returns "Vence em Xd" / "Venceu há Xd" / "Vence hoje" / null when no ref date.
 */
export const buildCycleLabel = (effectiveStatus, payment) => {
  if (!payment) return null;
  if (effectiveStatus === PAYMENT_STATUS.PAID) {
    const date = payment.paidAt ? formatDateForDisplay(payment.paidAt.slice(0, 10)) : null;
    return date ? `Pago em ${date}` : 'Pago';
  }
  const ref = payment.cycleEndDate || payment.dueDate;
  if (!ref) return null;
  const today = todayDateString();
  const diffDays = Math.round(
    (new Date(ref).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return `Venceu há ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Vence hoje';
  return `Vence em ${diffDays}d`;
};

/**
 * Diacritic-insensitive lowercase comparison helper for search inputs.
 */
export const normalizeForSearch = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
