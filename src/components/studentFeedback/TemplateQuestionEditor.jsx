import PropTypes from 'prop-types';
import { Trash2 } from 'lucide-react';
import ChoiceChips from './ChoiceChips';
import ToggleField from './ToggleField';
import {
  FEEDBACK_CONDITION_MEAL_PLAN,
  FEEDBACK_PILLAR_ORDER,
  FEEDBACK_QUESTION_TYPE,
  FEEDBACK_QUESTION_TYPES,
  FEEDBACK_SCORE_RANGE,
  FEEDBACK_TEMPLATE_LIMITS,
} from '../../constants/studentFeedback';
import { t, tf } from '../../i18n';

// Text of the builder under the `studentFeedback.builder` namespace
const tb = (key) => t(`studentFeedback.builder.${key}`);

// Label of the field that says what one end of the score scale means
const endLabelOf = (value) => tf('studentFeedback.builder.endLabel', { value });

// The answer types as chip options
const typeOptions = () => FEEDBACK_QUESTION_TYPES.map((type) => ({ value: type, label: t(`studentFeedback.questionType.${type}`) }));

// "Quando mostrar" as chip options: always, or only to a student with a meal plan
const conditionOptions = () => [
  { value: null, label: tb('conditionAlways') },
  { value: FEEDBACK_CONDITION_MEAL_PLAN, label: tb('conditionMealPlan') },
];

// Labelled single-line text field of the editor
const TextField = ({ id, label, value, maxLength, disabled, onChange }) => (
  <div className="field">
    <label className="field-label type-caption-strong" htmlFor={id}>{label}</label>
    <input id={id} type="text" className="input" value={value} maxLength={maxLength} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
  </div>
);

TextField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  maxLength: PropTypes.number.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Question text and the optional help text shown under it
const QuestionTexts = ({ question, disabled, onChange }) => (
  <>
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="feedback-question-text">{tb('text')}</label>
      <textarea
        id="feedback-question-text"
        className="input"
        rows={3}
        value={question.text}
        maxLength={FEEDBACK_TEMPLATE_LIMITS.text}
        disabled={disabled}
        onChange={(event) => onChange({ text: event.target.value })}
      />
    </div>
    <TextField id="feedback-question-help" label={tb('helpText')} value={question.helpText} maxLength={FEEDBACK_TEMPLATE_LIMITS.helpText} disabled={disabled} onChange={(helpText) => onChange({ helpText })} />
  </>
);

QuestionTexts.propTypes = {
  question: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

// What 0 and 10 mean, asked only for a score question
const EndLabels = ({ question, disabled, onChange }) => (
  <div className="feedback-editor__ends">
    <TextField id="feedback-question-min" label={endLabelOf(FEEDBACK_SCORE_RANGE.min)} value={question.minLabel} maxLength={FEEDBACK_TEMPLATE_LIMITS.endLabel} disabled={disabled} onChange={(minLabel) => onChange({ minLabel })} />
    <TextField id="feedback-question-max" label={endLabelOf(FEEDBACK_SCORE_RANGE.max)} value={question.maxLabel} maxLength={FEEDBACK_TEMPLATE_LIMITS.endLabel} disabled={disabled} onChange={(maxLabel) => onChange({ maxLabel })} />
  </div>
);

EndLabels.propTypes = {
  question: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Pillar the answers of the question count for
const PillarField = ({ value, disabled, onChange }) => (
  <div className="field">
    <label className="field-label type-caption-strong" htmlFor="feedback-question-pillar">{tb('pillar')}</label>
    <select id="feedback-question-pillar" className="input" value={value} aria-describedby="feedback-question-pillar-hint" disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {FEEDBACK_PILLAR_ORDER.map((pillar) => <option key={pillar} value={pillar}>{t(`studentFeedback.pillar.${pillar}`)}</option>)}
    </select>
    <span id="feedback-question-pillar-hint" className="field-hint type-caption">{tb('pillarHint')}</span>
  </div>
);

PillarField.propTypes = {
  value: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Editor of the selected question: texts, answer type, end labels (score), pillar, when to show, the two switches and its removal; `disabled` locks every control
const TemplateQuestionEditor = ({ question, position, canRemove, disabled = false, onChange, onRemove }) => {
  const isScore = question.type === FEEDBACK_QUESTION_TYPE.SCORE;
  const isOpen = question.type === FEEDBACK_QUESTION_TYPE.OPEN;
  return (
    <section className="section-card feedback-builder__panel" aria-labelledby="feedback-builder-editor-heading">
      <div className="feedback-builder__panel-head">
        <h2 id="feedback-builder-editor-heading" className="type-h3">{tf('studentFeedback.builder.editorTitle', { position })}</h2>
      </div>
      <div className="feedback-editor">
        <QuestionTexts question={question} disabled={disabled} onChange={onChange} />
        <ChoiceChips label={tb('type')} options={typeOptions()} value={question.type} disabled={disabled} onChange={(type) => onChange({ type })} />
        {isScore && <EndLabels question={question} disabled={disabled} onChange={onChange} />}
        <PillarField value={question.pillar} disabled={disabled} onChange={(pillar) => onChange({ pillar })} />
        <ChoiceChips label={tb('condition')} options={conditionOptions()} value={question.condition} disabled={disabled} onChange={(condition) => onChange({ condition })} />
        <ToggleField id="feedback-question-required" label={tb('required')} description={tb('requiredDescription')} checked={question.required} disabled={disabled} onChange={(required) => onChange({ required })} />
        {!isOpen && (
          <ToggleField id="feedback-question-invert" label={tb('invertScore')} description={tb('invertScoreDescription')} checked={question.invertScore} disabled={disabled} onChange={(invertScore) => onChange({ invertScore })} />
        )}
        <div className="feedback-editor__footer">
          <button type="button" className="btn btn--ghost" disabled={disabled || !canRemove} title={canRemove ? undefined : tb('removeLastHint')} onClick={onRemove}>
            <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            {tb('removeQuestion')}
          </button>
        </div>
      </div>
    </section>
  );
};

TemplateQuestionEditor.propTypes = {
  question: PropTypes.object.isRequired,
  position: PropTypes.number.isRequired,
  canRemove: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default TemplateQuestionEditor;
