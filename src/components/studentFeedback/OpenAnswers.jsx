import PropTypes from 'prop-types';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';
import { milestoneLabelOf } from '../../utils/studentFeedback';
import { t } from '../../i18n';

// What the student wrote in one feedback: each open question with its answer
const AnswerGroup = ({ feedback }) => (
  <div className="student-feedback-answers__group">
    <div className="student-feedback-answers__head">
      <span className="type-body-strong">{milestoneLabelOf(feedback)}</span>
      <span className="type-caption">{formatDateTimeForDisplay(feedback.submittedAt)}</span>
    </div>
    {feedback.openAnswers.map((answer) => (
      <div key={answer.questionId} className="student-feedback-answer">
        <span className="type-caption-strong student-feedback-answer__question">{answer.question}</span>
        <p className="type-body student-feedback-answer__text">{answer.text}</p>
      </div>
    ))}
  </div>
);

AnswerGroup.propTypes = {
  feedback: PropTypes.object.isRequired,
};

// Open answers of the answered feedbacks, most recent first; renders nothing when the student wrote none
const OpenAnswers = ({ answered }) => {
  const withAnswers = answered.filter((feedback) => feedback.openAnswers.length > 0).reverse();
  if (withAnswers.length === 0) return null;
  return (
    <section className="section-card student-feedback-section" aria-labelledby="student-feedback-answers-heading">
      <h2 id="student-feedback-answers-heading" className="type-h3 student-feedback-section__title">
        {t('studentFeedback.history.openAnswersTitle')}
      </h2>
      {withAnswers.map((feedback) => (
        <AnswerGroup key={feedback.id} feedback={feedback} />
      ))}
    </section>
  );
};

OpenAnswers.propTypes = {
  answered: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default OpenAnswers;
