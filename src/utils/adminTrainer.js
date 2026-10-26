const EMPTY_NAME = '—';

// Returns the trainer's full name, falling back to the email, then to a dash.
export const getTrainerName = (trainer) =>
  [trainer.firstName, trainer.lastName].filter(Boolean).join(' ') || trainer.email || EMPTY_NAME;

// Returns true when the trainer has a real name (so the email can be shown as a sub line).
export const hasTrainerName = (trainer) => Boolean(trainer.firstName || trainer.lastName);

// Returns true when the subscription status deserves a badge (set and not ACTIVE).
export const isAbnormalStatus = (status) => Boolean(status) && status !== 'ACTIVE';

const KNOWN_STATUSES = ['PAST_DUE', 'CANCELED'];

// Returns the feedback tone of an abnormal subscription status (CANCELED error, the rest warning).
export const getStatusTone = (status) => (status === 'CANCELED' ? 'error' : 'warning');

// Returns the i18n key of a status label, or null when the status has no translation.
export const getStatusLabelKey = (status) =>
  KNOWN_STATUSES.includes(status) ? `adminTrainers.status_${status}` : null;
