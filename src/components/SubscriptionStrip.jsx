import PropTypes from 'prop-types';
import { Star, RefreshCw } from 'lucide-react';
import { STUB_SUBSCRIPTION } from '../constants/subscriptionStub';

const SubscriptionStrip = ({ data }) => {
  const sub = data ?? STUB_SUBSCRIPTION;
  const isWarn = sub.daysToRenewal <= sub.warnThresholdDays;

  const planChipClass = `subscription-chip${isWarn ? '' : ''}`;
  const renewalChipClass = `subscription-chip${isWarn ? ' subscription-chip--warn' : ''}`;

  return (
    <div className="subscription-strip">
      <div className={planChipClass}>
        <Star size={14} strokeWidth={2} aria-hidden="true" />
        <span className="subscription-chip-label">Plano</span>
        <span className="subscription-chip-value">{sub.planLabel}</span>
        <span className="subscription-chip-sub">{sub.planPrice}</span>
        <span className="subscription-chip-divider" aria-hidden="true" />
        <button
          type="button"
          className="subscription-chip-action"
          aria-label="Alterar plano"
        >
          Alterar
        </button>
      </div>

      <div className={renewalChipClass}>
        <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
        <span className="subscription-chip-label">Renova em</span>
        <span className="subscription-chip-value subscription-chip-value--stat">
          {sub.daysToRenewal}
          <span className="subscription-chip-days-unit">dias</span>
        </span>
        <span className="subscription-chip-sub">{sub.renewalDate}</span>
        <span className="subscription-chip-divider" aria-hidden="true" />
        <button
          type="button"
          className="subscription-chip-action"
          aria-label="Renovar plano"
        >
          Renovar
        </button>
      </div>
    </div>
  );
};

SubscriptionStrip.propTypes = {
  data: PropTypes.shape({
    planLabel: PropTypes.string,
    planPrice: PropTypes.string,
    daysToRenewal: PropTypes.number,
    renewalDate: PropTypes.string,
    warnThresholdDays: PropTypes.number,
  }),
};

export default SubscriptionStrip;
