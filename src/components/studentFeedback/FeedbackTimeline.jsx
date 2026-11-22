import PropTypes from 'prop-types';
import FeedbackIndex from './FeedbackIndex';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';
import { milestoneLabelOf } from '../../utils/studentFeedback';
import { t, tf } from '../../i18n';

// Every feedback sent to the student, oldest first: milestone, send date and the index with its band (or the status)
const FeedbackTimeline = ({ feedbacks }) => (
  <section className="section-card student-feedback-section" aria-labelledby="student-feedback-timeline-heading">
    <h2 id="student-feedback-timeline-heading" className="type-h3 student-feedback-section__title">
      {t('studentFeedback.history.timelineTitle')}
    </h2>
    <ol className="student-feedback-timeline" aria-label={t('studentFeedback.history.timelineAria')}>
      {feedbacks.map((feedback) => (
        <li key={feedback.id} className="student-feedback-timeline__item">
          <span className="type-body-strong">{milestoneLabelOf(feedback)}</span>
          <span className="type-caption student-feedback-timeline__date">
            {tf('studentFeedback.history.sentAt', { date: formatDateTimeForDisplay(feedback.sentAt) })}
          </span>
          <FeedbackIndex feedback={feedback} />
        </li>
      ))}
    </ol>
  </section>
);

FeedbackTimeline.propTypes = {
  feedbacks: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default FeedbackTimeline;
