import PropTypes from 'prop-types';
import { Type, ToggleLeft, List, CheckSquare, Hash, Plus } from 'lucide-react';
import { ANAMNESIS_QUESTION_TYPE, CREATABLE_QUESTION_TYPES } from '../../constants/anamnesis';
import { QUESTION_PRESETS, buildQuestionPayload } from '../../constants/anamnesisEditor';

const TILE_META = {
  [ANAMNESIS_QUESTION_TYPE.FREE_TEXT]: { icon: Type, label: 'Texto livre' },
  [ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS]: { icon: ToggleLeft, label: 'Sim / Não' },
  [ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE]: { icon: List, label: 'Escolha única' },
  [ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE]: { icon: CheckSquare, label: 'Múltipla escolha' },
  [ANAMNESIS_QUESTION_TYPE.NUMERIC]: { icon: Hash, label: 'Numérico' },
};

const LIBRARY_TILES = CREATABLE_QUESTION_TYPES.map((type) => ({ type, ...TILE_META[type] }));

/** Right panel: question types and suggested presets that add a question to the active section. */
const AnamnesisLibraryPanel = ({ disabled, onAddQuestion }) => (
  <div className="editor-library">
    <p className="library-section-title type-overline">Tipos de pergunta</p>
    <div className="library-grid">
      {LIBRARY_TILES.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          type="button"
          className="library-tile"
          disabled={disabled}
          onClick={() => onAddQuestion(buildQuestionPayload(type))}
          aria-label={`Adicionar pergunta ${label}`}
        >
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
          <span className="library-tile-label type-caption-strong">{label}</span>
        </button>
      ))}
    </div>
    <p className="library-section-title type-overline">Presets sugeridos</p>
    <div className="library-presets">
      {QUESTION_PRESETS.map(({ text, type }) => (
        <button
          key={text}
          type="button"
          className="preset-row type-body"
          disabled={disabled}
          onClick={() => onAddQuestion(buildQuestionPayload(type, text))}
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          {text}
        </button>
      ))}
    </div>
  </div>
);

AnamnesisLibraryPanel.propTypes = {
  disabled: PropTypes.bool,
  onAddQuestion: PropTypes.func.isRequired,
};

export default AnamnesisLibraryPanel;
