import { FEEDBACK_BAND_TONE, FEEDBACK_PILLAR_ORDER, FEEDBACK_STATUS, FEEDBACK_STATUS_FILTER } from '../constants/studentFeedback';
import { t } from '../i18n';

const MINUS_SIGN = '−';
const MISSING = '-';

// Whether the feedback was answered by the student
export const isAnsweredFeedback = (feedback) => feedback.status === FEEDBACK_STATUS.ANSWERED;

// Whether the feedback is an answered one the trainer has not read yet
export const isUnreadFeedback = (feedback) => isAnsweredFeedback(feedback) && !feedback.readAt;

// Name of the moment a feedback was sent at: the web label of its `milestone`, or the label the service sent when the app does not know the milestone
export const milestoneLabelOf = (feedback) => {
  const label = t(`studentFeedback.milestone.${feedback.milestone}`);
  return typeof label === 'string' ? label : feedback.milestoneLabel;
};

// Badge tone of an index band: attention is error, stable is warning, good is success
export const bandToneOf = (band) => FEEDBACK_BAND_TONE[band] ?? 'neutral';

// A 0-100 score as text, or a dash when the service has no value
export const formatScore = (score) => (typeof score === 'number' ? String(score) : MISSING);

// A 0-100 rate as "82%", or a dash when the service has no value
export const formatRate = (rate) => (typeof rate === 'number' ? `${rate}%` : MISSING);

// Variation against the previous score as "+20", "−10" or "0"
export const formatDelta = (delta) => {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${MINUS_SIGN}${Math.abs(delta)}`;
  return '0';
};

// Badge tone of a variation: up is success, down is error, unchanged is neutral
export const deltaToneOf = (delta) => {
  if (delta > 0) return 'success';
  if (delta < 0) return 'error';
  return 'neutral';
};

// Scores in column order, each with the variation against the column right before it (null when either is missing)
const withDeltas = (scores) =>
  scores.map((score, index) => {
    const previous = index > 0 ? scores[index - 1] : null;
    const comparable = typeof score === 'number' && typeof previous === 'number';
    return { score: typeof score === 'number' ? score : null, delta: comparable ? score - previous : null };
  });

// Score the feedback gave to the pillar, or null when the pillar was not scored in it
const pillarScoreOf = (feedback, pillar) => feedback.pillars.find((item) => item.pillar === pillar)?.score ?? null;

// Position of a pillar in the fixed display order; pillars the app does not know go last
const pillarRank = (pillar) => {
  const rank = FEEDBACK_PILLAR_ORDER.indexOf(pillar);
  return rank === -1 ? FEEDBACK_PILLAR_ORDER.length : rank;
};

// Every pillar scored in at least one of the feedbacks, once each, in display order
const pillarsOf = (answered) => {
  const labels = new Map();
  answered.forEach((feedback) => feedback.pillars.forEach((item) => {
    if (!labels.has(item.pillar)) labels.set(item.pillar, item.pillarLabel);
  }));
  return [...labels].map(([pillar, label]) => ({ pillar, label })).sort((a, b) => pillarRank(a.pillar) - pillarRank(b.pillar));
};

// Rows of the pillar table: one per pillar, with one score and variation per answered feedback
export const buildPillarRows = (answered) =>
  pillarsOf(answered).map(({ pillar, label }) => ({
    pillar,
    label,
    cells: withDeltas(answered.map((feedback) => pillarScoreOf(feedback, pillar))),
  }));

// Cells of the overall index row: one score and variation per answered feedback
export const buildOverallCells = (answered) => withDeltas(answered.map((feedback) => feedback.overallIndex));

// Inbox payload after the feedback was read: flagged in the list (dropped from the unread filter) and one less unread in the summary
export const applyFeedbackRead = (inbox, id, readAt, statusFilter) => {
  const target = inbox?.items.find((item) => item.id === id);
  if (!target || !readAt || !isUnreadFeedback(target)) return inbox;
  const items = statusFilter === FEEDBACK_STATUS_FILTER.UNREAD
    ? inbox.items.filter((item) => item.id !== id)
    : inbox.items.map((item) => (item.id === id ? { ...item, readAt } : item));
  const unreadCount = Math.max(0, (inbox.summary.unreadCount ?? 0) - 1);
  return { ...inbox, items, summary: { ...inbox.summary, unreadCount } };
};
