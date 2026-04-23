import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { ANAMNESIS_QUESTION_TYPE } from '../constants/anamnesis';

/* ── per-type disabled input renderers ───────────────────── */

const PreviewFreeText = () => (
  <textarea
    className="form-input form-textarea"
    disabled
    placeholder="Resposta do aluno"
    rows={3}
  />
);

const PreviewDichotomous = () => (
  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
    {['Sim', 'Não'].map((label) => (
      <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'not-allowed', color: 'var(--brand-steel)' }}>
        <input type="radio" name={`preview-${label}`} disabled />
        {label}
      </label>
    ))}
  </div>
);

const PreviewSingleChoice = ({ options }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
    {(options ?? []).map((opt, i) => (
      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'not-allowed', color: 'var(--brand-steel)' }}>
        <input type="radio" name={`preview-single-${i}`} disabled />
        {opt.text}
      </label>
    ))}
    {(!options || options.length === 0) && (
      <p style={{ fontSize: 12, color: 'var(--brand-steel)' }}>Sem opções cadastradas</p>
    )}
  </div>
);

const PreviewMultipleChoice = ({ options }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
    {(options ?? []).map((opt, i) => (
      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'not-allowed', color: 'var(--brand-steel)' }}>
        <input type="checkbox" disabled />
        {opt.text}
      </label>
    ))}
    {(!options || options.length === 0) && (
      <p style={{ fontSize: 12, color: 'var(--brand-steel)' }}>Sem opções cadastradas</p>
    )}
  </div>
);

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

const renderPreviewInput = (question) => {
  switch (question.type) {
    case ANAMNESIS_QUESTION_TYPE.FREE_TEXT:
      return <PreviewFreeText />;
    case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS:
      return <PreviewDichotomous />;
    case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE:
      return <PreviewSingleChoice options={question.options} />;
    case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE:
      return <PreviewMultipleChoice options={question.options} />;
    case ANAMNESIS_QUESTION_TYPE.NUMERIC:
      return <PreviewNumeric config={question.config} />;
    case ANAMNESIS_QUESTION_TYPE.MATRIX:
      return <PreviewMatrix config={question.config} />;
    default:
      return <PreviewFreeText />;
  }
};

/* ── AnamnesisPreviewModal ───────────────────────────────── */

const AnamnesisPreviewModal = ({ anamnesis, open, onClose }) => {
  if (!open) return null;

  const sortedSections = [...(anamnesis.sections ?? [])].sort((a, b) => a.order - b.order);

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
            Visualização de como o aluno verá esta anamnese. Campos desabilitados.
          </p>

          {sortedSections.length === 0 && (
            <p style={{ color: 'var(--brand-steel)', fontSize: 14 }}>Esta anamnese não possui seções.</p>
          )}

          {sortedSections.map((section) => {
            const sortedQuestions = [...(section.questions ?? [])].sort((a, b) => a.order - b.order);
            return (
              <div key={section.id} className="preview-section">
                <h3 className="preview-section-title">{section.title}</h3>

                {sortedQuestions.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--brand-steel)' }}>Seção sem perguntas.</p>
                )}

                {sortedQuestions.map((question) => (
                  <div key={question.id} className="preview-question">
                    <p className="preview-question-label">
                      {question.text}
                      {question.required && (
                        <span className="preview-question-required" aria-label="obrigatória">*</span>
                      )}
                    </p>
                    {renderPreviewInput(question)}
                  </div>
                ))}
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
  options: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })),
  config: PropTypes.shape({
    min: PropTypes.number,
    max: PropTypes.number,
    unit: PropTypes.string,
    rows: PropTypes.arrayOf(PropTypes.string),
    columns: PropTypes.arrayOf(PropTypes.string),
  }),
});

PreviewSingleChoice.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })),
};

PreviewMultipleChoice.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })),
};

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
