import PropTypes from 'prop-types';
import RowMenu from './RowMenu';
import { formatCurrencyBRL } from '../utils/currencyFormat';
import { formatDateForDisplay } from '../utils/dateFormat';
import { PAYMENT_STATUS, todayDateString } from '../utils/subscriptionHelpers';

const STATUS_PILL_CLASS = {
  [PAYMENT_STATUS.PAID]: 'fin-status-pill fin-status-pill--paid',
  [PAYMENT_STATUS.PENDING]: 'fin-status-pill fin-status-pill--pending',
  [PAYMENT_STATUS.OVERDUE]: 'fin-status-pill fin-status-pill--overdue',
  [PAYMENT_STATUS.CANCELLED]: 'fin-status-pill fin-status-pill--cancelled',
};

const STATUS_LABEL = {
  [PAYMENT_STATUS.PAID]: 'Pago',
  [PAYMENT_STATUS.PENDING]: 'Pendente',
  [PAYMENT_STATUS.OVERDUE]: 'Atrasado',
  [PAYMENT_STATUS.CANCELLED]: 'Cancelado',
};

const ROW_STATUS_CLASS = {
  [PAYMENT_STATUS.PAID]: 'fin-payment-row fin-payment-row--paid',
  [PAYMENT_STATUS.PENDING]: 'fin-payment-row fin-payment-row--pending',
  [PAYMENT_STATUS.OVERDUE]: 'fin-payment-row fin-payment-row--overdue',
  [PAYMENT_STATUS.CANCELLED]: 'fin-payment-row',
};

/**
 * Compute progress through the billing cycle as a 0–100 percentage.
 * Returns null when dates are unavailable.
 */
const computeCyclePct = (cycleStartDate, cycleEndDate) => {
  if (!cycleStartDate || !cycleEndDate) return null;
  const today = todayDateString();
  if (today <= cycleStartDate) return 0;
  if (today >= cycleEndDate) return 100;
  const start = new Date(cycleStartDate).getTime();
  const end = new Date(cycleEndDate).getTime();
  const now = new Date(today).getTime();
  const total = end - start;
  if (total <= 0) return 100;
  return Math.round(((now - start) / total) * 100);
};

/**
 * Human-readable label for the cycle track:
 * "Vence em Xd" / "Venceu há Xd" / "Pago em DD/MM"
 */
