import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { ANAMNESIS_QUESTION_TYPE, isQuestionVisible } from '../constants/anamnesis';

/* ── per-type disabled input renderers ───────────────────── */

const PreviewFreeText = () => (
  <textarea
    className="form-input form-textarea"
    disabled
    placeholder="Resposta do aluno"
    rows={3}
  />
);

/**
 * Dichotomous preview — interactive so the trainer can toggle parent answers
 * and see conditional children appear / disappear.
 */
const PreviewDichotomous = ({ questionId, value, onChange }) => (
  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer', color: 'var(--brand-ink)' }}>
      <input
        type="radio"
        name={`preview-dich-${questionId}`}
        value="yes"
        checked={value === 'yes'}
        onChange={() => onChange('yes')}
      />
      Sim
    </label>
    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer', color: 'var(--brand-ink)' }}>
      <input
        type="radio"
        name={`preview-dich-${questionId}`}
        value="no"
        checked={value === 'no'}
        onChange={() => onChange('no')}
      />
      Não
    </label>
  </div>
);

PreviewDichotomous.propTypes = {
  questionId: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

const PreviewSingleChoice = ({ questionId, options, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
    {(options ?? []).map((opt) => (
      <label key={opt.id ?? opt.text} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer', color: 'var(--brand-ink)' }}>
        <input
          type="radio"
          name={`preview-single-${questionId}`}
          value={opt.id ?? opt.text}
          checked={value === (opt.id ?? opt.text)}
          onChange={() => onChange(opt.id ?? opt.text)}
        />
        {opt.text}
      </label>
    ))}
    {(!options || options.length === 0) && (
      <p style={{ fontSize: 12, color: 'var(--brand-steel)' }}>Sem opções cadastradas</p>
    )}
  </div>
);

PreviewSingleChoice.propTypes = {
  questionId: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, text: PropTypes.string })),
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

const PreviewMultipleChoice = ({ options, value, onChange }) => {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
      {(options ?? []).map((opt) => {
        const optValue = opt.id ?? opt.text;
        const isChecked = selected.includes(optValue);
        return (
          <label key={optValue} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer', color: 'var(--brand-ink)' }}>
            <input
              type="checkbox"
              value={optValue}
              checked={isChecked}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, optValue]);
                else onChange(selected.filter((v) => v !== optValue));
              }}
            />
            {opt.text}
          </label>
        );
      })}
      {(!options || options.length === 0) && (
        <p style={{ fontSize: 12, color: 'var(--brand-steel)' }}>Sem opções cadastradas</p>
      )}
    </div>
  );
};

PreviewMultipleChoice.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, text: PropTypes.string })),
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
};

const PreviewNumeric = ({ config }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
    <input
      type="number"
      className="form-input"
      disabled
      placeholder={config?.min != null && config?.max != null ? `ex: ${config.min}–${config.max}` : 'ex: 70'}
      style={{ maxWidth: 120 }}
    />
    {config?.unit && (
      <span className="eyebrow" style={{ color: 'var(--brand-steel)' }}>{config.unit}</span>
    )}
  </div>
);

