/**
 * Gender ordination enum and helpers for API and UI (pt-BR labels).
 * Values: male, female, other
 */

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other', label: 'Outro' },
];

const LABELS_BY_VALUE = Object.fromEntries(
  GENDER_OPTIONS.map((opt) => [opt.value, opt.label])
);

/**
 * Returns the pt-BR label for a gender ordination value.
 * @param {string} gender - e.g. "male", "female", "other"
 * @returns {string} Label or '-' if unknown/empty
 */
export function getGenderLabel(gender) {
  if (!gender || typeof gender !== 'string') return '-';
  const normalized = gender.toLowerCase();
  return LABELS_BY_VALUE[normalized] || gender;
}
