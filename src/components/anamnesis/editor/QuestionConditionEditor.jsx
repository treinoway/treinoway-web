import PropTypes from 'prop-types';
import { ANAMNESIS_CONDITION_OPERATOR } from '../../../constants/anamnesis';
import { buildInitialCondition, getEligibleParentCandidates } from '../../../utils/anamnesisEditor';
import QuestionTriggerPicker from './QuestionTriggerPicker';

const ParentSelect = ({ question, parentQuestion, candidates, saving, onChange }) => (
  <select
    id={`parent-select-${question.id}`}
    className="input"
    value={question.parentQuestionId ?? ''}
    onChange={(e) => onChange(e.target.value || null)}
    disabled={saving}
    aria-label="Pergunta pai para exibição condicional"
  >
    <option value="">Sempre mostrar (sem condição)</option>
    {parentQuestion && !candidates.find((c) => c.id === parentQuestion.id) && (
      <option value={parentQuestion.id}>{parentQuestion.text}</option>
    )}
    {candidates.map((candidate) => (
      <option key={candidate.id} value={candidate.id}>{candidate.text}</option>
    ))}
  </select>
);

ParentSelect.propTypes = {
  question: PropTypes.object.isRequired,
  parentQuestion: PropTypes.object,
  candidates: PropTypes.array.isRequired,
  saving: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

const buildTriggerHandlers = (question, onPatch) => {
  const patchCondition = (condition) =>
    onPatch({ parentQuestionId: question.parentQuestionId, condition });
  return {
    onDichotomous: (value) =>
      patchCondition({ operator: ANAMNESIS_CONDITION_OPERATOR.EQUALS, value }),
    onSingleChoice: (optionId) =>
      patchCondition({ operator: ANAMNESIS_CONDITION_OPERATOR.EQUALS, optionId }),
    onMultipleChoice: (optionId, checked) => {
      const current = Array.isArray(question.condition?.optionIds) ? question.condition.optionIds : [];
      const optionIds = checked
        ? [...new Set([...current, optionId])]
        : current.filter((id) => id !== optionId);
      patchCondition({ operator: ANAMNESIS_CONDITION_OPERATOR.INCLUDES_ANY, optionIds });
    },
  };
};

/** "Condição de exibição": makes a question depend on another question of the same section. */
const QuestionConditionEditor = ({ question, sectionQuestions, saving, onPatch }) => {
  const candidates = getEligibleParentCandidates(question, sectionQuestions);
  const parentQuestion = question.parentQuestionId
    ? sectionQuestions.find((q) => q.id === question.parentQuestionId) ?? null
    : null;

  const handleSelectParent = (nextParentId) => {
    if (!nextParentId) {
      onPatch({ parentQuestionId: null, condition: null });
      return;
    }
    const nextParent = sectionQuestions.find((q) => q.id === nextParentId);
    onPatch({ parentQuestionId: nextParentId, condition: buildInitialCondition(nextParent) });
  };

  return (
    <div className="condition-editor">
      <div className="condition-editor-header">
        <p className="type-overline condition-editor-title">Condição de exibição</p>
        {question.parentQuestionId && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onPatch({ parentQuestionId: null, condition: null })}
            disabled={saving}
          >
            Remover condição
          </button>
        )}
      </div>
      <div className="condition-editor-field">
        <label className="condition-editor-label type-caption-strong" htmlFor={`parent-select-${question.id}`}>
          Mostrar somente se…
        </label>
        {candidates.length === 0 && !question.parentQuestionId ? (
          <p className="condition-editor-empty type-caption">Nenhuma pergunta elegível nesta seção.</p>
        ) : (
          <ParentSelect
            question={question}
            parentQuestion={parentQuestion}
            candidates={candidates}
            saving={saving}
            onChange={handleSelectParent}
          />
        )}
      </div>
      <QuestionTriggerPicker
        question={question}
        parentQuestion={parentQuestion}
        saving={saving}
        handlers={buildTriggerHandlers(question, onPatch)}
      />
    </div>
  );
};

QuestionConditionEditor.propTypes = {
  question: PropTypes.object.isRequired,
  sectionQuestions: PropTypes.arrayOf(PropTypes.object).isRequired,
  saving: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

export default QuestionConditionEditor;