const PreviewMatrix = ({ config }) => {
  const rows    = config?.rows    ?? [];
  const columns = config?.columns ?? [];
  if (!rows.length && !columns.length) {
    return <p style={{ fontSize: 12, color: 'var(--brand-steel)' }}>Configuração de matriz não definida</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: 'var(--spacing-xs)', background: 'var(--brand-mist)', border: '1px solid var(--brand-divider)', textAlign: 'left' }} />
            {columns.map((col, i) => (
              <th key={i} style={{ padding: 'var(--spacing-xs)', background: 'var(--brand-mist)', border: '1px solid var(--brand-divider)', color: 'var(--brand-steel)', fontWeight: 600 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td style={{ padding: 'var(--spacing-xs)', border: '1px solid var(--brand-divider)', color: 'var(--brand-ink)', fontWeight: 500 }}>{row}</td>
              {columns.map((_, ci) => (
                <td key={ci} style={{ padding: 'var(--spacing-xs)', border: '1px solid var(--brand-divider)', textAlign: 'center' }}>
                  <input type="radio" disabled />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const renderPreviewInput = (question, answers, setAnswer) => {
  const value = answers[question.id];
  const onChange = (next) => setAnswer(question.id, next);
  switch (question.type) {
    case ANAMNESIS_QUESTION_TYPE.FREE_TEXT:
      return <PreviewFreeText />;
    case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS:
      return <PreviewDichotomous questionId={question.id} value={value} onChange={onChange} />;
    case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE:
      return <PreviewSingleChoice questionId={question.id} options={question.options} value={value} onChange={onChange} />;
    case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE:
      return <PreviewMultipleChoice options={question.options} value={value} onChange={onChange} />;
    case ANAMNESIS_QUESTION_TYPE.NUMERIC:
      return <PreviewNumeric config={question.config} />;
    case ANAMNESIS_QUESTION_TYPE.MATRIX:
      return <PreviewMatrix config={question.config} />;
    default:
      return <PreviewFreeText />;
  }
};

/** Human-readable trigger value for the condition hint. */
const formatConditionValue = (parentQuestion, condition) => {
  if (!parentQuestion || !condition) return '';
  if (parentQuestion.type === ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS) {
    if (condition.value === 'yes') return 'Sim';
    if (condition.value === 'no') return 'Não';
    return String(condition.value ?? '');
  }
  if (parentQuestion.type === ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE) {
    const match = (parentQuestion.options ?? []).find((opt) => opt.id === condition.optionId);
    return match?.text ?? '';
  }
  if (parentQuestion.type === ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE) {
    const ids = Array.isArray(condition.optionIds) ? condition.optionIds : [];
    const texts = ids
      .map((id) => (parentQuestion.options ?? []).find((opt) => opt.id === id)?.text)
      .filter(Boolean);
    return texts.join(' ou ');
  }
  return '';
};

/* ── AnamnesisPreviewModal ───────────────────────────────── */

const AnamnesisPreviewModal = ({ anamnesis, open, onClose }) => {
  const [answers, setAnswers] = useState({});

  const sortedSections = useMemo(
    () => [...(anamnesis?.sections ?? [])].sort((a, b) => a.order - b.order),
    [anamnesis],
  );

  const allQuestions = useMemo(
    () => sortedSections.flatMap((s) => [...(s.questions ?? [])].sort((a, b) => a.order - b.order)),
    [sortedSections],
  );

  const questionById = useMemo(() => {
    const map = {};
    for (const q of allQuestions) map[q.id] = q;
    return map;
  }, [allQuestions]);

  if (!open) return null;

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      // Clear stale values for now-hidden children to keep preview in sync.
      for (const q of allQuestions) {
        if (!q.parentQuestionId) continue;
        if (!isQuestionVisible(q, next) && next[q.id] !== undefined) {
          delete next[q.id];
        }
      }
      return next;
    });
  };

  return (
    <div
      className="overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pré-visualização da anamnese"
    >
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-header">
          <div>
            <p className="eyebrow" style={{ marginBottom: 2 }}>Pré-visualização</p>
            <h2 style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 700, color: 'var(--brand-ink)', margin: 0 }}>
              {anamnesis.title}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Fechar pré-visualização"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="preview-modal-body">
          <p style={{ fontSize: 12, color: 'var(--brand-steel)', marginBottom: 'var(--spacing-lg)' }}>
            Visualização de como o aluno verá esta anamnese. Experimente responder para ver perguntas condicionais aparecerem.
          </p>

          {sortedSections.length === 0 && (
            <p style={{ color: 'var(--brand-steel)', fontSize: 14 }}>Esta anamnese não possui seções.</p>
          )}

          {sortedSections.map((section) => {
            const sortedQuestions = [...(section.questions ?? [])]
              .sort((a, b) => a.order - b.order)
              .filter((q) => isQuestionVisible(q, answers));
            return (
              <div key={section.id} className="preview-section">
                <h3 className="preview-section-title">{section.title}</h3>

                {sortedQuestions.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--brand-steel)' }}>Seção sem perguntas visíveis.</p>
                )}

                {sortedQuestions.map((question) => {
                  const parentQ = question.parentQuestionId ? questionById[question.parentQuestionId] : null;
                  const isConditional = Boolean(parentQ && question.condition);
                  const triggerText = isConditional ? formatConditionValue(parentQ, question.condition) : '';
                  return (
                    <div key={question.id} className="preview-question">
                      {isConditional && (
                        <span className="preview-question-conditional-hint">
                          Condicional: mostrado se «{parentQ.text}» = «{triggerText}»
                        </span>
                      )}
                      <p className="preview-question-label">
                        {question.text}
                        {question.required && (
                          <span className="preview-question-required" aria-label="obrigatória">*</span>
                        )}
                      </p>
                      {renderPreviewInput(question, answers, setAnswer)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const questionShape = PropTypes.shape({
  id: PropTypes.string,
  type: PropTypes.string,
  text: PropTypes.string,
  required: PropTypes.bool,
  options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, text: PropTypes.string })),
  config: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
    unit: PropTypes.string,
    rows: PropTypes.arrayOf(PropTypes.string),
    columns: PropTypes.arrayOf(PropTypes.string),
  }),
  parentQuestionId: PropTypes.string,
  condition: PropTypes.object,
});

PreviewNumeric.propTypes = {
  config: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
    unit: PropTypes.string,
  }),
};

PreviewMatrix.propTypes = {
  config: PropTypes.shape({
    rows: PropTypes.arrayOf(PropTypes.string),
    columns: PropTypes.arrayOf(PropTypes.string),
  }),
};

AnamnesisPreviewModal.propTypes = {
  anamnesis: PropTypes.shape({
    title: PropTypes.string,
    sections: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string,
      order: PropTypes.number,
      questions: PropTypes.arrayOf(questionShape),
    })),
  }).isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AnamnesisPreviewModal;
