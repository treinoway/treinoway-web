import PropTypes from 'prop-types';
import { Copy, Eye, Send } from 'lucide-react';
import Badge from '../ds/Badge';
import RowMenu from '../RowMenu';

const HeaderBadges = ({ anamnesis }) => (
  <div className="anamnesis-editor__badges">
    <Badge tone="neutral" variant="tag">v{anamnesis.version}</Badge>
    {anamnesis.isGeneral && <Badge tone="warning" variant="tag">Geral</Badge>}
    {anamnesis.parentId && !anamnesis.isGeneral && <Badge tone="neutral" variant="tag">Derivada</Badge>}
  </div>
);

HeaderBadges.propTypes = { anamnesis: PropTypes.object.isRequired };

const buildMenuItems = ({ isGeneral, forking, onAssign, onFork }) => (
  isGeneral
    ? [{ label: 'Enviar para alunos', onClick: onAssign }]
    : [{ label: forking ? 'Criando...' : 'Nova versão', onClick: onFork, disabled: forking }]
);

const PrimaryAction = ({ isGeneral, copying, onAssign, onCopy }) => (
  isGeneral ? (
    <button type="button" className="btn btn--primary" onClick={onCopy} disabled={copying}>
      <Copy size={16} strokeWidth={2} aria-hidden="true" />
      {copying ? 'Copiando...' : 'Copiar para minha coleção'}
    </button>
  ) : (
    <button type="button" className="btn btn--primary" onClick={onAssign}>
      <Send size={16} strokeWidth={2} aria-hidden="true" />
      Enviar para alunos
    </button>
  )
);

PrimaryAction.propTypes = {
  isGeneral: PropTypes.bool,
  copying: PropTypes.bool,
  onAssign: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

/**
 * Editor header: title + badges and the actions. One primary (copy for general anamneses,
 * send to students otherwise), "Pré-visualizar" as secondary and the rest in the row menu.
 */
const AnamnesisEditorHeader = ({
  anamnesis,
  hasSections,
  forking = false,
  copying = false,
  onPreview,
  onAssign,
  onFork,
  onCopy,
}) => {
  const isGeneral = Boolean(anamnesis.isGeneral);
  return (
    <header className="anamnesis-editor__header">
      <div className="anamnesis-editor__heading">
        <h1 className="editor-page__title type-h1">{anamnesis.title}</h1>
        <HeaderBadges anamnesis={anamnesis} />
        {isGeneral && (
          <p className="anamnesis-editor__note type-body">
            Esta é uma anamnese geral da plataforma e não pode ser editada.
          </p>
        )}
      </div>
      <div className="ds-page-header__actions">
        <button type="button" className="btn btn--secondary" onClick={onPreview} disabled={!hasSections}>
          <Eye size={16} strokeWidth={2} aria-hidden="true" />
          Pré-visualizar
        </button>
        <PrimaryAction isGeneral={isGeneral} copying={copying} onAssign={onAssign} onCopy={onCopy} />
        <RowMenu
          ariaLabel="Mais ações da anamnese"
          extraItems={buildMenuItems({ isGeneral, forking, onAssign, onFork })}
        />
      </div>
    </header>
  );
};

AnamnesisEditorHeader.propTypes = {
  anamnesis: PropTypes.shape({
    title: PropTypes.string,
    version: PropTypes.number,
    isGeneral: PropTypes.bool,
    parentId: PropTypes.string,
  }).isRequired,
  hasSections: PropTypes.bool,
  forking: PropTypes.bool,
  copying: PropTypes.bool,
  onPreview: PropTypes.func.isRequired,
  onAssign: PropTypes.func.isRequired,
  onFork: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
};

export default AnamnesisEditorHeader;
