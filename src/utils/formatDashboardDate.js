const MONTHS_PT_BR_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/**
 * Returns true when the candidate Date falls on the same calendar day as
 * the reference Date (in the local timezone).
 */
const isSameLocalDay = (candidate, reference) =>
  candidate.getFullYear() === reference.getFullYear()
  && candidate.getMonth() === reference.getMonth()
  && candidate.getDate() === reference.getDate();

const padTwo = (value) => String(value).padStart(2, '0');

/**
 * Formats the "Última sessão" timestamp following refined-design rule: same-day
 * uses "hoje, HH:mm"; older sessions use "DD de mes" (abbreviated month, lowercase).
 *
 * @param {string|Date|null|undefined} value — ISO timestamp or Date instance.
 * @param {Date} [now] — injected for tests.
 * @returns {string} formatted string or "-" for null/invalid input.
 */
export const formatLastSessionAt = (value, now = new Date()) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  if (isSameLocalDay(date, now)) {
    return `hoje, ${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
  }
  const day = date.getDate();
  const month = MONTHS_PT_BR_SHORT[date.getMonth()];
  return `${day} de ${month}`;
};

/**
 * Formats a window range as "1 de mar – 30 de mar" (no year, ptBR short months)
 * for the period chip subtitle.
 */
export const formatPeriodRangeShort = (from, to) => {
  if (!from || !to) return '';
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return '';
  return `${fromDate.getDate()} de ${MONTHS_PT_BR_SHORT[fromDate.getMonth()]} – ${toDate.getDate()} de ${MONTHS_PT_BR_SHORT[toDate.getMonth()]}`;
};

/**
 * Formats a date as "12 de mar" (no year) for the trend anchor copy.
 */
export const formatDayMonthShort = (value) => {
  if (!value) return '';
  const dateOnly = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : (value instanceof Date ? value : new Date(value));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} de ${MONTHS_PT_BR_SHORT[date.getMonth()]}`;
};

/**
 * Converts a YYYY-MM-DD string from a date input into an ISO timestamp at midnight UTC.
 * Returns null for empty/invalid input.
 */
export const dateInputToIso = (input) => {
  if (!input) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month}-${day}T00:00:00.000Z`;
};

/**
 * Converts an ISO timestamp into a YYYY-MM-DD string for `<input type="date">` controls.
 */
export const isoToDateInput = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = padTwo(date.getUTCMonth() + 1);
  const day = padTwo(date.getUTCDate());
  return `${year}-${month}-${day}`;
};
