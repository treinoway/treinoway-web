/**
 * Finance helpers. Two hard rules:
 *  - Money math runs in integer cents only (never float multiplication), so the
 *    previews match the backend's half-up rounding to the cent.
 *  - "Today" and timestamps are read in the business timezone
 *    (America/Sao_Paulo); date-only API fields ("YYYY-MM-DD") are handled as
 *    strings and never go through `new Date()`.
 * Payment status is never derived here — it always comes from the API.
 */

export const BUSINESS_TIMEZONE = 'America/Sao_Paulo';

export const PAYMENT_STATUS = Object.freeze({
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
});

export const SUBSCRIPTION_RECURRENCE = Object.freeze({
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  SEMIANNUAL: 'semiannual',
  ANNUAL: 'annual',
});

export const RECURRENCE_OPTIONS = Object.freeze([
  SUBSCRIPTION_RECURRENCE.MONTHLY,
  SUBSCRIPTION_RECURRENCE.QUARTERLY,
  SUBSCRIPTION_RECURRENCE.SEMIANNUAL,
  SUBSCRIPTION_RECURRENCE.ANNUAL,
]);

export const RECURRENCE_LABEL = Object.freeze({
  [SUBSCRIPTION_RECURRENCE.MONTHLY]: 'Mensal',
  [SUBSCRIPTION_RECURRENCE.QUARTERLY]: 'Trimestral',
  [SUBSCRIPTION_RECURRENCE.SEMIANNUAL]: 'Semestral',
  [SUBSCRIPTION_RECURRENCE.ANNUAL]: 'Anual',
});

export const RECURRENCE_PERIOD_LABEL = Object.freeze({
  [SUBSCRIPTION_RECURRENCE.MONTHLY]: 'por mês',
  [SUBSCRIPTION_RECURRENCE.QUARTERLY]: 'a cada 3 meses',
  [SUBSCRIPTION_RECURRENCE.SEMIANNUAL]: 'a cada 6 meses',
  [SUBSCRIPTION_RECURRENCE.ANNUAL]: 'por ano',
});

/* ─── Money (integer cents) ─────────────────────────────────────────────── */

export const MAX_MONEY_CENTS = 9_999_999_999;
export const MAX_PERCENT_HUNDREDTHS = 10_000;

export const MONEY_ERROR = Object.freeze({
  EMPTY: 'empty',
  INVALID: 'invalid',
  DECIMALS: 'decimals',
  MAX: 'max',
});

const THOUSANDS_DOT_PATTERN = /^\d{1,3}(\.\d{3})+$/;

const splitMoneyText = (text) => {
  if (text.includes(',')) {
    const [integerPart, ...rest] = text.split(',');
    if (rest.length !== 1) return null;
    return { integerPart: integerPart.replace(/\./g, ''), fractionPart: rest[0] };
  }
  if (THOUSANDS_DOT_PATTERN.test(text)) return { integerPart: text.replace(/\./g, ''), fractionPart: '' };
  const parts = text.split('.');
  if (parts.length > 2) return null;
  return { integerPart: parts[0], fractionPart: parts[1] ?? '' };
};

/**
 * Parse "1.234,56", "1234,56", "1234.56" (also API strings like "99.90")
 * into integer cents without parseFloat. Returns `{ cents, error }`.
 */
export const parseMoneyToCents = (rawText) => {
  const text = String(rawText ?? '').replace(/\s/g, '').replace(/^R\$/i, '');
  if (text === '') return { cents: null, error: MONEY_ERROR.EMPTY };

  const split = splitMoneyText(text);
  if (!split) return { cents: null, error: MONEY_ERROR.INVALID };
  const { integerPart, fractionPart } = split;
  if (!/^\d*$/.test(integerPart) || !/^\d*$/.test(fractionPart)) return { cents: null, error: MONEY_ERROR.INVALID };
  if (integerPart === '' && fractionPart === '') return { cents: null, error: MONEY_ERROR.INVALID };
  if (fractionPart.length > 2) return { cents: null, error: MONEY_ERROR.DECIMALS };
  if (integerPart.replace(/^0+/, '').length > 8) return { cents: null, error: MONEY_ERROR.MAX };

  const cents = Number(integerPart || '0') * 100 + Number(fractionPart.padEnd(2, '0'));
  if (cents > MAX_MONEY_CENTS) return { cents: null, error: MONEY_ERROR.MAX };
  return { cents, error: null };
};

/** API money string ("99.90") → integer cents, or null when missing/invalid. */
export const toCents = (apiValue) => {
  if (apiValue === null || apiValue === undefined || apiValue === '') return null;
  return parseMoneyToCents(String(apiValue)).cents;
};

/**
 * Percent text ("33,33" / "33.33") → integer hundredths (3333). Rejects more
 * than 2 decimals and values outside 0–100.
 */
