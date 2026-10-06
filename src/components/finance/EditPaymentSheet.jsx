import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import Banner from '../ds/Banner';
import SheetFooter from './SheetFooter';
import FieldError from './FieldError';
import { t, tf } from '../../i18n';
import { parsePositiveMoney } from '../../utils/financeForm';
import {
  PAYMENT_STATUS,
  centsToApiNumber,
  formatCentsForInput,
  toCents,
} from '../../utils/subscriptionHelpers';

const NOTES_MAX_LENGTH = 500;

/** Only the fields that changed; a paid charge only ever sends `notes`. */
const buildPatch = ({ payment, isPaid, amountCents, dueDate, notes }) => {
  const patch = {};
  const trimmedNotes = notes.trim();
  if (trimmedNotes !== (payment.notes || '')) patch.notes = trimmedNotes || null;
  if (isPaid) return patch;
  if (amountCents !== toCents(payment.amount)) patch.amount = centsToApiNumber(amountCents);
  if (dueDate !== payment.dueDate) patch.dueDate = dueDate;
  return patch;
};

const validateForm = ({ isPaid, amountText, dueDate }) => {
  if (isPaid) return { errors: {}, amountCents: null };
  const amount = parsePositiveMoney(amountText);
  const errors = {};
  if (amount.error) errors.amount = amount.error;
  if (!dueDate) errors.dueDate = t('finance.editSheet.dueDateRequired');
  return { errors, amountCents: amount.cents };
};

const inputClass = (error) => `input${error ? ' input--error' : ''}`;

/**
 * "Editar cobrança": amount, due date and notes. A paid charge keeps amount
 * and due date locked (the backend refuses them with 409) — only notes.
 * `onSubmit(patch)` resolves to `{ field, message }` for inline API errors.
 */
const EditPaymentSheet = ({ payment, contextLabel, graceDays, onClose, onSubmit }) => {
  const isPaid = payment.effectiveStatus === PAYMENT_STATUS.PAID;
  const [amountText, setAmountText] = useState(() => formatCentsForInput(toCents(payment.amount)));
  const [dueDate, setDueDate] = useState(payment.dueDate || '');
  const [notes, setNotes] = useState(payment.notes || '');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fieldId = useId();
  const formId = `${fieldId}-form`;
  const lockFields = isPaid || submitting;

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateForm({ isPaid, amountText, dueDate });
    setErrors(validation.errors);
    if (Object.keys(validation.errors).length > 0) return;
    const patch = buildPatch({ payment, isPaid, amountCents: validation.amountCents, dueDate, notes });
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    const result = await onSubmit(patch);
    setSubmitting(false);
    if (result?.field) setErrors({ [result.field]: result.message });
  };

  return (
    <Modal
      title={t('finance.editSheet.title')}
      onClose={handleClose}
      closeDisabled={submitting}
      footer={<SheetFooter formId={formId} submitting={submitting} submitLabel={t('finance.editSheet.submit')} onCancel={handleClose} />}
    >
      <form id={formId} className="finance-form" onSubmit={handleSubmit} noValidate>
        {isPaid && <Banner>{t('finance.editSheet.paidBanner')}</Banner>}
        <p className="finance-form__context type-body">{contextLabel}</p>

        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${fieldId}-amount`}>{t('finance.editSheet.amountLabel')}</label>
          <input
            id={`${fieldId}-amount`}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass(errors.amount)}
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            disabled={lockFields}
            aria-invalid={Boolean(errors.amount)}
          />
          <FieldError message={errors.amount} />
        </div>

        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${fieldId}-due`}>{t('finance.editSheet.dueDateLabel')}</label>
          <input
            id={`${fieldId}-due`}
            type="date"
            className={inputClass(errors.dueDate)}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={lockFields}
            aria-invalid={Boolean(errors.dueDate)}
            aria-describedby={`${fieldId}-due-hint`}
          />
          <span id={`${fieldId}-due-hint`} className="field-hint type-caption">
            {tf('finance.editSheet.dueDateHint', { days: graceDays })}
          </span>
          <FieldError message={errors.dueDate} />
        </div>

        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${fieldId}-notes`}>{t('finance.editSheet.notesLabel')}</label>
          <textarea
            id={`${fieldId}-notes`}
            className="input"
            value={notes}
            maxLength={NOTES_MAX_LENGTH}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            aria-describedby={`${fieldId}-notes-count`}
          />
          <span id={`${fieldId}-notes-count`} className="field-hint type-caption">
            {tf('finance.editSheet.notesCounter', { n: notes.length })}
          </span>
        </div>

        <FieldError message={errors.form} />
      </form>
    </Modal>
  );
};

EditPaymentSheet.propTypes = {
  payment: PropTypes.shape({
    amount: PropTypes.string,
    dueDate: PropTypes.string,
    notes: PropTypes.string,
    effectiveStatus: PropTypes.string.isRequired,
  }).isRequired,
  contextLabel: PropTypes.string.isRequired,
  graceDays: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default EditPaymentSheet;
