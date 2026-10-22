import { useState } from 'react';
import PropTypes from 'prop-types';
import { Trash2 } from 'lucide-react';

const QuestionOptionsEditor = ({ options, readOnly, saving, onChange }) => {
  const [newOption, setNewOption] = useState('');

  const handleAdd = async () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    setNewOption('');
    await onChange([...options, { text: trimmed }]);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    handleAdd();
  };

  return (
    <div className="question-options">
      <ul className="options-list">
        {options.map((option, index) => (
          <li key={index} className="options-list-item">
            <span className="options-list-item-text type-body">{option.text}</span>
            {!readOnly && (
              <button
                type="button"
                className="icon-button options-list-item-remove"
                onClick={() => onChange(options.filter((_, i) => i !== index))}
                disabled={saving}
                aria-label={`Remover opção ${option.text}`}
              >
                <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="options-list-add">
          <input
            type="text"
            className="input"
            placeholder="Nova opção..."
            aria-label="Nova opção"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
          />
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleAdd}
            disabled={saving || !newOption.trim()}
          >
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
};

QuestionOptionsEditor.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })).isRequired,
  readOnly: PropTypes.bool,
  saving: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

export default QuestionOptionsEditor;
