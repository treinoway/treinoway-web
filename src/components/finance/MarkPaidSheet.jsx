import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import Banner from '../ds/Banner';
import SheetFooter from './SheetFooter';
import FieldError from './FieldError';
import { t } from '../../i18n';
import { PAYMENT_STATUS, todayDateString } from '../../utils/subscriptionHelpers';

const validatePaidAt = (paidAt, today) => {
  if (!paidAt) return t('finance.markPaidSheet.dateRequired');
  if (paidAt > today) return t('finance.markPaidSheet.dateFuture');
  return null;
};

/**
 * "Registrar pagamento": mark a charge paid on a chosen past date (also used
 * for late settlement of a voided charge). `onSubmit(paidAt)` resolves to
 * `{ field, message }` when the API rejected the date, otherwise nothing.
 */
const MarkPaidSheet = ({ payment, contextLabel, onClose, onSubmit }) => {
  const today = todayDateString();
  const [paidAt, setPaidAt] = useState(today);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fieldId = useId();
  const formId = `${fieldId}-form`;
  const isVoid = payment.effectiveStatus === PAYMENT_STATUS.CANCELLED;

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validatePaidAt(paidAt, today);
    setError(validationError);
    if (validationError) return;
    setSubmitting(true);
    const result = await onSubmit(paidAt);
    setSubmitting(false);
    if (result?.field) setError(result.message);
  };

  return (
    <Modal
      title={t('finance.markPaidSheet.title')}
      onClose={handleClose}
      closeDisabled={submitting}
      footer={(
        <SheetFooter formId={formId} submitting={submitting} submitLabel={t('finance.markPaidSheet.submit')} onCancel={handleClose} />
      )}
    >
      <form id={formId} className="finance-form" onSubmit={handleSubmit} noValidate>
        <p className="finance-form__context type-body">{contextLabel}</p>
        {isVoid && <Banner>{t('finance.markPaidSheet.voidBanner')}</Banner>}
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={fieldId}>{t('finance.markPaidSheet.dateLabel')}</label>
          <input
            id={fieldId}
            type="date"
            className={`input${error ? ' input--error' : ''}`}
            value={paidAt}
            max={today}
            onChange={(e) => setPaidAt(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(error)}
            aria-describedby={`${fieldId}-hint`}
            required
          />
          <span id={`${fieldId}-hint`} className="field-hint type-caption">{t('finance.markPaidSheet.dateHint')}</span>
          <FieldError message={error} />
        </div>
      </form>
    </Modal>
  );
};

MarkPaidSheet.propTypes = {
  payment: PropTypes.shape({
    effectiveStatus: PropTypes.string.isRequired,
  }).isRequired,
  contextLabel: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default MarkPaidSheet;
