import PropTypes from 'prop-types';
import Badge from '../ds/Badge';

// Plan status as Badges: Sem plano / Rascunho / Publicado, plus "Alterações não publicadas".
const PlanStatusBadges = ({ plan }) => {
  if (!plan) return <Badge variant="tag">Sem plano</Badge>;
  const isPublished = plan.status === 'published';
  return (
    <span className="plan-status">
      <Badge tone={isPublished ? 'success' : 'neutral'}>{isPublished ? 'Publicado' : 'Rascunho'}</Badge>
      {plan.hasUnpublishedChanges && <Badge tone="warning" variant="tag">Alterações não publicadas</Badge>}
    </span>
  );
};

PlanStatusBadges.propTypes = {
  plan: PropTypes.shape({ status: PropTypes.string, hasUnpublishedChanges: PropTypes.bool }),
};

export default PlanStatusBadges;
