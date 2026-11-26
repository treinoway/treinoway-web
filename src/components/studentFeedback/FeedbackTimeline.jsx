import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import Timeline from '../ds/Timeline';
import { FEEDBACK_STATUS } from '../../constants/studentFeedback';
import { formatDayMonthForDisplay } from '../../utils/dateFormat';
import { bandToneOf, deltaToneOf, formatDelta, formatExpiresIn, formatScore, milestoneLabelOf, overallDeltasById } from '../../utils/studentFeedback';
import { t, tf } from '../../i18n';

const UPCOMING_ID = 'upcoming';

// Text of the timeline under the `studentFeedback.history` namespace
const th = (key) => t(`studentFeedback.history.${key}`);

// A caption of the timeline with its day and month
const datedCaption = (key, date) => tf(`studentFeedback.history.${key}`, { date: formatDayMonthForDisplay(date) });

// Overall index of an answered feedback with its band and the variation against the previous answered one
const answeredContentOf = (feedback, delta) => (
  <>
    <span className="student-feedback-index__value type-h3">{formatScore(feedback.overallIndex)}</span>
    {feedback.band && <Badge tone={bandToneOf(feedback.band)}>{feedback.bandLabel}</Badge>}
    {delta !== null && <Badge variant="tag" tone={deltaToneOf(delta)}>{formatDelta(delta)}</Badge>}
  </>
);

// Timeline item of an answered feedback: when it was answered and what it scored
const answeredItemOf = (feedback, delta) => ({
  state: 'answered',
  caption: datedCaption('answeredAt', feedback.submittedAt),
  content: answeredContentOf(feedback, delta),
});

// A feedback the student can still answer: the state and, while the deadline is ahead, how long is left
const pendingContentOf = (feedback) => {
  const expiresIn = formatExpiresIn(feedback.expiresAt);
  return (
    <>
      <Badge variant="tag" tone="brand">{th('awaitingAnswer')}</Badge>
      {expiresIn && <span className="type-caption student-feedback-timeline__deadline">{expiresIn}</span>}
    </>
  );
};

// Timeline item of a feedback without an answer: when it was sent and whether the student can still answer
const unansweredItemOf = (feedback) => {
  const isPending = feedback.status === FEEDBACK_STATUS.PENDING;
  return {
    state: isPending ? 'pending' : 'expired',
    caption: datedCaption('sentAt', feedback.sentAt),
    content: isPending
      ? pendingContentOf(feedback)
      : <Badge variant="tag" tone="neutral">{th('expiredUnanswered')}</Badge>,
  };
};

// Timeline item of one feedback sent to the student
const sentItemOf = (feedback, deltas) => ({
  id: feedback.id,
  title: milestoneLabelOf(feedback),
  ...(feedback.status === FEEDBACK_STATUS.ANSWERED ? answeredItemOf(feedback, deltas.get(feedback.id) ?? null) : unansweredItemOf(feedback)),
});

// Timeline item of the next scheduled milestone
const upcomingItemOf = (next) => ({
  id: UPCOMING_ID,
  state: 'upcoming',
  title: milestoneLabelOf(next),
  caption: datedCaption('scheduledFor', next.dueAt),
  content: <Badge variant="tag" tone="neutral">{th('upcoming')}</Badge>,
});

// Every feedback sent to the student, oldest first, closed by the next scheduled one when there is one
const FeedbackTimeline = ({ feedbacks, next = null }) => {
  const deltas = overallDeltasById(feedbacks);
  const items = feedbacks.map((feedback) => sentItemOf(feedback, deltas));
  if (next) items.push(upcomingItemOf(next));
  return (
    <section className="section-card student-feedback-section" aria-labelledby="student-feedback-timeline-heading">
      <h2 id="student-feedback-timeline-heading" className="type-h3 student-feedback-section__title">{th('timelineTitle')}</h2>
      <Timeline ariaLabel={th('timelineAria')} items={items} />
    </section>
  );
};

FeedbackTimeline.propTypes = {
  feedbacks: PropTypes.arrayOf(PropTypes.object).isRequired,
  next: PropTypes.shape({
    milestone: PropTypes.string.isRequired,
    milestoneLabel: PropTypes.string,
    dueAt: PropTypes.string,
  }),
};

export default FeedbackTimeline;
