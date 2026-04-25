/**
 * Training level enum and helpers for API and UI (pt-BR labels).
 * Levels: beginner, intermediate, advanced, athlete
 */

export const TRAINING_LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermediário' },
  { value: 'advanced', label: 'Avançado' },
  { value: 'athlete', label: 'Atleta' },
];

const LABELS_BY_VALUE = Object.fromEntries(
  TRAINING_LEVEL_OPTIONS.map((opt) => [opt.value, opt.label])
);

/**
 * Returns the pt-BR label for a training level.
 * @param {string} level - e.g. "beginner", "advanced"
 * @returns {string} Label or '-' if unknown/empty
 */
export function getLevelLabel(level) {
  if (!level || typeof level !== 'string') return '-';
  const normalized = level.toLowerCase();
  return LABELS_BY_VALUE[normalized] || level;
}
