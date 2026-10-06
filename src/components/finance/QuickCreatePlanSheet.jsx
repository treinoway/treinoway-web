import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import ChoiceGroup from './ChoiceGroup';
import FieldError from './FieldError';
import SheetFooter from './SheetFooter';
import { t } from '../../i18n';
import { getErrorMessage } from '../../utils/financeErrors';
import { parsePositiveMoney } from '../../utils/financeForm';
import {
  RECURRENCE_LABEL,
  RECURRENCE_OPTIONS,
  SUBSCRIPTION_RECURRENCE,
  centsToApiNumber,
} from '../../utils/subscriptionHelpers';

const RECURRENCE_CHOICES = RECURRENCE_OPTIONS.map((option) => ({ value: option, label: RECURRENCE_LABEL[option] }));

const inputClass = (error) => `input${error ? ' input--error' : ''}`;

const validate = ({ name, priceText }) => {
  const price = parsePositiveMoney(priceText);
  const errors = {};
  if (!name.trim()) errors.name = t('finance.planForm.nameRequired');
  if (price.error) errors.price = price.error;
  return { errors, cents: price.cents };
};

/**
 * Assign sheet variant for a trainer without plans: create a plan (Nome,
 * Recorrência, Valor) and assign it in one go. `onSubmit(planPayload)` throws
 * on failure.
 */
const QuickCreatePlanSheet = ({ title, onClose, onSubmit }) => {
  const fieldId = useId();
  const formId = `${fieldId}-form`;
  const [name, setName] = useState('');
  const [recurrence, setRecurrence] = useState(SUBSCRIPTION_RECURRENCE.MONTHLY);
  const [priceText, setPriceText] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { errors: nextErrors, cents } = validate({ name, priceText });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), recurrence, price: centsToApiNumber(cents) });
    } catch (err) {
      setErrors({ form: getErrorMessage(err) });
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={handleClose}
      closeDisabled={submitting}
      footer={<SheetFooter formId={formId} submitting={submitting} submitLabel={t('finance.assign.quickSubmit')} onCancel={handleClose} />}
    >
      <form id={formId} className="finance-form" onSubmit={handleSubmit} noValidate>
        <p className="finance-form__context type-body">{t('finance.assign.quickIntro')}</p>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${fieldId}-name`}>{t('finance.planForm.nameLabel')}</label>
          <input
            id={`${fieldId}-name`}
            type="text"
            maxLength={100}
            className={inputClass(errors.name)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(errors.name)}
            required
          />
          <FieldError message={errors.name} />
        </div>
        <div className="field">
          <span className="field-label type-caption-strong" id={`${fieldId}-recurrence`}>{t('finance.planForm.recurrenceLabel')}</span>
          <ChoiceGroup labelId={`${fieldId}-recurrence`} options={RECURRENCE_CHOICES} value={recurrence} onChange={setRecurrence} disabled={submitting} />
        </div>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${fieldId}-price`}>{t('finance.planForm.priceLabel')}</label>
          <input
            id={`${fieldId}-price`}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass(errors.price)}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(errors.price)}
            required
          />
          <FieldError message={errors.price} />
        </div>
        <FieldError message={errors.form} />
      </form>
    </Modal>
  );
};

QuickCreatePlanSheet.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default QuickCreatePlanSheet;
