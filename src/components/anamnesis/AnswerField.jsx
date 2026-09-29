import PropTypes from 'prop-types';
import { ANAMNESIS_QUESTION_TYPE } from '../../constants/anamnesis';
import { getNumericBounds, getQuestionDomId, toValueList } from '../../utils/anamnesisAnswers';

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Sim' },
  { value: 'no', label: 'Não' },
];

const TextControl = ({ inputId, value, onChange, describedBy, invalid }) => (
  <textarea
    id={inputId}
    className={`form-textarea${invalid ? ' form-input--error' : ''}`}
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    rows={3}
    placeholder="Sua resposta..."
    aria-describedby={describedBy}
    aria-invalid={invalid}
  />
);

const NumericControl = ({ question, inputId, value, onChange, describedBy, invalid }) => {
  const { min, max } = getNumericBounds(question.config);
  const unit = question.config?.unit;
  return (
    <div className="form-input-with-suffix">
      <input
        id={inputId}
        type="number"
        inputMode="decimal"
        step="any"
        className={`form-input${invalid ? ' form-input--error' : ''}`}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        max={max}
        placeholder="Valor numérico..."
        aria-describedby={describedBy}
        aria-invalid={invalid}
      />
      {unit && <span className="form-input-suffix">{unit}</span>}
    </div>
  );
};

const YesNoControl = ({ question, value, onChange }) => (
  <div className="answer-chips">
    {YES_NO_OPTIONS.map((option) => (
      <label key={option.value} className="answer-chip">
        <input
          type="radio"
          className="visually-hidden answer-chip-input"
          name={`q-${question.id}`}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
        />
        <span className="answer-chip-label">{option.label}</span>
      </label>
    ))}
  </div>
);

const SingleChoiceControl = ({ question, value, onChange }) => (
  <div className="answer-options">
    {(question.options ?? []).map((option) => (
      <label key={option.id} className="answer-option">
        <input
          type="radio"
          className="answer-option-input"
          name={`q-${question.id}`}
          value={option.text}
          checked={value === option.text}
          onChange={() => onChange(option.text)}
        />
        <span>{option.text}</span>
      </label>
    ))}
  </div>
);

const MultipleChoiceControl = ({ question, value, onChange }) => {
  const selected = toValueList(value);
  const handleToggle = (text, checked) =>
    onChange(checked ? [...selected, text] : selected.filter((item) => item !== text));

  return (
    <div className="answer-options">
      {(question.options ?? []).map((option) => (
        <label key={option.id} className="answer-option">
          <input
            type="checkbox"
            className="answer-option-input"
            value={option.text}
            checked={selected.includes(option.text)}
            onChange={(event) => handleToggle(option.text, event.target.checked)}
          />
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  );
};

const TEXT_INPUT_TYPES = [ANAMNESIS_QUESTION_TYPE.FREE_TEXT, ANAMNESIS_QUESTION_TYPE.NUMERIC];

const GROUP_CONTROLS = {
  [ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS]: YesNoControl,
  [ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE]: SingleChoiceControl,
  [ANAMNESIS_QUESTION_TYPE.MATRIX]: SingleChoiceControl,
  [ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE]: MultipleChoiceControl,
};

const QuestionTitle = ({ question, index }) => (
  <>
    {index !== undefined && `${index + 1}. `}
    {question.text}
    {question.required && (
      <>
        <span className="form-label-required" aria-hidden="true"> *</span>
        <span className="visually-hidden"> (obrigatória)</span>
      </>
    )}
  </>
);

const FieldError = ({ id, message }) =>
  message ? <span id={id} className="form-error" role="alert">{message}</span> : null;

const InputField = ({ question, value, onChange, error, index }) => {
  const domId = getQuestionDomId(question.id);
  const inputId = `${domId}-input`;
  const errorId = `${domId}-error`;
  const Control = question.type === ANAMNESIS_QUESTION_TYPE.NUMERIC ? NumericControl : TextControl;

  return (
    <div id={domId} className="answer-field">
      <label className="form-label" htmlFor={inputId}>
        <QuestionTitle question={question} index={index} />
      </label>
      <Control
        question={question}
        inputId={inputId}
        value={value}
        onChange={onChange}
        describedBy={error ? errorId : undefined}
        invalid={Boolean(error)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
};

const GroupField = ({ question, value, onChange, error, index }) => {
  const domId = getQuestionDomId(question.id);
  const errorId = `${domId}-error`;
  const GroupControl = GROUP_CONTROLS[question.type];
  if (!GroupControl) return null;

  return (
    <fieldset id={domId} className="answer-field" aria-describedby={error ? errorId : undefined}>
      <legend className="form-label">
        <QuestionTitle question={question} index={index} />
      </legend>
      <GroupControl question={question} value={value} onChange={onChange} />
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
};

const AnswerField = (props) =>
  TEXT_INPUT_TYPES.includes(props.question.type)
    ? <InputField {...props} />
    : <GroupField {...props} />;

const optionShape = PropTypes.shape({ id: PropTypes.string, text: PropTypes.string });

const controlPropTypes = {
  inputId: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  describedBy: PropTypes.string,
  invalid: PropTypes.bool,
};

const groupPropTypes = {
  question: PropTypes.shape({ id: PropTypes.string, options: PropTypes.arrayOf(optionShape) }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
};

TextControl.propTypes = controlPropTypes;
NumericControl.propTypes = {
  ...controlPropTypes,
  question: PropTypes.shape({
    config: PropTypes.shape({
      min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      unit: PropTypes.string,
    }),
  }).isRequired,
};
YesNoControl.propTypes = groupPropTypes;
SingleChoiceControl.propTypes = groupPropTypes;
MultipleChoiceControl.propTypes = groupPropTypes;

QuestionTitle.propTypes = {
  question: PropTypes.shape({ text: PropTypes.string, required: PropTypes.bool }).isRequired,
  index: PropTypes.number,
};

const fieldPropTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    text: PropTypes.string,
    required: PropTypes.bool,
    config: PropTypes.object,
    options: PropTypes.arrayOf(optionShape),
  }).isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  index: PropTypes.number,
};

FieldError.propTypes = { id: PropTypes.string.isRequired, message: PropTypes.string };
InputField.propTypes = fieldPropTypes;
GroupField.propTypes = fieldPropTypes;
AnswerField.propTypes = fieldPropTypes;

export default AnswerField;
