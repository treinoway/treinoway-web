import { getExerciseTypeLabel } from '../constants/exerciseTypes';

/**
 * Builds a short meta string for an exercise template (type, sets/reps or duration, load).
 * Used in lists and cards to show type + goal at a glance.
 * @param {Object} template - Exercise template with type, sets, repetitions, duration, hasLoad, suggestedLoad
 * @returns {string|null} e.g. "Força · 4x10 · 60 kg" or "Cardio · 600s", or null if nothing to show
 */
export function formatExerciseMeta(template) {
  if (!template) return null;
  const parts = [];
  if (template.type) parts.push(getExerciseTypeLabel(template.type));
  if (template.sets != null && template.repetitions != null) {
    parts.push(`${template.sets}x${template.repetitions}`);
  } else if (template.duration != null) {
    parts.push(`${template.duration}s`);
  }
  if (template.hasLoad && template.suggestedLoad != null) {
    parts.push(`${template.suggestedLoad} kg`);
  }
  return parts.length ? parts.join(' · ') : null;
}
