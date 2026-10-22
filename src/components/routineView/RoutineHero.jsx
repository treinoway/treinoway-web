import PropTypes from 'prop-types';
import { Pencil } from 'lucide-react';
import Badge from '../ds/Badge';
import SkeletonText from '../ds/SkeletonText';
import RowMenu from '../RowMenu';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';
import { getLevelLabel } from '../../constants/trainingLevels';

const HeroSkeleton = () => (
  <>
    <h1 className="routine-hero__name type-h1">
      <SkeletonText typeClass="type-h1" />
      <span className="visually-hidden">Carregando...</span>
    </h1>
    <SkeletonText typeClass="type-caption" />
  </>
);

const HeroMeta = ({ template }) => {
  const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
  const levelLabel = template.trainingLevel ? getLevelLabel(template.trainingLevel) : null;
  if (!typeLabel && !levelLabel) return null;

  return (
    <div className="routine-hero__meta">
      {typeLabel && <Badge variant="tag" tone="brand">{typeLabel}</Badge>}
      {levelLabel && <Badge variant="tag" tone="neutral">{levelLabel}</Badge>}
    </div>
  );
};

HeroMeta.propTypes = { template: PropTypes.object.isRequired };

/** Routine header: name, type/level tags, description and the Editar / row-menu actions. */
const RoutineHero = ({ template, onEdit, onDelete }) => (
  <header className="routine-hero" aria-busy={!template}>
    <div className="routine-hero__identity">
      {template ? (
        <>
          <h1 className="routine-hero__name type-h1">{template.name}</h1>
          <HeroMeta template={template} />
          {template.description && (
            <p className="routine-hero__description type-body">{template.description}</p>
          )}
        </>
      ) : (
        <HeroSkeleton />
      )}
    </div>
    {template && (
      <div className="routine-hero__actions">
        <button type="button" className="btn btn--primary" onClick={onEdit}>
          <Pencil size={16} strokeWidth={2} aria-hidden="true" />
          Editar
        </button>
        <RowMenu ariaLabel="Mais ações da rotina" onDelete={onDelete} />
      </div>
    )}
  </header>
);

RoutineHero.propTypes = {
  template: PropTypes.object,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default RoutineHero;
