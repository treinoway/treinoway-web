import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { bandToneOf, formatScore } from '../../utils/studentFeedback';

// Overall index of a feedback with its band badge; a feedback without a band shows its status instead
const FeedbackIndex = ({ feedback }) => (
  <span className="student-feedback-index">
    <span className="student-feedback-index__value type-body-strong">{formatScore(feedback.overallIndex)}</span>
    {feedback.band
      ? <Badge tone={bandToneOf(feedback.band)}>{feedback.bandLabel}</Badge>
      : <Badge tone="neutral">{feedback.statusLabel}</Badge>}
  </span>
);

FeedbackIndex.propTypes = {
  feedback: PropTypes.shape({
    overallIndex: PropTypes.number,
    band: PropTypes.string,
    bandLabel: PropTypes.string,
    statusLabel: PropTypes.string.isRequired,
  }).isRequired,
};

export default FeedbackIndex;
