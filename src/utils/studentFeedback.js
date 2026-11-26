import { FEEDBACK_BAND_METER_TONE, FEEDBACK_BAND_TONE, FEEDBACK_PILLAR_ORDER, FEEDBACK_STATUS, FEEDBACK_STATUS_FILTER } from '../constants/studentFeedback';
import { t, tCount, tf } from '../i18n';

const MINUS_SIGN = '−';
const MISSING = '-';
const DAY_MS = 24 * 60 * 60 * 1000;

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

// Meter tone of an index band: attention is danger, stable is warning, good is success; no band is neutral
export const meterToneOf = (band) => FEEDBACK_BAND_METER_TONE[band] ?? 'neutral';

// Local calendar day of an instant, as a count of days
const localDayOf = (date) => Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);

// How long the student still has to answer, as "Expira hoje", "Expira amanhã" or "Expira em 3 dias"; null without a deadline or once it has passed
export const formatExpiresIn = (expiresAt, now = new Date()) => {
  const deadline = new Date(expiresAt ?? NaN);
  if (Number.isNaN(deadline.getTime()) || deadline <= now) return null;
  const days = localDayOf(deadline) - localDayOf(now);
  if (days === 0) return t('studentFeedback.history.expiresToday');
  if (days === 1) return t('studentFeedback.history.expiresTomorrow');
  return tf('studentFeedback.history.expiresIn', { n: days });
};

// A 0-100 score as text, or a dash when the service has no value
export const formatScore = (score) => (typeof score === 'number' ? String(score) : MISSING);

// Whether the service sent a score to show
export const hasScore = (score) => typeof score === 'number';

// A 0-100 score with its scale, as "58 de 100"; null when the service has no value
export const scoreOutOf100 = (score) => (hasScore(score) ? tf('studentFeedback.scoreOutOf100', { score: formatScore(score) }) : null);

// Whether the student gave a value the scale can show
export const hasAnswerValue = ({ value }) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

// Raw answer of the student with the top of its scale, as "2 de 5" or "5,5 de 10"; a dash without a value
export const formatAnswerValue = (answer) =>
  (hasAnswerValue(answer) ? tf('studentFeedback.answerOutOf', { value: Number(answer.value).toLocaleString('pt-BR'), max: answer.max }) : MISSING);

// A number of days as text: "1 dia", "3 dias"
export const formatDayCount = (days) => tCount('studentFeedback.dayCount', days);

// Name of the student for a title, or "Aluno sem nome" when the service has none or only blanks
export const studentTitleNameOf = (name) => name?.trim() || t('studentFeedback.unnamedStudent');

// First name of the student, or null when the service has no name
export const firstNameOf = (name) => name?.trim().split(/\s+/)[0] || null;

// How the texts call the student: the first name, or "o aluno" ("O aluno" when it opens the sentence) when the service has no name
export const studentCallNameOf = (name) => {
  const inSentence = firstNameOf(name) ?? t('studentFeedback.studentFallback');
  return { inSentence, atStart: inSentence.charAt(0).toUpperCase() + inSentence.slice(1) };
};

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

// Variation of the overall index per answered feedback id, against the answered one right before it (null on the first)
export const overallDeltasById = (feedbacks) => {
  const answered = feedbacks.filter(isAnsweredFeedback);
  const cells = buildOverallCells(answered);
  return new Map(answered.map((feedback, index) => [feedback.id, cells[index].delta]));
};

// The latest answered feedback and the answered one before it; either is null when there is none
export const latestAnsweredPair = (feedbacks) => {
  const answered = feedbacks.filter(isAnsweredFeedback);
  return { latest: answered.at(-1) ?? null, previous: answered.at(-2) ?? null };
};

// Variation between two scores, or null when either is missing
const deltaBetween = (score, previousScore) =>
  (typeof score === 'number' && typeof previousScore === 'number' ? score - previousScore : null);

// Variation of the overall index of a feedback against the previous answered one, or null without a previous
export const overallDeltaOf = (latest, previous) => deltaBetween(latest.overallIndex, previous?.overallIndex);

// Pillars of the latest answered feedback in display order, each with the variation against the previous answered one
export const buildLatestPillars = (latest, previous) =>
  [...latest.pillars]
    .sort((a, b) => pillarRank(a.pillar) - pillarRank(b.pillar))
    .map((item) => ({ ...item, delta: previous ? deltaBetween(item.score, pillarScoreOf(previous, item.pillar)) : null }));

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
