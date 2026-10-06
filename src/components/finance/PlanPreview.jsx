import PropTypes from 'prop-types';
import {
  RECURRENCE_PERIOD_LABEL,
  computeNetAmountCents,
  formatCentsBRL,
  formatDiscountLine,
} from '../../utils/subscriptionHelpers';

/**
 * Summary box ("Valor cobrado" / "Valor por ciclo"): the net amount in integer
 * cents (half-up, backend parity), the period and the discount line. Shows "—"
 * while the price is invalid. Sits after the fields: it confirms, it does not lead.
 */
const PlanPreview = ({ title, priceCents, percentHundredths = null, discountCents = null, recurrence }) => {
  const discount = { percentHundredths, discountCents };
  const netCents = computeNetAmountCents(priceCents, discount);
  const discountLine = formatDiscountLine(priceCents, discount);

  return (
    <div className="plan-summary" aria-live="polite">
      <span className="plan-summary__label type-overline">{title}</span>
      <p className="plan-price">
        <span className="plan-price__value type-h2">{formatCentsBRL(netCents)}</span>
        {netCents !== null && <span className="plan-price__period type-body">{RECURRENCE_PERIOD_LABEL[recurrence]}</span>}
      </p>
      {discountLine && <p className="plan-summary__line type-caption">{discountLine}</p>}
    </div>
  );
};

PlanPreview.propTypes = {
  title: PropTypes.string.isRequired,
  priceCents: PropTypes.number,
  percentHundredths: PropTypes.number,
  discountCents: PropTypes.number,
  recurrence: PropTypes.string.isRequired,
};

export default PlanPreview;
