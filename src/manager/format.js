import { t } from '../i18n';

const EMPTY = '—';

// Returns "first last", falling back to the email, then to an em dash.
export const getDisplayName = ({ firstName, lastName, email } = {}) => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || email || EMPTY;
};

// Returns a free-text name field (trainerName/assigneeName), or an em dash when empty.
export const getNameOrDash = (name) => name || EMPTY;

// Formats repetitions: array -> "10/8", number -> "10", {min,max} -> "8-12"; em dash when absent.
export const formatRepetitions = (repetitions) => {
  if (Array.isArray(repetitions)) return repetitions.length ? repetitions.join('/') : EMPTY;
  if (repetitions != null && typeof repetitions === 'object') {
    const { min, max } = repetitions;
    if (min == null && max == null) return EMPTY;
    if (min == null || max == null || min === max) return String(min ?? max);
    return `${min}-${max}`;
  }
  return repetitions == null || repetitions === '' ? EMPTY : String(repetitions);
};

// Formats the reps column of an exercise: the duration ("45s") for duration-based prescriptions, else the reps.
export const formatPrescription = ({ prescriptionMode, duration, repetitions } = {}) =>
  prescriptionMode === 'duration' ? (duration == null ? EMPTY : `${duration}s`) : formatRepetitions(repetitions);

// Formats the suggested load as "<n> kg"; em dash when the exercise has no load.
export const formatLoad = (hasLoad, suggestedLoad) =>
  hasLoad && suggestedLoad != null ? `${suggestedLoad} kg` : EMPTY;

// Formats the rest interval as "<n>s"; em dash when absent.
export const formatRest = (restInterval) => (restInterval == null ? EMPTY : `${restInterval}s`);

// Formats a plain value, using an em dash for null/undefined.
export const formatValue = (value) => (value == null || value === '' ? EMPTY : String(value));

// Formats a duration in seconds as whole minutes; em dash when absent.
export const formatDuration = (durationSec) =>
  durationSec == null ? EMPTY : `${Math.round(durationSec / 60)} min`;

// Returns the pt-BR badge labels for a user's roles (plus student when linked to a trainer).
export const getRoleLabels = (roles = [], isStudent = false) => {
  const labels = roles.map((role) => t(`manager.roles.${role}`) || role);
  return isStudent ? [...labels, t('manager.roles.student')] : labels;
};
