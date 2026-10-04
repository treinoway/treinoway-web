import {
  ADHERENCE_SUCCESS_MIN,
  ADHERENCE_WARNING_MIN,
  LAST_WORKOUT_WARNING_DAYS,
  LAST_WORKOUT_ERROR_DAYS,
} from '../constants/student';

const DAY_MS = 1000 * 60 * 60 * 24;

export const getStudentDisplayName = (student) => {
  const name = [student.firstName, student.lastName].filter(Boolean).join(' ');
  return name || student.email || '';
};

/**
 * "Último treino" label for the student row. Returns null when the student never trained
 * (or the date is invalid) so the caller can render the "Nunca treinou" fallback.
 */
export const formatLastWorkout = (iso, now = Date.now()) => {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  const days = Math.max(0, Math.floor((now - time) / DAY_MS));
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 30) return `Há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'Há 1 mês' : `Há ${months} meses`;
};

export const formatAdherence = (adherence) =>
  adherence == null ? null : `${Math.round(adherence)}%`;

/**
 * Adherence to display: the backend value, or null (no data, rendered as "–") when there is
 * nothing to measure. No expected workouts (0/0) is the trainer's gap, not the student's, so it
 * resolves to null even if the backend sends `adherence: 0`.
 */
export const resolveAdherence = (student) => {
  if (student.adherenceExpected === 0) return null;
  return student.adherence ?? null;
};

/** Tone for the adherence value; null (no data) has no tone. */
export const getAdherenceTone = (adherence) => {
  if (adherence == null) return null;
  if (adherence >= ADHERENCE_SUCCESS_MIN) return 'success';
  if (adherence >= ADHERENCE_WARNING_MIN) return 'warning';
  return 'error';
};

const getDaysSince = (iso, now) => {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now - time) / DAY_MS));
};

/** Tone for the last-workout value: today success, 1-6 days neutral (null), 7-13 warning, 14+ or never error. */
export const getLastWorkoutTone = (iso, now = Date.now()) => {
  const days = getDaysSince(iso, now);
  if (days === null) return 'error';
  if (days === 0) return 'success';
  if (days >= LAST_WORKOUT_ERROR_DAYS) return 'error';
  if (days >= LAST_WORKOUT_WARNING_DAYS) return 'warning';
  return null;
};
