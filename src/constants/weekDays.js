/**
 * Weekday enum and helpers for API (lowercase) and UI (pt-BR labels).
 * Values are lowercase to match the API (Postman: "monday", "wednesday", etc.).
 */

export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Options for selects: { value, label } with full day names (e.g. "Segunda-feira") */
export const WEEK_DAY_OPTIONS = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

/** Short labels for compact UI (e.g. "Seg", "Ter") */
export const WEEK_DAY_OPTIONS_SHORT = [
  { value: 'monday', label: 'Segunda' },
  { value: 'tuesday', label: 'Terça' },
  { value: 'wednesday', label: 'Quarta' },
  { value: 'thursday', label: 'Quinta' },
  { value: 'friday', label: 'Sexta' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const LABELS_BY_VALUE = Object.fromEntries(
  WEEK_DAY_OPTIONS.map((opt) => [opt.value, opt.label])
);

/**
 * Returns the pt-BR label for a weekday (accepts any case from API or form).
 * @param {string} weekDay - e.g. "monday", "MONDAY"
 * @returns {string|null} Label or null if empty/invalid
 */
export function getWeekDayLabel(weekDay) {
  if (!weekDay || typeof weekDay !== 'string') return null;
  const normalized = weekDay.toLowerCase();
  return LABELS_BY_VALUE[normalized] ?? weekDay;
}

/**
 * Normalizes weekDay to lowercase for API (e.g. "MONDAY" -> "monday").
 * @param {string} weekDay
 * @returns {string} Lowercase or empty string
 */
export function normalizeWeekDayForApi(weekDay) {
  if (!weekDay || typeof weekDay !== 'string') return '';
  return weekDay.toLowerCase();
}
