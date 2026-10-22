import PropTypes from 'prop-types';
import { ANAMNESIS_QUESTION_TYPE } from '../../../constants/anamnesis';

const OptionField = ({ legend, hint, children }) => (
  <fieldset className="condition-editor-field">
    <legend className="condition-editor-label type-caption-strong">{legend}</legend>
    {hint && <p className="condition-editor-hint type-caption">{hint}</p>}
    <div className="condition-editor-options">{children}</div>
  </fieldset>
);

OptionField.propTypes = {
  legend: PropTypes.string.isRequired,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const ChoiceLabel = ({ children }) => (
  <label className="condition-editor-option type-body">{children}</label>
);

ChoiceLabel.propTypes = { children: PropTypes.node.isRequired };

const DichotomousPicker = ({ question, saving, onPick }) => (
  <OptionField legend="Mostrar se a resposta for">
    {[['yes', 'Sim'], ['no', 'Não']].map(([value, label]) => (
      <ChoiceLabel key={value}>
        <input
          type="radio"
          name={`condition-dich-${question.id}`}
          value={value}
          checked={question.condition?.value === value}
          onChange={() => onPick(value)}
          disabled={saving}
        />
        {label}
      </ChoiceLabel>
    ))}
  </OptionField>
);

const SingleChoicePicker = ({ question, options, saving, onPick }) => (
  <OptionField legend="Mostrar se a opção selecionada for">
    {options.map((option) => (
      <ChoiceLabel key={option.id}>
        <input
          type="radio"
          name={`condition-single-${question.id}`}
          value={option.id}
          checked={question.condition?.optionId === option.id}
          onChange={() => onPick(option.id)}
          disabled={saving}
        />
        {option.text}
      </ChoiceLabel>
    ))}
  </OptionField>
);

const MultipleChoicePicker = ({ question, options, saving, onToggle }) => {
  const selectedIds = Array.isArray(question.condition?.optionIds) ? question.condition.optionIds : [];
  return (
    <OptionField
      legend="Mostrar se qualquer uma estiver marcada"
      hint="Selecione uma ou mais opções que devem ativar esta pergunta."
    >
      {options.map((option) => (
        <ChoiceLabel key={option.id}>
          <input
            type="checkbox"
            value={option.id}
            checked={selectedIds.includes(option.id)}
            onChange={(e) => onToggle(option.id, e.target.checked)}
            disabled={saving}
          />
          {option.text}
        </ChoiceLabel>
      ))}
    </OptionField>
  );
};

const pickerPropTypes = {
  question: PropTypes.object.isRequired,
  saving: PropTypes.bool,
};
DichotomousPicker.propTypes = { ...pickerPropTypes, onPick: PropTypes.func.isRequired };
SingleChoicePicker.propTypes = {
  ...pickerPropTypes,
  options: PropTypes.array.isRequired,
  onPick: PropTypes.func.isRequired,
};
MultipleChoicePicker.propTypes = {
  ...pickerPropTypes,
  options: PropTypes.array.isRequired,
  onToggle: PropTypes.func.isRequired,
};

/** Trigger-value picker, driven by the parent question's type. */
const QuestionTriggerPicker = ({ question, parentQuestion, saving, handlers }) => {
  if (!parentQuestion) return null;
  const options = parentQuestion.options ?? [];
  const isDichotomous = parentQuestion.type === ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS;
  const isChoice = [ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE, ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE]
    .includes(parentQuestion.type);

  if (isDichotomous) {
    return <DichotomousPicker question={question} saving={saving} onPick={handlers.onDichotomous} />;
  }
  if (!isChoice) return null;
  if (options.length === 0) {
    return <p className="condition-editor-empty type-caption">A pergunta pai não possui opções cadastradas.</p>;
  }
  return parentQuestion.type === ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE
    ? <SingleChoicePicker question={question} options={options} saving={saving} onPick={handlers.onSingleChoice} />
    : <MultipleChoicePicker question={question} options={options} saving={saving} onToggle={handlers.onMultipleChoice} />;
};

QuestionTriggerPicker.propTypes = {
  question: PropTypes.object.isRequired,
  parentQuestion: PropTypes.object,
  saving: PropTypes.bool,
  handlers: PropTypes.shape({
    onDichotomous: PropTypes.func.isRequired,
    onSingleChoice: PropTypes.func.isRequired,
    onMultipleChoice: PropTypes.func.isRequired,
  }).isRequired,
};

export default QuestionTriggerPicker;
