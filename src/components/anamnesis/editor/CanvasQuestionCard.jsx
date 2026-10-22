import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Trash2 } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { translateError } from '../../../i18n';
import api from '../../../api/axios';
import Toggle from '../../ds/Toggle';
import {
  ANAMNESIS_QUESTION_TYPE as QUESTION_TYPE,
  QUESTION_TYPES_WITH_OPTIONS,
} from '../../../constants/anamnesis';
import { buildTypeEyebrow, hasDependents, isStudentLinksConflict } from '../../../utils/anamnesisEditor';
import QuestionOptionsEditor from './QuestionOptionsEditor';
import QuestionNumericConfig from './QuestionNumericConfig';
import QuestionConditionEditor from './QuestionConditionEditor';

const TYPE_LOCKED_HINT = 'Não é possível alterar o tipo enquanto houver perguntas condicionais vinculadas.';

const DichotomousPreview = () => (
  <div className="choice-options">
    <div className="choice-option choice-option--active type-body-strong">Sim</div>
    <div className="choice-option type-body-strong">Não</div>
  </div>
);

const QuestionTypeBody = ({ question, readOnly, saving, onPatch }) => {
  const { type, config } = question;
  const handleNumericBlur = (field) => (event) =>
    onPatch({ config: { ...(config ?? {}), [field]: event.target.value } });

  if (type === QUESTION_TYPE.DICHOTOMOUS) return <DichotomousPreview />;
  if (type === QUESTION_TYPE.NUMERIC) {
    return <QuestionNumericConfig config={config} disabled={readOnly || saving} onFieldBlur={handleNumericBlur} />;
  }
  if (type === QUESTION_TYPE.MATRIX) {
    return (
      <p className="type-body text-light">
        Este tipo foi descontinuado e não pode mais ser criado. Você ainda pode editar o texto e a obrigatoriedade.
      </p>
    );
  }
  if (type === QUESTION_TYPE.FREE_TEXT) {
    return (
      <textarea
        className="input question-card-free-text"
        disabled
        placeholder="Resposta do aluno..."
        aria-label="Prévia da resposta do aluno"
        rows={3}
      />
    );
  }
  if (!QUESTION_TYPES_WITH_OPTIONS.includes(type)) return null;
  return (
    <QuestionOptionsEditor
      options={question.options ?? []}
      readOnly={readOnly}
      saving={saving}
      onChange={(options) => onPatch({ options })}
    />
  );
};

QuestionTypeBody.propTypes = {
  question: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
  saving: PropTypes.bool,
  onPatch: PropTypes.func.isRequired,
};

const QuestionTitle = ({ question, readOnly, saving, titleRef, onCommit }) => {
  const [localText, setLocalText] = useState(question.text);
  if (readOnly) {
    return <p className="question-card-title question-card-title--static type-h3">{question.text}</p>;
  }
  const handleBlur = () => {
    const trimmed = localText.trim();
    if (trimmed && trimmed !== question.text) onCommit(trimmed);
  };
  return (
    <textarea
      ref={titleRef}
      className="question-card-title type-h3"
      value={localText}
      onChange={(e) => setLocalText(e.target.value)}
      onBlur={handleBlur}
      disabled={saving}
      rows={2}
      aria-label="Texto da pergunta"
    />
  );
};

QuestionTitle.propTypes = {
  question: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
  saving: PropTypes.bool,
  titleRef: PropTypes.object,
  onCommit: PropTypes.func.isRequired,
};

const usePatchQuestion = ({ anamnesisId, sectionId, questionId, onUpdated }) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const patch = useCallback(async (payload) => {
    setSaving(true);
    try {
      await api.patch(
        `/trainer/anamneses/${anamnesisId}/sections/${sectionId}/questions/${questionId}`,
        payload,
      );
      onUpdated();
    } catch (error) {
      if (isStudentLinksConflict(error)) onUpdated('conflict');
      else showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  }, [anamnesisId, sectionId, questionId, onUpdated, showToast]);
  return { saving, patch };
};

const CanvasQuestionCard = ({
  question,
  sectionId,
  anamnesisId,
  isGeneral = false,
  autoFocus = false,
  onAutoFocusConsumed,
  onUpdated,
  onDeleteQuestion,
  sectionQuestions = [],
}) => {
  const titleRef = useRef(null);
  const { saving, patch } = usePatchQuestion({ anamnesisId, sectionId, questionId: question.id, onUpdated });

  useEffect(() => {
    if (!autoFocus || !titleRef.current) return;
    titleRef.current.focus();
    titleRef.current.select();
    onAutoFocusConsumed?.();
  }, [question.id, autoFocus, onAutoFocusConsumed]);

  return (
    <div className="question-card">
      <div className="question-card-header">
        <p className="question-card-eyebrow type-overline">{buildTypeEyebrow(question)}</p>
        {!isGeneral && (
          <button type="button" className="btn btn--ghost question-card-delete" onClick={onDeleteQuestion} disabled={saving}>
            <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            Excluir pergunta
          </button>
        )}
      </div>
      <QuestionTitle
        key={question.id}
        question={question}
        readOnly={isGeneral}
        saving={saving}
        titleRef={titleRef}
        onCommit={(text) => patch({ text })}
      />
      <div className="question-toggles">
        <Toggle
          checked={Boolean(question.required)}
          onChange={() => patch({ required: !question.required })}
          label="Obrigatória"
          disabled={isGeneral || saving}
        />
        <span className="type-body-strong">Obrigatória</span>
      </div>
      <QuestionTypeBody question={question} readOnly={isGeneral} saving={saving} onPatch={patch} />
      {hasDependents(question, sectionQuestions) && !isGeneral && (
        <p className="question-card-type-locked-hint type-caption" title={TYPE_LOCKED_HINT}>{TYPE_LOCKED_HINT}</p>
      )}
      {!isGeneral && (
        <QuestionConditionEditor
          question={question}
          sectionQuestions={sectionQuestions}
          saving={saving}
          onPatch={patch}
        />
      )}
    </div>
  );
};

CanvasQuestionCard.propTypes = {
  question: PropTypes.shape({ id: PropTypes.string, text: PropTypes.string, required: PropTypes.bool }).isRequired,
  sectionId: PropTypes.string.isRequired,
  anamnesisId: PropTypes.string.isRequired,
  isGeneral: PropTypes.bool,
  autoFocus: PropTypes.bool,
  onAutoFocusConsumed: PropTypes.func,
  onUpdated: PropTypes.func.isRequired,
  onDeleteQuestion: PropTypes.func.isRequired,
  sectionQuestions: PropTypes.arrayOf(PropTypes.object),
};

export default CanvasQuestionCard;
