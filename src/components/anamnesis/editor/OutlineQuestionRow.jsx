import PropTypes from 'prop-types';
import { GripVertical, Trash2 } from 'lucide-react';

const OutlineQuestionRow = ({ question, active, readOnly, onSelect, onDelete }) => {
  const isConditional = Boolean(question.parentQuestionId);
  const classes = [
    'outline-question-btn',
    active && 'outline-question-btn--active',
    isConditional && 'outline-question-btn--conditional',
  ].filter(Boolean).join(' ');

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect();
  };

  return (
    <div role="button" tabIndex={0} className={classes} onClick={onSelect} onKeyDown={handleKeyDown}>
      <span className="outline-grip--inert" aria-hidden="true">
        <GripVertical size={16} strokeWidth={2} />
      </span>
      <span className="outline-question-label type-caption">{question.text}</span>
      {isConditional && (
        <span className="outline-conditional-badge type-caption-strong" aria-label="Pergunta condicional" title="Condicional">
          ↳ condicional
        </span>
      )}
      {!readOnly && (
        <span className="outline-inline-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="outline-inline-action outline-inline-action--danger"
            aria-label={`Excluir pergunta ${question.text}`}
            onClick={onDelete}
          >
            <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </span>
      )}
    </div>
  );
};

OutlineQuestionRow.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string,
    text: PropTypes.string,
    parentQuestionId: PropTypes.string,
  }).isRequired,
  active: PropTypes.bool,
  readOnly: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default OutlineQuestionRow;
