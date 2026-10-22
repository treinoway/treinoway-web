import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import { ANAMNESIS_QUESTION_TYPE } from '../../../constants/anamnesis';
import { QUESTION_PRESETS, buildQuestionPayload } from '../../../constants/anamnesisEditor';

const BoardText = ({ eyebrow, title, description }) => (
  <>
    <p className="canvas-empty-board-eyebrow type-overline">{eyebrow}</p>
    <h2 className="canvas-empty-board-title type-h2">{title}</h2>
    <p className="canvas-empty-board-desc type-body">{description}</p>
  </>
);

BoardText.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};

const ReadOnlyBoard = () => (
  <div className="canvas-empty-board">
    <BoardText
      eyebrow="SOMENTE LEITURA"
      title="Esta anamnese geral não pode ser editada"
      description="Use “Copiar para minha coleção” para criar uma versão editável."
    />
  </div>
);

const NoSectionBoard = ({ sectionTitle, saving, onTitleChange, onSubmit }) => (
  <div className="canvas-empty-board">
    <BoardText
      eyebrow="PASSO 1 DE 3"
      title="Crie sua primeira seção"
      description="Seções organizam perguntas por tema — histórico, treino, lesões."
    />
    <form onSubmit={onSubmit} className="canvas-empty-board-form">
      <input
        type="text"
        className="input"
        placeholder="Ex: Histórico clínico"
        value={sectionTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="Título da seção"
        required
        disabled={saving}
      />
      <button type="submit" className="btn btn--primary" disabled={saving}>
        {!saving && <Plus size={16} strokeWidth={2} aria-hidden="true" />}
        {saving ? 'Criando...' : 'Criar primeira seção'}
      </button>
    </form>
  </div>
);

const NoQuestionBoard = ({ section, onAddQuestion }) => (
  <div className="canvas-empty-board">
    <BoardText
      eyebrow={section ? section.title.toUpperCase() : ''}
      title="Adicione a primeira pergunta"
      description="Escolha um tipo à direita ou use um preset abaixo."
    />
    <div className="canvas-empty-board-shortcuts">
      <button type="button" className="btn btn--secondary" onClick={() => onAddQuestion(buildQuestionPayload(ANAMNESIS_QUESTION_TYPE.FREE_TEXT))}>
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Texto livre
      </button>
      <button type="button" className="btn btn--secondary" onClick={() => onAddQuestion(buildQuestionPayload(ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS))}>
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Sim/Não
      </button>
    </div>
    <div className="canvas-empty-board-presets">
      {QUESTION_PRESETS.map(({ text, type }) => (
        <button key={text} type="button" className="preset-row type-body" onClick={() => onAddQuestion(buildQuestionPayload(type, text))}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          {text}
        </button>
      ))}
    </div>
  </div>
);

NoSectionBoard.propTypes = {
  sectionTitle: PropTypes.string.isRequired,
  saving: PropTypes.bool,
  onTitleChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

NoQuestionBoard.propTypes = {
  section: PropTypes.shape({ title: PropTypes.string }),
  onAddQuestion: PropTypes.func.isRequired,
};

/** Empty states of the canvas: read-only (general), no section yet, section without questions. */
const CanvasEmptyBoard = ({ variant, ...props }) => {
  if (variant === 'read-only') return <ReadOnlyBoard />;
  if (variant === 'no-section') return <NoSectionBoard {...props} />;
  return <NoQuestionBoard {...props} />;
};

CanvasEmptyBoard.propTypes = {
  variant: PropTypes.oneOf(['read-only', 'no-section', 'no-question']).isRequired,
};

export default CanvasEmptyBoard;
