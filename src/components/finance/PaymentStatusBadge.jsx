import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { t, tCount } from '../../i18n';
import { PAYMENT_STATUS } from '../../utils/subscriptionHelpers';

const STATUS_TONE = {
  [PAYMENT_STATUS.OVERDUE]: 'error',
  [PAYMENT_STATUS.PENDING]: 'brand',
  [PAYMENT_STATUS.PAID]: 'success',
  [PAYMENT_STATUS.CANCELLED]: 'neutral',
};

/**
 * Status Badge of a charge. The status (and days overdue) always come from the
 * API — this only maps them to a DS tone and the feminine "cobrança" labels
 * (Pendente · Atrasada · Paga · Anulada). Uppercase comes from `.badge--status`.
 */
const PaymentStatusBadge = ({ status, daysOverdue = 0 }) => {
  const label = t(`finance.status.${status}`) || status;
  const text = status === PAYMENT_STATUS.OVERDUE && daysOverdue > 0
    ? `${label} · ${tCount('finance.count.day', daysOverdue)}`
    : label;

  return <Badge tone={STATUS_TONE[status] || 'neutral'}>{text}</Badge>;
};

PaymentStatusBadge.propTypes = {
  status: PropTypes.oneOf(Object.values(PAYMENT_STATUS)).isRequired,
  daysOverdue: PropTypes.number,
};

export default PaymentStatusBadge;