export const parsePercentToHundredths = (rawText) => {
  const { cents, error } = parseMoneyToCents(rawText);
  if (error) return { hundredths: null, error };
  if (cents > MAX_PERCENT_HUNDREDTHS) return { hundredths: null, error: MONEY_ERROR.MAX };
  return { hundredths: cents, error: null };
};

/**
 * Net cents with backend parity (half-up, 2 decimals):
 *  percent B (hundredths): floor((P × (10000 − B) + 5000) / 10000)
 *  amount A (cents): max(P − A, 0)
 * P × 10000 ≤ 1e14 < 2^53, so the math is exact in JS numbers.
 */
export const computeNetAmountCents = (priceCents, { percentHundredths = null, discountCents = null } = {}) => {
  if (priceCents === null || priceCents === undefined) return null;
  if (percentHundredths !== null && percentHundredths !== undefined) {
    return Math.floor((priceCents * (MAX_PERCENT_HUNDREDTHS - percentHundredths) + 5000) / MAX_PERCENT_HUNDREDTHS);
  }
  if (discountCents !== null && discountCents !== undefined) return Math.max(priceCents - discountCents, 0);
  return priceCents;
};

/** Net cents for an API entity carrying price/discountPercent/discountAmount strings. */
export const computeNetFromApi = ({ price, discountPercent, discountAmount }) => computeNetAmountCents(toCents(price), {
  percentHundredths: toCents(discountPercent),
  discountCents: toCents(discountAmount),
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const amountFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** Display a single cents value as "R$ 99,90" (never used to sum). */
export const formatCentsBRL = (cents) => {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  return currencyFormatter.format(cents / 100);
};

/** Display a single cents value without the currency symbol ("1.234,56"). */
export const formatCentsAmount = (cents) => {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return '—';
  return amountFormatter.format(cents / 100);
};

/** Display a single API money string as "R$ 99,90". */
export const formatMoneyBRL = (apiValue) => formatCentsBRL(toCents(apiValue));

/** Prefill text for a money input ("99,90"); "" when missing. */
export const formatCentsForInput = (cents) => (cents === null || cents === undefined ? '' : formatCentsAmount(cents));

/** Hundredths → "33,33". */
export const formatPercentHundredths = (hundredths) => percentFormatter.format(hundredths / 100);

/** Discount line "R$ 99,90 − 33,33%" / "R$ 99,90 − R$ 10,00"; null without discount. */
export const formatDiscountLine = (priceCents, { percentHundredths = null, discountCents = null } = {}) => {
  if (priceCents === null || priceCents === undefined) return null;
  if (percentHundredths) return `${formatCentsBRL(priceCents)} − ${formatPercentHundredths(percentHundredths)}%`;
  if (discountCents) return `${formatCentsBRL(priceCents)} − ${formatCentsBRL(discountCents)}`;
  return null;
};

/** Payload value for the API: exact cents → number with 2 decimals. */
export const centsToApiNumber = (cents) => (cents === null || cents === undefined ? null : cents / 100);

/** Hundredths → payload percent number (3333 → 33.33). */
export const hundredthsToApiNumber = (hundredths) => (hundredths === null || hundredths === undefined ? null : hundredths / 100);

/** "13.33" / 13.33 → "13,3" (at most 1 decimal). */
export const formatDelinquencyRate = (rate) => {
  const value = Number(rate);
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
};

/* ─── Dates (business timezone) ─────────────────────────────────────────── */

const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today in São Paulo as "YYYY-MM-DD", whatever the device timezone. */
export const todayDateString = (now = new Date()) => businessDateFormatter.format(now);

export const currentYearMonth = (now = new Date()) => todayDateString(now).slice(0, 7);

/** ISO timestamp → São Paulo calendar date "YYYY-MM-DD" (null when invalid). */
export const timestampToBusinessDate = (isoTimestamp) => {
  if (!isoTimestamp) return null;
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return businessDateFormatter.format(parsed);
};

/**
 * "YYYY-MM-DD" → "DD/MM", or "DD/MM/AAAA" when the year differs from the
 * current (São Paulo) year. "—" for missing/invalid input.
 */
export const formatShortDate = (dateOnly, today = todayDateString()) => {
  const match = DATE_ONLY_PATTERN.exec(String(dateOnly || ''));
  if (!match) return '—';
  const [, year, month, day] = match;
  return year === today.slice(0, 4) ? `${day}/${month}` : `${day}/${month}/${year}`;
};

/** "YYYY-MM-DD" → "DD/MM/AAAA"; "—" when invalid. */
export const formatFullDate = (dateOnly) => {
  const match = DATE_ONLY_PATTERN.exec(String(dateOnly || ''));
  if (!match) return '—';
  return `${match[3]}/${match[2]}/${match[1]}`;
};

/** paidAt (ISO timestamp) → short date in São Paulo time (B5). */
export const formatPaidAtDate = (isoTimestamp, today = todayDateString()) =>
  formatShortDate(timestampToBusinessDate(isoTimestamp), today);

/** Cycle "01/10 – 31/10/2026" (start year shown only when it differs from the end year). */
export const formatCyclePeriod = (startDate, endDate) => {
  const start = DATE_ONLY_PATTERN.exec(String(startDate || ''));
  const end = DATE_ONLY_PATTERN.exec(String(endDate || ''));
  if (!start || !end) return '—';
  const startText = start[1] === end[1] ? `${start[3]}/${start[2]}` : formatFullDate(startDate);
  return `${startText} – ${formatFullDate(endDate)}`;
};

const RECURRENCE_MONTHS = Object.freeze({
  [SUBSCRIPTION_RECURRENCE.MONTHLY]: 1,
  [SUBSCRIPTION_RECURRENCE.QUARTERLY]: 3,
  [SUBSCRIPTION_RECURRENCE.SEMIANNUAL]: 6,
  [SUBSCRIPTION_RECURRENCE.ANNUAL]: 12,
});

/** Days in a month (UTC calendar; monthIndex may overflow/underflow the year). */
const daysInMonth = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** Y/M/D parts → "YYYY-MM-DD" (UTC, day may overflow/underflow). */
const toDateOnly = (year, monthIndex, day) => new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

/** Start of the cycle in `baseMonthIndex + offsetMonths`: min(day, month length), never drifting from the base. */
const clampedMonthStart = (year, baseMonthIndex, offsetMonths, day) => {
  const target = new Date(Date.UTC(year, baseMonthIndex + offsetMonths, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth();
  return { year: targetYear, monthIndex: targetMonth, day: Math.min(day, daysInMonth(targetYear, targetMonth)) };
};

/**
 * First cycle of a new subscription, mirroring the backend billing-day rule.
 * @param {string} startDate "YYYY-MM-DD"; with a billing day the grid aligns to it, otherwise it anchors here.
 * @param {number|null} billingDay 1–31 or null.
 * @param {string} recurrence monthly | quarterly | semiannual | annual.
 * @returns {{cycleStartDate: string, cycleEndDate: string, dueDate: string}} dueDate = max(cycleStartDate, startDate).
 */
export const computeFirstCycle = (startDate, billingDay, recurrence) => {
  const [year, month, day] = String(startDate).split('-').map(Number);
  const monthIndex = month - 1;
  const months = RECURRENCE_MONTHS[recurrence] ?? 1;
  const anchorDay = billingDay ?? day;
  const startsBeforeBillingDay = billingDay != null && day < Math.min(billingDay, daysInMonth(year, monthIndex));
  const baseOffset = startsBeforeBillingDay ? -1 : 0;
  const start = clampedMonthStart(year, monthIndex, baseOffset, anchorDay);
  const next = clampedMonthStart(year, monthIndex, baseOffset + months, anchorDay);
  const cycleStartDate = toDateOnly(start.year, start.monthIndex, start.day);
  return {
    cycleStartDate,
    cycleEndDate: toDateOnly(next.year, next.monthIndex, next.day - 1),
    dueDate: cycleStartDate > startDate ? cycleStartDate : startDate,
  };
};

/** Day after the first cycle ends = start of the next cycle = the next due date. */
export const computeNextDueDate = ({ cycleEndDate }) => {
  const [year, month, day] = cycleEndDate.split('-').map(Number);
  return toDateOnly(year, month - 1, day + 1);
};

const SHORT_MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const LONG_MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** "2026-01-31" → "jan/2026"; "—" when invalid. */
export const formatMonthYearShort = (dateOnly) => {
  const match = DATE_ONLY_PATTERN.exec(String(dateOnly || ''));
  if (!match) return '—';
  return `${SHORT_MONTHS_PT[Number(match[2]) - 1]}/${match[1]}`;
};

const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const isValidYearMonth = (yearMonth) => YEAR_MONTH_PATTERN.test(String(yearMonth || ''));

/** "2026-10" → "outubro de 2026". */
export const formatMonthLabel = (yearMonth) => {
  const match = YEAR_MONTH_PATTERN.exec(String(yearMonth || ''));
  if (!match) return yearMonth;
  return `${LONG_MONTHS_PT[Number(match[2]) - 1]} de ${match[1]}`;
};

/** "2026-10" → "outubro". */
export const formatMonthName = (yearMonth) => {
  const match = YEAR_MONTH_PATTERN.exec(String(yearMonth || ''));
  return match ? LONG_MONTHS_PT[Number(match[2]) - 1] : yearMonth;
};

/** Shift "YYYY-MM" by whole months. */
export const shiftYearMonth = (yearMonth, offset) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const monthIndex = year * 12 + (month - 1) + offset;
  const nextYear = Math.floor(monthIndex / 12);
  const nextMonth = (monthIndex % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
};

/** "YYYY-MM-DD" of the first day of the month after `yearMonth`. */
export const firstDayOfNextMonth = (yearMonth) => `${shiftYearMonth(yearMonth, 1)}-01`;

/**
 * Diacritic-insensitive lowercase comparison helper for search inputs.
 */
export const normalizeForSearch = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
