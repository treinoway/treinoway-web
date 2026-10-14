import PropTypes from 'prop-types';
import {
  RECURRENCE_PERIOD_LABEL,
  computeNetFromApi,
  formatCentsBRL,
  formatDiscountLine,
  toCents,
} from '../../utils/subscriptionHelpers';

/**
 * Net price per cycle of a plan or subscription snapshot ("R$ 66,60 por mês")
 * plus the discount line ("R$ 99,90 − 33,33%"). Integer-cents half-up math —
 * never `Number * Number`.
 */
const PlanPrice = ({ entity }) => {
  const discountLine = formatDiscountLine(toCents(entity.price), {
    percentHundredths: toCents(entity.discountPercent),
    discountCents: toCents(entity.discountAmount),
  });

  return (
    <div className="plan-price-block">
      <p className="plan-price">
        <span className="plan-price__value type-h2">{formatCentsBRL(computeNetFromApi(entity))}</span>
        <span className="plan-price__period type-body">{RECURRENCE_PERIOD_LABEL[entity.recurrence]}</span>
      </p>
      {discountLine && <p className="plan-price__discount type-caption">{discountLine}</p>}
    </div>
  );
};

const money = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

PlanPrice.propTypes = {
  entity: PropTypes.shape({
    recurrence: PropTypes.string,
    price: money,
    discountPercent: money,
    discountAmount: money,
  }).isRequired,
};

export default PlanPrice;
