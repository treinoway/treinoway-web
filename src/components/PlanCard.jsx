import PropTypes from 'prop-types';
import RowMenu from './RowMenu';
import { formatCurrencyBRL } from '../utils/currencyFormat';
import { RECURRENCE_LABEL, RECURRENCE_MONTHS } from '../utils/subscriptionHelpers';

/**
 * Athletic-Tech plan card.
 * The plan with the most active subscribers receives the `featured` variant
 * (stadium dark with radial sheen). Caller passes `featured` prop.
 */
const PlanCard = ({ plan, subscribersCount, totalRevenue, onEdit, onArchiveToggle, featured }) => {
  const months = RECURRENCE_MONTHS[plan.recurrence] || 1;
  const recurrenceLabel = plan.recurrenceLabel || RECURRENCE_LABEL[plan.recurrence] || plan.recurrence;
  const everyMonthsText = months === 1 ? 'a cada mês' : `a cada ${months} meses`;
  const archiveLabel = plan.isArchived ? 'Desarquivar' : 'Arquivar';

  const cardClass = [
    'fin-plan-card',
    featured ? 'fin-plan-card--featured' : '',
    plan.isArchived ? 'fin-plan-card--archived' : '',
  ].filter(Boolean).join(' ');

  // Split price into integer + decimal for typographic hierarchy
  const priceStr = formatCurrencyBRL(plan.price).replace(/^R\$\s*/, '').trim();
  const commaIdx = priceStr.lastIndexOf(',');
  const priceInt = commaIdx >= 0 ? priceStr.slice(0, commaIdx) : priceStr;
  const priceCents = commaIdx >= 0 ? priceStr.slice(commaIdx) : '';

  return (
    <div className={cardClass}>
      <div className="fin-plan-card-head">
        <div>
          {featured && (
            <div className="fin-plan-eyebrow">Plano destaque</div>
          )}
          <h3 className="fin-plan-name">{plan.name}</h3>
          <span className="fin-recurrence-tag">{recurrenceLabel}</span>
        </div>
        <RowMenu
          ariaLabel={`Ações do plano ${plan.name}`}
          onEdit={onEdit}
          onDelete={onArchiveToggle}
          deleteLabel={archiveLabel}
        />
      </div>

      <div className="fin-plan-price">
        <span className="fin-plan-price-currency">R$</span>
        <span className="fin-plan-price-value">
          {priceInt}{priceCents && <small>{priceCents}</small>}
        </span>
        <span className="fin-plan-price-period">{everyMonthsText}</span>
      </div>

      <div className="fin-plan-stats">
        <div className="fin-plan-stat">
          <span className="fin-plan-stat-label">Assinantes</span>
          <span className="fin-plan-stat-value">{subscribersCount ?? 0}</span>
        </div>
        {totalRevenue != null && (
          <div className="fin-plan-stat">
            <span className="fin-plan-stat-label">Receita gerada</span>
            <span className="fin-plan-stat-value">
              {formatCurrencyBRL(totalRevenue).replace(/^R\$\s*/, '').trim()}
            </span>
          </div>
        )}
      </div>

      {plan.isArchived && (
        <span className="fin-plan-archived-badge">Arquivado</span>
      )}
    </div>
  );
};

PlanCard.propTypes = {
  plan: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    recurrence: PropTypes.string.isRequired,
    recurrenceLabel: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    isArchived: PropTypes.bool,
  }).isRequired,
  subscribersCount: PropTypes.number,
  totalRevenue: PropTypes.number,
  onEdit: PropTypes.func.isRequired,
  onArchiveToggle: PropTypes.func.isRequired,
  featured: PropTypes.bool,
};

export default PlanCard;
