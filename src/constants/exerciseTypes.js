/**
 * Exercise type enum and helpers for API and UI (pt-BR labels).
 * Types: strength, cardio, mobility, stretching
 */

export const EXERCISE_TYPE_OPTIONS = [
  { value: 'strength', label: 'Força' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobility', label: 'Mobilidade' },
  { value: 'stretching', label: 'Alongamento' },
];

const LABELS_BY_VALUE = Object.fromEntries(
  EXERCISE_TYPE_OPTIONS.map((opt) => [opt.value, opt.label])
);

/**
 * Returns the pt-BR label for an exercise type.
 * @param {string} type - e.g. "strength", "cardio"
 * @returns {string} Label or the raw value if unknown
 */
export function getExerciseTypeLabel(type) {
  if (!type || typeof type !== 'string') return '-';
  const normalized = type.toLowerCase();
  return LABELS_BY_VALUE[normalized] || type;
}
