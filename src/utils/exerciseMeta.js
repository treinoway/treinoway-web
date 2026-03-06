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
 * Builds a short meta string for an exercise template (type, sets/reps or duration, load).
 * Used in lists and cards to show type + goal at a glance.
 * @param {Object} template - Exercise template with type, sets, repetitions, duration, hasLoad, suggestedLoad
 * @returns {string|null} e.g. "Força · 4x10–12 · 60 kg" or "Cardio · 600s", or null if nothing to show
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
  return parts.length ? parts.join(' · ') : null;
}
