/**
 * Workout session status constants — mirrors backend WorkoutSessionStatus.
 */
export const WORKOUT_SESSION_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

/**
 * Returns a pt-BR label for a workout session status.
 * @param {string} status
 * @returns {string}
 */
export function getWorkoutSessionStatusLabel(status) {
  switch (status) {
    case WORKOUT_SESSION_STATUS.IN_PROGRESS: return 'Em andamento';
    case WORKOUT_SESSION_STATUS.COMPLETED: return 'Concluído';
    case WORKOUT_SESSION_STATUS.ABANDONED: return 'Abandonado';
    default: return status ?? '—';
  }
}

/**
 * Returns a badge CSS class for a workout session status.
 * @param {string} status
 * @returns {string}
 */
export function getWorkoutSessionStatusBadgeClass(status) {
  switch (status) {
    case WORKOUT_SESSION_STATUS.IN_PROGRESS: return 'badge badge-blue';
    case WORKOUT_SESSION_STATUS.COMPLETED: return 'badge badge-green';
    case WORKOUT_SESSION_STATUS.ABANDONED: return 'badge badge-red';
    default: return 'badge badge-gray';
  }
}

/**
 * Exercise log status constants — mirrors backend ExerciseLogStatus.
 */
export const EXERCISE_LOG_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
};
