export const STUDENT_FEEDBACK_PATH = '/trainer/student-feedbacks';
export const STUDENT_FEEDBACK_SETTINGS_PATH = '/trainer/student-feedbacks/settings';
export const STUDENT_FEEDBACK_TEMPLATES_PATH = '/trainer/student-feedbacks/templates';

// Path of the feedback history of one student
export const studentFeedbackHistoryPath = (studentId) => `/trainer/students/${studentId}/feedbacks`;

// Path of the builder of one feedback template
export const studentFeedbackTemplatePath = (templateId) => `${STUDENT_FEEDBACK_TEMPLATES_PATH}/${templateId}`;

export const FEEDBACK_STATUS = Object.freeze({
  PENDING: 'pending',
  ANSWERED: 'answered',
  EXPIRED: 'expired',
});

export const FEEDBACK_STATUS_FILTER = Object.freeze({
  ALL: 'all',
  UNREAD: 'unread',
  UNANSWERED: 'unanswered',
});

export const FEEDBACK_MILESTONES = Object.freeze(['D7', 'D15', 'D21', 'D30', 'RECURRING', 'ADHOC']);

export const FEEDBACK_BAND_TONE = Object.freeze({
  attention: 'error',
  stable: 'warning',
  good: 'success',
});

export const FEEDBACK_BAND_METER_TONE = Object.freeze({
  attention: 'danger',
  stable: 'warning',
  good: 'success',
});

export const FEEDBACK_PILLAR_ORDER = Object.freeze([
  'training_adherence',
  'diet_adherence',
  'evolution',
  'routine',
  'sleep',
  'hydration',
  'report',
  'other',
]);

export const FEEDBACK_CONFIG_MILESTONE_FIELDS = Object.freeze(['d7', 'd15', 'd21', 'd30', 'recurring']);

/** days the student has to answer a feedback: the range the trainer picks from and the value of a config saved before the field existed. */
export const FEEDBACK_RESPONSE_WINDOW_DAYS = Object.freeze({ min: 1, max: 7, default: 3 });

/** shortest response window that still gets the reminder, sent 24h after the feedback while it is open. */
export const FEEDBACK_REMINDER_MIN_WINDOW_DAYS = 2;

/** every response window the trainer can pick, shortest first. */
export const FEEDBACK_RESPONSE_WINDOW_OPTIONS = Object.freeze(
  Array.from({ length: FEEDBACK_RESPONSE_WINDOW_DAYS.max - FEEDBACK_RESPONSE_WINDOW_DAYS.min + 1 }, (_, index) => FEEDBACK_RESPONSE_WINDOW_DAYS.min + index),
);

/** window event carrying `{ count }` whenever the inbox knows the current unread count. */
export const STUDENT_FEEDBACK_UNREAD_EVENT = 'treinoway:student-feedback-unread-changed';

export const FEEDBACK_QUESTION_TYPE = Object.freeze({
  SCORE: 'score',
  STARS: 'stars',
  OPEN: 'open',
});

export const FEEDBACK_QUESTION_TYPES = Object.freeze(['score', 'stars', 'open']);

export const FEEDBACK_CONDITION_MEAL_PLAN = 'has_meal_plan';

/** first version shown as a "v{n}" tag: a template never edited after being sent has no version to tell apart. */
export const FEEDBACK_TEMPLATE_FIRST_SHOWN_VERSION = 2;

export const FEEDBACK_TEMPLATE_LIMITS = Object.freeze({
  questions: 15,
  name: 80,
  text: 300,
  helpText: 300,
  endLabel: 60,
});

export const FEEDBACK_SCORE_RANGE = Object.freeze({ min: 0, max: 10 });
export const FEEDBACK_STARS_MAX = 5;
