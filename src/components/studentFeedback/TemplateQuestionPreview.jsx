import PropTypes from 'prop-types';
import PhoneFrame from '../ds/PhoneFrame';
import ScoreScale from '../ds/ScoreScale';
import StarRating from '../ds/StarRating';
import { FEEDBACK_QUESTION_TYPE, FEEDBACK_SCORE_RANGE, FEEDBACK_STARS_MAX } from '../../constants/studentFeedback';
import { t } from '../../i18n';

// Text of the builder under the `studentFeedback.builder` namespace
const tb = (key) => t(`studentFeedback.builder.${key}`);

// The answer control the student gets for the question: 0 to 10 scale, stars or a text area
const AnswerPreview = ({ question }) => {
  if (question.type === FEEDBACK_QUESTION_TYPE.SCORE) {
    return <ScoreScale min={FEEDBACK_SCORE_RANGE.min} max={FEEDBACK_SCORE_RANGE.max} minLabel={question.minLabel || undefined} maxLabel={question.maxLabel || undefined} />;
  }
  if (question.type === FEEDBACK_QUESTION_TYPE.STARS) return <StarRating max={FEEDBACK_STARS_MAX} />;
  return <textarea className="input" rows={4} disabled aria-label={tb('previewAnswer')} placeholder={tb('previewAnswerPlaceholder')} />;
};

AnswerPreview.propTypes = { question: PropTypes.object.isRequired };

// "Como o aluno vê": the selected question inside a phone frame, following the editor as it changes
const TemplateQuestionPreview = ({ question }) => (
  <section className="section-card feedback-builder__panel" aria-labelledby="feedback-builder-preview-heading">
    <div className="feedback-builder__panel-head">
      <h2 id="feedback-builder-preview-heading" className="type-h3">{tb('previewTitle')}</h2>
    </div>
    <PhoneFrame label={tb('previewFrame')}>
      <div className="feedback-preview">
        <p className={`feedback-preview__question type-h4${question.text ? '' : ' feedback-preview__question--empty'}`}>{question.text || tb('emptyQuestion')}</p>
        {question.helpText && <p className="feedback-preview__help type-caption">{question.helpText}</p>}
        <AnswerPreview question={question} />
      </div>
    </PhoneFrame>
  </section>
);

TemplateQuestionPreview.propTypes = { question: PropTypes.object.isRequired };

export default TemplateQuestionPreview;
