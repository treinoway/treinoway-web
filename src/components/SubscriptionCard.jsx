import PropTypes from 'prop-types';
import { CreditCard } from 'lucide-react';
import RowMenu from './RowMenu';
import StatusPill from './StatusPill';
import { formatCurrencyBRL } from '../utils/currencyFormat';
import {
  PAYMENT_STATUS,
  RECURRENCE_LABEL,
  RECURRENCE_MONTHS,
  deriveEffectivePaymentStatus,
  computeCyclePct,
  buildCycleLabel,
} from '../utils/subscriptionHelpers';

const STATUS_CARD_CLASS = {
  [PAYMENT_STATUS.PAID]: 'subscription-card subscription-card--paid',
  [PAYMENT_STATUS.PENDING]: 'subscription-card subscription-card--pending',
  [PAYMENT_STATUS.OVERDUE]: 'subscription-card subscription-card--overdue',
  [PAYMENT_STATUS.CANCELLED]: 'subscription-card subscription-card--cancelled',
};

const CYCLE_FILL_CLASS = {
  [PAYMENT_STATUS.PAID]: 'subscription-card-cycle-fill',
  [PAYMENT_STATUS.PENDING]: 'subscription-card-cycle-fill subscription-card-cycle-fill--pending',
  [PAYMENT_STATUS.OVERDUE]: 'subscription-card-cycle-fill subscription-card-cycle-fill--overdue',
  [PAYMENT_STATUS.CANCELLED]: 'subscription-card-cycle-fill',
};

const EYEBROW_STATUS_LABEL = {
  [PAYMENT_STATUS.PAID]: 'ATIVA',
  [PAYMENT_STATUS.PENDING]: 'PENDENTE',
  [PAYMENT_STATUS.OVERDUE]: 'ATRASADA',
  [PAYMENT_STATUS.CANCELLED]: 'CANCELADA',
};

const formatValueParts = (price) => {
  const full = formatCurrencyBRL(price).replace(/^R\$\s*/, '').trim();
  const commaIdx = full.lastIndexOf(',');
  const intPart = commaIdx >= 0 ? full.slice(0, commaIdx) : full;
  const centsPart = commaIdx >= 0 ? full.slice(commaIdx) : '';
  return { intPart, centsPart };
};

const SubscriptionCard = ({
  subscription,
  nextPayment,
  onAssign,
  onReplace,
  onCancel,
  onViewHistory,
  loading,
}) => {
  if (loading) {
    return <div className="skeleton skeleton-card subscription-card-skeleton" />;
  }

  if (!subscription) {
    return (
      <div className="subscription-card subscription-card--empty">
        <CreditCard size={32} strokeWidth={2} className="subscription-card-empty-icon" aria-hidden="true" />
        <p className="subscription-card-empty-title">Sem assinatura ativa</p>
        <button type="button" className="btn-primary" onClick={onAssign}>
          Atribuir plano
        </button>
      </div>
    );
  }

  const months = RECURRENCE_MONTHS[subscription.recurrence] || 1;
  const recurrenceLabel = subscription.recurrenceLabel || RECURRENCE_LABEL[subscription.recurrence] || '';
  const cycleText = months === 1 ? 'cobrança a cada mês' : `cobrança a cada ${months} meses`;
  const metaLine = recurrenceLabel ? `${recurrenceLabel} · ${cycleText}` : cycleText;

  const effectiveStatus = nextPayment
    ? deriveEffectivePaymentStatus(nextPayment)
    : PAYMENT_STATUS.PENDING;

  const cyclePct = nextPayment
    ? computeCyclePct(nextPayment.cycleStartDate, nextPayment.cycleEndDate)
    : null;
  const cycleLabel = nextPayment ? buildCycleLabel(effectiveStatus, nextPayment) : null;
  const showCycleTrack = cyclePct !== null || cycleLabel !== null;

  const cardClass = STATUS_CARD_CLASS[effectiveStatus] ?? 'subscription-card subscription-card--pending';
  const fillClass = CYCLE_FILL_CLASS[effectiveStatus] ?? 'subscription-card-cycle-fill';
  const eyebrowStatus = EYEBROW_STATUS_LABEL[effectiveStatus] ?? '';

  const { intPart, centsPart } = formatValueParts(subscription.price);
  const cycleUnit = months === 1 ? '/mês' : `/cada ${months}m`;

  return (
    <article className={cardClass}>
      {/* Header: eyebrow + status pill */}
      <div className="subscription-card-header">
        <span className="subscription-card-eyebrow">
          ASSINATURA · {eyebrowStatus}
        </span>
        {nextPayment && <StatusPill status={effectiveStatus} />}
      </div>

      {/* Plan title */}
      <h3 className="subscription-card-title">
        {subscription.planName || 'Plano ativo'}
      </h3>

      {/* Meta line */}
      <p className="subscription-card-meta">{metaLine}</p>

      {/* Value hero block */}
      <div className="subscription-card-value">
        <span className="subscription-card-value-currency">R$</span>
        <span className="subscription-card-value-amount">
          {intPart}
          {centsPart && <small className="subscription-card-value-cents">{centsPart}</small>}
        </span>
        <span className="subscription-card-value-cycle">{cycleUnit}</span>
      </div>

      {/* Mini cycle track */}
      {showCycleTrack && (
        <div className="subscription-card-cycle-track" aria-hidden="true">
          <div className="subscription-card-cycle-bar">
            <div
              className={fillClass}
              style={{ width: `${cyclePct ?? (effectiveStatus === PAYMENT_STATUS.OVERDUE ? 100 : 50)}%` }}
            />
          </div>
          {cycleLabel && (
            <span className="subscription-card-cycle-label">{cycleLabel}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="subscription-card-actions">
        <button type="button" className="btn-primary btn-sm" onClick={onReplace}>
          Trocar plano
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={onViewHistory}>
          Ver histórico
        </button>
        <RowMenu
          ariaLabel="Ações da assinatura"
          onDelete={onCancel}
          deleteLabel="Cancelar assinatura"
        />
      </div>
    </article>
  );
};

SubscriptionCard.propTypes = {
  subscription: PropTypes.object,
  nextPayment: PropTypes.object,
  onAssign: PropTypes.func.isRequired,
  onReplace: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default SubscriptionCard;
