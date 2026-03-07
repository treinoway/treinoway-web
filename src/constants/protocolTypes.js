/**
 * Protocol type enum and helpers for API and UI (pt-BR labels).
 * Types: strength, cardio, stretching, mobility
 */

export const PROTOCOL_TYPE_OPTIONS = [
  { value: 'strength', label: 'Força' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'stretching', label: 'Alongamento' },
  { value: 'mobility', label: 'Mobilidade' },
];

const LABELS_BY_VALUE = Object.fromEntries(
  PROTOCOL_TYPE_OPTIONS.map((opt) => [opt.value, opt.label])
);

/**
 * Returns the pt-BR label for a protocol type.
 * @param {string} type - e.g. "strength", "cardio"
 * @returns {string} Label or '-' if unknown/empty
 */
export function getProtocolTypeLabel(type) {
  if (!type || typeof type !== 'string') return '-';
  const normalized = type.toLowerCase();
  return LABELS_BY_VALUE[normalized] || type;
}
