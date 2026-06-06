/**
 * Exercise intensity (ACSM cardio effort scale).
 *
 * Ordinal scale: very_light < light < moderate < vigorous < near_maximal.
 * Single source of truth mapping each key to its ordinal tier (1..5) so the
 * input ramp, card badge and student read-only band all read from one place.
 *
 * The displayed text comes from the API (`intensityLabel`) — never translated
 * on the client. The pt-BR fallback labels below are used only when a label is
 * not present on the payload (e.g. local draft state before a round-trip).
 */

export const EXERCISE_INTENSITY_KEYS = Object.freeze([
  'very_light',
  'light',
  'moderate',
  'vigorous',
  'near_maximal',
]);

/**
 * Ordered options for the intensity input control.
 * Labels mirror the backend categorical labels (`intensityLabel`); on display
 * surfaces (badge / student band) prefer the API-provided label when present.
 */
export const EXERCISE_INTENSITY_OPTIONS = Object.freeze([
  { value: 'very_light', label: 'Muito leve' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderada' },
  { value: 'vigorous', label: 'Vigorosa' },
  { value: 'near_maximal', label: 'Quase máxima' },
]);

const TIER_BY_KEY = Object.freeze({
  very_light: 1,
  light: 2,
  moderate: 3,
  vigorous: 4,
  near_maximal: 5,
});

const FALLBACK_LABEL_BY_KEY = Object.freeze({
  very_light: 'Muito leve',
  light: 'Leve',
  moderate: 'Moderada',
  vigorous: 'Vigorosa',
  near_maximal: 'Quase máxima',
});

/**
 * Returns the ordinal tier (1..5) for an intensity key, or null when unknown.
 * @param {string|null|undefined} key
 * @returns {number|null}
 */
export function getIntensityTier(key) {
  if (!key) return null;
  return TIER_BY_KEY[key] ?? null;
}

/**
 * Returns the pt-BR fallback label for an intensity key.
 * Prefer the API-provided `intensityLabel` whenever it exists.
 * @param {string|null|undefined} key
 * @returns {string|null}
 */
export function getIntensityFallbackLabel(key) {
  if (!key) return null;
  return FALLBACK_LABEL_BY_KEY[key] ?? null;
}