const buildCycleLabel = (effectiveStatus, payment) => {
  if (effectiveStatus === PAYMENT_STATUS.PAID) {
    const date = payment.paidAt ? formatDateForDisplay(payment.paidAt.slice(0, 10)) : null;
    return date ? `Pago em ${date}` : 'Pago';
  }
  const ref = payment.cycleEndDate || payment.dueDate;
  if (!ref) return null;
  const today = todayDateString();
  const diffDays = Math.round(
    (new Date(ref).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) return `Venceu há ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Vence hoje';
  return `Vence em ${diffDays}d`;
};

/**
 * Athletic-Tech payment row.
 *
 * Design spec:
 * - border-left encodes status (overdue=accent, pending=primary, paid=stadium-accent)
 * - avatar: circular Space Grotesk gradient slate→ink
 * - cycle mini-track (desktop ≥768px only): progress bar + "Vence em Xd" label
 * - amount: stat font tabular-nums with small R$ prefix
 * - status pill: dot + pulse animation on overdue
 */
const PaymentRow = ({
  payment,
  effectiveStatus,
  studentName,
  studentInitials,
  planName,
  recurrenceLabel,
  isMutating,
  onMarkPaid,
  onMarkPending,
  onViewHistory,
}) => {
  const isPaid = effectiveStatus === PAYMENT_STATUS.PAID;
  const isOverdue = effectiveStatus === PAYMENT_STATUS.OVERDUE;

  const cyclePct = computeCyclePct(payment.cycleStartDate, payment.cycleEndDate);
  const cycleLabel = buildCycleLabel(effectiveStatus, payment);

  const fillClass = isOverdue
    ? 'fin-cycle-bar-fill fin-cycle-bar-fill--overdue'
    : 'fin-cycle-bar-fill fin-cycle-bar-fill--pending';

  // Split amount into integer and decimal parts for typographic hierarchy
  const amountStr = formatCurrencyBRL(payment.amount).replace(/^R\$\s*/, '').trim();
  const commaIdx = amountStr.lastIndexOf(',');
  const intPart = commaIdx >= 0 ? amountStr.slice(0, commaIdx) : amountStr;
  const centsPart = commaIdx >= 0 ? amountStr.slice(commaIdx) : '';

  const rowClass = ROW_STATUS_CLASS[effectiveStatus] ?? 'fin-payment-row';

  const extraMenuItems = onViewHistory
    ? [{ label: 'Ver histórico', onClick: onViewHistory }]
    : [];

  return (
    <article className={rowClass}>
      <div className="fin-payment-avatar" aria-hidden="true">
        {studentInitials}
      </div>

      <div className="fin-payment-info">
        <div className="fin-payment-name">{studentName}</div>
        {(planName || recurrenceLabel) && (
          <div className="fin-payment-meta">
            {planName && <span>{planName}</span>}
            {planName && recurrenceLabel && (
              <span className="fin-payment-meta-dot" aria-hidden="true" />
            )}
            {recurrenceLabel && <span>{recurrenceLabel}</span>}
          </div>
        )}
      </div>

      {/* Cycle track — hidden on mobile via CSS, visible ≥768px */}
      <div className="fin-payment-track" aria-hidden="true">
        <div className="fin-cycle-bar">
          <div
            className={fillClass}
            style={{ width: `${cyclePct ?? (isOverdue ? 100 : 50)}%` }}
          />
        </div>
        {cycleLabel && <span className="fin-cycle-label">{cycleLabel}</span>}
      </div>

      <div className="fin-payment-amount">
        <small>R$</small>{intPart}{centsPart && <small>{centsPart}</small>}
      </div>

      {/* Status — own grid column on desktop (≥768px) */}
      <div className="fin-payment-status" aria-hidden="true">
        <span className={STATUS_PILL_CLASS[effectiveStatus] ?? 'fin-status-pill'}>
          {STATUS_LABEL[effectiveStatus] ?? effectiveStatus}
        </span>
      </div>

      <div className="fin-payment-actions">
        {/* Status pill also shown inline on mobile (hidden on desktop via CSS) */}
        <span className={STATUS_PILL_CLASS[effectiveStatus] ?? 'fin-status-pill'}>
          {STATUS_LABEL[effectiveStatus] ?? effectiveStatus}
        </span>

        {isPaid ? (
          <RowMenu
            ariaLabel={`Ações do pagamento de ${studentName}`}
            onDelete={onMarkPending}
            deleteLabel="Reverter pagamento"
            extraItems={extraMenuItems}
          />
        ) : (
          <>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={isMutating}
              onClick={onMarkPaid}
            >
              {isMutating ? 'Pagando…' : 'Marcar pago'}
            </button>
            {extraMenuItems.length > 0 && (
              <RowMenu
                ariaLabel={`Ações do pagamento de ${studentName}`}
                extraItems={extraMenuItems}
              />
            )}
          </>
        )}
      </div>
    </article>
  );
};

PaymentRow.propTypes = {
  payment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    paidAt: PropTypes.string,
    cycleStartDate: PropTypes.string,
    cycleEndDate: PropTypes.string,
    dueDate: PropTypes.string,
  }).isRequired,
  effectiveStatus: PropTypes.oneOf(Object.values(PAYMENT_STATUS)).isRequired,
  studentName: PropTypes.string.isRequired,
  studentInitials: PropTypes.string.isRequired,
  planName: PropTypes.string,
  recurrenceLabel: PropTypes.string,
  isMutating: PropTypes.bool,
  onMarkPaid: PropTypes.func.isRequired,
  onMarkPending: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func,
};

export default PaymentRow;
