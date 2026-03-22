import { getExerciseTypeLabel } from '../constants/exerciseTypes';

/**
 * Formats repetitions range from a { min, max } object.
 * Returns "min–max" when different, or just "N" when min === max.
 * @param {{ min: number, max: number }|null|undefined} repetitions
 * @returns {string|null}
 */
export function formatRepetitions(repetitions) {
  if (repetitions == null) return null;
  if (repetitions.min === repetitions.max) return String(repetitions.min);
  return `${repetitions.min}–${repetitions.max}`;
}

/**
 * Formats a rest interval in seconds to a human-readable string.
 * Returns null for null/undefined/0 values (only positive values are displayed).
 * @param {number|null|undefined} seconds
 * @returns {string|null} e.g. "Descanso: 1min 30s", "Descanso: 30s", or null
 */
export function formatRestInterval(seconds) {
  if (seconds == null || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  let formatted;
  if (minutes === 0) {
    formatted = `${remaining}s`;
  } else if (remaining === 0) {
    formatted = `${minutes}min`;
  } else {
    formatted = `${minutes}min ${remaining}s`;
  }
  return `Descanso: ${formatted}`;
}

/**
 * Builds a short meta string for an exercise template (type, sets/reps or duration, load, rest).
 * Used in lists and cards to show type + goal at a glance.
 * @param {Object} template - Exercise template with type, sets, repetitions, duration, hasLoad, suggestedLoad, restInterval
 * @returns {string|null} e.g. "Força · 4x10–12 · 60 kg · Descanso: 1min 30s" or "Cardio · 600s", or null if nothing to show
 */
export function formatExerciseMeta(template) {
  if (!template) return null;
  const parts = [];
  if (template.type) parts.push(getExerciseTypeLabel(template.type));
  const repsLabel = formatRepetitions(template.repetitions);
  if (template.sets != null && repsLabel != null) {
    parts.push(`${template.sets}x${repsLabel}`);
  } else if (template.duration != null) {
    parts.push(`${template.duration}s`);
  }
  if (template.hasLoad && template.suggestedLoad != null) {
    parts.push(`${template.suggestedLoad} kg`);
  }
  const restLabel = formatRestInterval(template.restInterval);
  if (restLabel) {
    parts.push(restLabel);
  }
  return parts.length ? parts.join(' · ') : null;
}
