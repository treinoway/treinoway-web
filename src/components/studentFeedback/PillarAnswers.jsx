import PropTypes from 'prop-types';
import { Star } from 'lucide-react';
import { FEEDBACK_QUESTION_TYPE } from '../../constants/studentFeedback';
import { formatAnswerValue, hasAnswerValue } from '../../utils/studentFeedback';
import { t, tf } from '../../i18n';

// Text of the answers under the `studentFeedback.history.latest` namespace
const tl = (key) => t(`studentFeedback.history.latest.${key}`);

// Stars the student gave out of the maximum, announced as "2 de 5 estrelas"
const AnswerStars = ({ answer }) => (
  <span className="student-feedback-stars" role="img" aria-label={tf('studentFeedback.history.latest.starsAria', { answer: formatAnswerValue(answer) })}>
    {Array.from({ length: answer.max }, (_, index) => (
      <Star
        key={index}
        className={`student-feedback-stars__star${index < answer.value ? ' student-feedback-stars__star--filled' : ''}`}
        size={16}
        strokeWidth={2}
        aria-hidden="true"
      />
    ))}
  </span>
);

AnswerStars.propTypes = {
  answer: PropTypes.shape({ value: PropTypes.number.isRequired, max: PropTypes.number.isRequired }).isRequired,
};

// One scored question with the raw answer of the student on its own scale
const PillarAnswer = ({ answer }) => (
  <li className="student-feedback-pillar-answer">
    <span className="student-feedback-pillar-answer__question">
      <span className="type-body">{answer.question}</span>
      {answer.inverted && <span className="type-caption student-feedback-pillar-answer__note">{tl('inverted')}</span>}
    </span>
    <span className="student-feedback-pillar-answer__value">
      {answer.type === FEEDBACK_QUESTION_TYPE.STARS && hasAnswerValue(answer) && <AnswerStars answer={answer} />}
      <strong className="type-body-strong">{formatAnswerValue(answer)}</strong>
    </span>
  </li>
);

PillarAnswer.propTypes = { answer: PropTypes.object.isRequired };

// What the student answered in the questions behind a pillar score
const PillarAnswers = ({ id, answers }) => (
  <div id={id} className="student-feedback-pillar-answers">
    <span className="type-caption-strong student-feedback-pillar-answers__title">{tl('answersTitle')}</span>
    <ul className="student-feedback-pillar-answers__list">
      {answers.map((answer) => <PillarAnswer key={answer.questionId} answer={answer} />)}
    </ul>
  </div>
);

PillarAnswers.propTypes = {
  id: PropTypes.string.isRequired,
  answers: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default PillarAnswers;
