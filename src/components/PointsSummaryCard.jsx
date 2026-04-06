import PropTypes from 'prop-types';
import { countDiffs } from '../utils/pointsDiff';

const PointsSummaryCard = ({ values, template, editable, onAction, showDiff }) => {
  const shouldShowDiff = showDiff !== false && !!template;
  const ptsDiffCount = shouldShowDiff ? countDiffs(values, template) : 0;
  const anonymousDiff = shouldShowDiff ? !!values.anonymousRanking !== !!template.anonymousRanking : false;
  const diffCount = ptsDiffCount + (anonymousDiff ? 1 : 0);
  const isCustomized = diffCount > 0;

  const subtitle = shouldShowDiff
    ? isCustomized
      ? `Personalizado (${diffCount} alterações)`
      : 'Usando preferências padrão'
    : null;

  const actionLabel = editable ? 'Editar' : 'Ver detalhes';

  return (
    <div className="card card--mb points-summary-card">
      <div className="points-summary-card__row">
        <div className="points-summary-card__text">
          <span className="points-summary-card__title">
            Regras de pontuação
            {isCustomized && (
              <span
                className="points-diff-dot"
                aria-label="Valores personalizados"
              />
            )}
          </span>
          {subtitle && <span className="points-summary-card__subtitle">{subtitle}</span>}
        </div>
        <button
          type="button"
          className="btn-link"
          onClick={onAction}
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

PointsSummaryCard.propTypes = {
  values: PropTypes.object.isRequired,
  template: PropTypes.object,
  editable: PropTypes.bool,
  onAction: PropTypes.func.isRequired,
};

export default PointsSummaryCard;
