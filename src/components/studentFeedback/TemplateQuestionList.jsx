import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import Badge from '../ds/Badge';
import { FEEDBACK_CONDITION_MEAL_PLAN, FEEDBACK_TEMPLATE_LIMITS } from '../../constants/studentFeedback';
import { isAtQuestionLimit } from '../../utils/studentFeedbackTemplate';
import { t, tf } from '../../i18n';

// Text of the builder under the `studentFeedback.builder` namespace
const tb = (key) => t(`studentFeedback.builder.${key}`);

// Answer type and pillar of a question, plus the flags that change who sees it or whether it can be skipped
const QuestionBadges = ({ question }) => (
  <span className="feedback-question-row__badges">
    <Badge variant="tag" tone="brand">{t(`studentFeedback.questionType.${question.type}`)}</Badge>
    <Badge variant="tag">{t(`studentFeedback.pillar.${question.pillar}`)}</Badge>
    {!question.required && <Badge variant="tag">{tb('optional')}</Badge>}
    {question.condition === FEEDBACK_CONDITION_MEAL_PLAN && <Badge variant="tag">{tb('mealPlanOnly')}</Badge>}
  </span>
);

QuestionBadges.propTypes = { question: PropTypes.object.isRequired };

// Up and down buttons of a row; the first cannot go up, the last cannot go down, and `disabled` locks both
const MoveButtons = ({ index, total, disabled, onMove }) => {
  const position = index + 1;
  return (
    <div className="feedback-question-row__moves">
      <button type="button" className="icon-button" aria-label={tf('studentFeedback.builder.moveUp', { position })} disabled={disabled || index === 0} onClick={() => onMove(index, -1)}>
        <ChevronUp size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      <button type="button" className="icon-button" aria-label={tf('studentFeedback.builder.moveDown', { position })} disabled={disabled || index === total - 1} onClick={() => onMove(index, 1)}>
        <ChevronDown size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
};

MoveButtons.propTypes = {
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  disabled: PropTypes.bool.isRequired,
  onMove: PropTypes.func.isRequired,
};

// One question of the list: position, text and badges select it; the move buttons reorder it
const QuestionRow = ({ question, index, total, selected, readOnly, disabled, onSelect, onMove }) => (
  <li className={`feedback-question-row${selected ? ' feedback-question-row--selected' : ''}`}>
    <button type="button" className="feedback-question-row__select" aria-current={selected ? 'true' : undefined} onClick={() => onSelect(question.key)}>
      <span className="feedback-question-row__order type-caption-strong" aria-hidden="true">{index + 1}</span>
      <span className="feedback-question-row__body">
        <span className={`feedback-question-row__text type-body-strong${question.text ? '' : ' feedback-question-row__text--empty'}`}>
          {question.text || tb('emptyQuestion')}
        </span>
        <QuestionBadges question={question} />
      </span>
    </button>
    {!readOnly && <MoveButtons index={index} total={total} disabled={disabled} onMove={onMove} />}
  </li>
);

QuestionRow.propTypes = {
  question: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  selected: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
};

// Ordered questions of the template with the count against the limit; unless read-only, rows can be moved and a question added, both locked while `disabled`
const TemplateQuestionList = ({ questions, selectedKey, readOnly = false, disabled = false, onSelect, onMove, onAdd }) => (
  <section className="section-card feedback-builder__panel" aria-labelledby="feedback-builder-questions-heading">
    <div className="feedback-builder__panel-head">
      <h2 id="feedback-builder-questions-heading" className="type-h3">{tb('questionsTitle')}</h2>
      <span className="type-caption feedback-builder__counter">{tf('studentFeedback.builder.counter', { count: questions.length, limit: FEEDBACK_TEMPLATE_LIMITS.questions })}</span>
    </div>
    <ol className="feedback-question-list" role="list" aria-label={tb('questionsTitle')}>
      {questions.map((question, index) => (
        <QuestionRow
          key={question.key}
          question={question}
          index={index}
          total={questions.length}
          selected={question.key === selectedKey}
          readOnly={readOnly}
          disabled={disabled}
          onSelect={onSelect}
          onMove={onMove}
        />
      ))}
    </ol>
    {!readOnly && (
      <button type="button" className="btn btn--secondary feedback-builder__add" disabled={disabled || isAtQuestionLimit(questions)} onClick={onAdd}>
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        {tb('addQuestion')}
      </button>
    )}
  </section>
);

TemplateQuestionList.propTypes = {
  questions: PropTypes.array.isRequired,
  selectedKey: PropTypes.string,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};

export default TemplateQuestionList;
