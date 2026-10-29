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
 * Formats a rest duration in seconds ("1min 30s", "30s"); null for non-positive values.
 * @param {number|null|undefined} seconds
 * @returns {string|null}
 */
export function formatRestDuration(seconds) {
  if (seconds == null || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return `${remaining}s`;
  if (remaining === 0) return `${minutes}min`;
  return `${minutes}min ${remaining}s`;
}

/**
 * Formats a rest interval in seconds to a human-readable string.
 * Returns null for null/undefined/0 values (only positive values are displayed).
 * @param {number|null|undefined} seconds
 * @returns {string|null} e.g. "Descanso: 1min 30s", "Descanso: 30s", or null
 */
export function formatRestInterval(seconds) {
  const duration = formatRestDuration(seconds);
  return duration ? `Descanso: ${duration}` : null;
}

/**
 * Builds a short meta string for an entity that carries prescription (a real
 * `Exercise` or a training-template junction snapshot). Library exercise
 * templates are identity-only and no longer carry prescription — do NOT use
 * this for them.
 * Uses `prescriptionMode` when available; falls back to a field-presence
 * heuristic. Missing prescription fields are tolerated: returns just the type
 * label, or null when nothing is present.
 * @param {{ hideRest?: boolean }} [options] - `hideRest` omits the rest interval (bi-set members share the round rest)
 * @param {Object} template - Exercise/junction snapshot with prescriptionMode, type, sets, repetitions, duration, hasLoad, suggestedLoad, restInterval
 * @returns {string|null} e.g. "Força · 4x10–12 · 60 kg · Descanso: 1min 30s" or "45 seg", or null if nothing to show
 */
export function formatExerciseMeta(template, { hideRest = false } = {}) {
  if (!template) return null;
  const parts = [];
  if (template.type) parts.push(getExerciseTypeLabel(template.type));

  const resolvedMode = template.prescriptionMode
    ?? (template.duration != null && template.repetitions == null ? 'duration' : 'reps');

  if (resolvedMode === 'duration') {
    if (template.duration != null) {
      const durationLabel = template.sets != null
        ? `${template.sets}x${template.duration} seg`
        : `${template.duration} seg`;
      parts.push(durationLabel);
    }
  } else {
    const repsLabel = formatRepetitions(template.repetitions);
    if (template.sets != null && repsLabel != null) {
      parts.push(`${template.sets}x${repsLabel}`);
    }
  }

  if (template.hasLoad && template.suggestedLoad != null) {
    parts.push(`${template.suggestedLoad} kg`);
  }
  const restLabel = hideRest ? null : formatRestInterval(template.restInterval);
  if (restLabel) {
    parts.push(restLabel);
  }
  return parts.length ? parts.join(' · ') : null;
}

const formatRestShort = (seconds) => {
  if (seconds == null || seconds <= 0) return null;
  // Per design: show in seconds up to 99s (e.g. "60s"), then minutes.
  if (seconds < 100) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (remaining === 0) return `${minutes}min`;
  return `${minutes}min ${remaining}s`;
};

/**
 * Builds structured tokens for the summary shown in the EditExerciseSheet header.
 * Each token has a `value` (number string) and a `unit` (label string).
 * Returns null if there is nothing meaningful to display.
 *
 * @param {Object} snapshot - Training template exercise junction row (snapshot fields)
 * @returns {Array<{value: string, unit: string}>|null}
 */
export function formatSnapshotSummaryTokens(snapshot) {
  if (!snapshot) return null;
  const tokens = [];
  const repsLabel = formatRepetitions(snapshot.repetitions);
  const durationMode = snapshot.duration != null && (snapshot.repetitions == null || repsLabel == null);

  if (durationMode) {
    if (snapshot.sets != null) {
      tokens.push({ value: String(snapshot.sets), unit: 'séries' });
      tokens.push({ value: String(snapshot.duration), unit: 's' });
    } else {
      tokens.push({ value: String(snapshot.duration), unit: 's' });
    }
  } else if (snapshot.sets != null && repsLabel != null) {
    tokens.push({ value: String(snapshot.sets), unit: 'séries' });
    tokens.push({ value: repsLabel, unit: 'reps' });
  }

  if (snapshot.hasLoad) {
    if (snapshot.suggestedLoad != null) {
      tokens.push({ value: String(snapshot.suggestedLoad), unit: 'kg' });
    } else {
      tokens.push({ value: '?', unit: 'kg' });
    }
  }

  return tokens.length ? tokens : null;
}

/**
 * Builds the summary line shown on the exercise row in a training template.
 * Format examples:
 *   - "4×10 · 60s · 20kg"
 *   - "4×10 · 60s · Carga a definir"     (hasLoad true, load missing)
 *   - "4×10 · 60s"                        (hasLoad false)
 *   - "4 × 45s · 60s desc · 20kg"         (duration mode)
 *
 * @param {Object} snapshot - Training template exercise junction row (snapshot fields)
 * @returns {string|null}
 */
export function formatSnapshotSummary(snapshot) {
  if (!snapshot) return null;
  const parts = [];
  const repsLabel = formatRepetitions(snapshot.repetitions);
  const durationMode = snapshot.duration != null && (snapshot.repetitions == null || repsLabel == null);

  if (durationMode) {
    if (snapshot.sets != null) {
      parts.push(`${snapshot.sets} × ${snapshot.duration}s`);
    } else {
      parts.push(`${snapshot.duration}s`);
    }
    const restLabel = formatRestShort(snapshot.restInterval);
    if (restLabel) parts.push(`${restLabel} desc`);
  } else if (snapshot.sets != null && repsLabel != null) {
    parts.push(`${snapshot.sets}×${repsLabel}`);
    const restLabel = formatRestShort(snapshot.restInterval);
    if (restLabel) parts.push(restLabel);
  } else {
    const restLabel = formatRestShort(snapshot.restInterval);
    if (restLabel) parts.push(restLabel);
  }

  if (snapshot.hasLoad) {
    if (snapshot.suggestedLoad != null) {
      parts.push(`${snapshot.suggestedLoad}kg`);
    } else {
      parts.push('Carga a definir');
    }
  }

  return parts.length ? parts.join(' · ') : null;
}
