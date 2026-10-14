export const StudentMessageCode = Object.freeze({
  NOT_LINKED: 'student.notLinked',
});

// Student list (Meus alunos) thresholds and paging.
export const STUDENTS_PAGE_SIZE = 20;

// Adherence (%) at or above → success; at or above WARNING_MIN → warning; below → error.
export const ADHERENCE_SUCCESS_MIN = 80;
export const ADHERENCE_WARNING_MIN = 60;

// Days since the last workout: from WARNING_DAYS → warning; from ERROR_DAYS (or never) → error.
export const LAST_WORKOUT_WARNING_DAYS = 7;
export const LAST_WORKOUT_ERROR_DAYS = 14;
