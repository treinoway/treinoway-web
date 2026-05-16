import PropTypes from 'prop-types';
import { PAYMENT_STATUS } from '../utils/subscriptionHelpers';

const STATUS_LABEL = {
  [PAYMENT_STATUS.PAID]: 'Pago',
  [PAYMENT_STATUS.PENDING]: 'Pendente',
  [PAYMENT_STATUS.OVERDUE]: 'Atrasado',
  [PAYMENT_STATUS.CANCELLED]: 'Cancelada',
};

const STATUS_CLASS = {
  [PAYMENT_STATUS.PAID]: 'status-pill status-pill--paid',
  [PAYMENT_STATUS.PENDING]: 'status-pill status-pill--pending',
  [PAYMENT_STATUS.OVERDUE]: 'status-pill status-pill--overdue',
  [PAYMENT_STATUS.CANCELLED]: 'status-pill status-pill--cancelled',
};

const StatusPill = ({ status, label }) => {
  const safeStatus = STATUS_CLASS[status] ? status : PAYMENT_STATUS.PENDING;
  const text = label || STATUS_LABEL[safeStatus];

  return (
    <span className={STATUS_CLASS[safeStatus]}>
      {text}
    </span>
  );
};

StatusPill.propTypes = {
  status: PropTypes.oneOf(Object.values(PAYMENT_STATUS)).isRequired,
  label: PropTypes.string,
};

export default StatusPill;
