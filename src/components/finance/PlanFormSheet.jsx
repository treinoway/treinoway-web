import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import Banner from '../ds/Banner';
import ChoiceGroup from './ChoiceGroup';
import BillingDayField from './BillingDayField';
import FieldError from './FieldError';
import PlanPreview from './PlanPreview';
import { buildKindCount } from '../../utils/financeKindCount';
import useFinanceCopy from '../../hooks/useFinanceCopy';
import SheetFooter from './SheetFooter';
import { t, tf, extractErrorInfo } from '../../i18n';
import { getErrorMessage } from '../../utils/financeErrors';
import { SERVICE_TYPE } from '../../constants/finance';
import { DISCOUNT_MODE, parseBillingDay, parseDiscountInput, parsePositiveMoney } from '../../utils/financeForm';
import {
  RECURRENCE_LABEL,
  RECURRENCE_OPTIONS,
  SUBSCRIPTION_RECURRENCE,
  centsToApiNumber,
  computeNetFromApi,
  formatCentsBRL,
  formatCentsForInput,
  formatPercentHundredths,
  hundredthsToApiNumber,
  toCents,
} from '../../utils/subscriptionHelpers';

const RECURRENCE_CHOICES = RECURRENCE_OPTIONS.map((option) => ({ value: option, label: RECURRENCE_LABEL[option] }));

const DISCOUNT_CHOICES = [
  { value: DISCOUNT_MODE.NONE, label: t('finance.planForm.discountNone') },
  { value: DISCOUNT_MODE.PERCENT, label: t('finance.planForm.discountPercent') },
  { value: DISCOUNT_MODE.AMOUNT, label: t('finance.planForm.discountAmount') },
];

const SERVICE_TYPE_CHOICES = [
  { value: SERVICE_TYPE.TRAINING, label: t('finance.serviceType.training') },
  { value: SERVICE_TYPE.NUTRITION, label: t('finance.serviceType.nutrition') },
  { value: SERVICE_TYPE.BOTH, label: t('finance.serviceType.both') },
];

/** Editing may only move between Treino and Ambos (same owner row); Nutrição stays Nutrição. */
const buildServiceTypeChoices = (plan) => {
  if (!plan) return SERVICE_TYPE_CHOICES;
  const isNutrition = plan.serviceType === SERVICE_TYPE.NUTRITION;
  return SERVICE_TYPE_CHOICES.map((choice) => ({ ...choice, disabled: (choice.value === SERVICE_TYPE.NUTRITION) !== isNutrition }));
};

const API_FIELD_TO_FORM = { name: 'name', price: 'price', discountPercent: 'discount', discountAmount: 'discount', billingDay: 'billingDay' };

const inputClass = (error) => `input${error ? ' input--error' : ''}`;

const buildInitialDiscount = (plan) => {
  const percent = toCents(plan?.discountPercent);
  const amount = toCents(plan?.discountAmount);
  if (percent) return { discountMode: DISCOUNT_MODE.PERCENT, discountText: formatPercentHundredths(percent) };
  if (amount) return { discountMode: DISCOUNT_MODE.AMOUNT, discountText: formatCentsForInput(amount) };
  return { discountMode: DISCOUNT_MODE.NONE, discountText: '' };
};

const buildInitialForm = (plan) => ({
  name: plan?.name || '',
  recurrence: plan?.recurrence || SUBSCRIPTION_RECURRENCE.MONTHLY,
  priceText: plan ? formatCentsForInput(toCents(plan.price)) : '',
  billingDayText: plan?.billingDay ? String(plan.billingDay) : '',
  billingDayBad: false,
  serviceType: plan?.serviceType || SERVICE_TYPE.TRAINING,
  ...buildInitialDiscount(plan),
});

const validatePlanForm = (form) => {
  const price = parsePositiveMoney(form.priceText);
  const discount = parseDiscountInput(form.discountMode, form.discountText, price.cents);
  const billingDay = parseBillingDay(form.billingDayText, form.billingDayBad);
  const errors = {};
  if (!form.name.trim()) errors.name = t('finance.planForm.nameRequired');
  if (price.error) errors.price = price.error;
  if (discount.error) errors.discount = discount.error;
  if (billingDay.error) errors.billingDay = billingDay.error;
  return { errors, price, discount, billingDay };
};

/** Both discount fields are always sent: the chosen one with its value, the other null. */
const buildPayload = (form, price, discount, billingDay, withServiceType) => ({
  name: form.name.trim(),
  ...(withServiceType && { serviceType: form.serviceType }),
  recurrence: form.recurrence,
  price: centsToApiNumber(price.cents),
  discountPercent: hundredthsToApiNumber(discount.percentHundredths),
  discountAmount: centsToApiNumber(discount.discountCents),
  billingDay: billingDay.day,
});

const mapSubmitError = (err) => {
  const field = API_FIELD_TO_FORM[extractErrorInfo(err).details?.[0]?.field];
  return { [field || 'form']: getErrorMessage(err) };
};

// Subscribers named by kind for dual-role users, else by the role's noun.
const buildSubscriberText = (plan, isDualRole, ftCount) => {
  if (isDualRole && plan.activeSubscriptionCountByKind) return buildKindCount(plan.activeSubscriptionCountByKind);
  return ftCount('finance.count.student', plan.activeSubscriptionCount);
};

const buildPriceChangeBanner = (plan, { isDualRole, ftCount }) => {
  if (!plan.activeSubscriptionCount) return t('finance.planForm.priceChangeBannerGeneric');
  return tf('finance.planForm.priceChangeBanner', {
    students: buildSubscriberText(plan, isDualRole, ftCount),
    amount: formatCentsBRL(computeNetFromApi(plan)),
  });
};

const hasPriceChanged = (plan, price, discount) => Boolean(plan) && !price.error && !discount.error && (
  price.cents !== toCents(plan.price)
  || (discount.percentHundredths || null) !== (toCents(plan.discountPercent) || null)
  || (discount.discountCents || null) !== (toCents(plan.discountAmount) || null)
);

const DiscountValueField = ({ fieldId, mode, value, error, disabled, onChange }) => {
  const isPercent = mode === DISCOUNT_MODE.PERCENT;
  return (
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor={fieldId}>
        {t(isPercent ? 'finance.planForm.discountPercentLabel' : 'finance.planForm.discountAmountLabel')}
      </label>
      <input
        id={fieldId}
        type="text"
        inputMode="decimal"
        placeholder={isPercent ? '0' : '0,00'}
        className={inputClass(error)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      />
      <FieldError message={error} />
    </div>
  );
};

DiscountValueField.propTypes = {
  fieldId: PropTypes.string.isRequired,
  mode: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  error: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * "Novo plano" / "Editar plano". The summary sits after the fields. In edit
 * mode a banner explains that a new price only applies to new subscriptions,
 * shown only once the price changed. `onSubmit(payload)` throws on failure.
 */
const PlanFormSheet = ({ plan = null, onClose, onSubmit }) => {
  const [form, setForm] = useState(() => buildInitialForm(plan));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const fieldId = useId();
  const formId = `${fieldId}-form`;
  const isEdit = Boolean(plan);
  const { isDualRole, ft, ftCount } = useFinanceCopy();

  const live = validatePlanForm(form);
  const previewDiscount = live.discount.error ? {} : live.discount;
  const showPriceBanner = hasPriceChanged(plan, live.price, live.discount);
  const showBillingDayBanner = isEdit && !live.billingDay.error && live.billingDay.day !== (plan.billingDay ?? null);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleDiscountMode = (mode) => setForm((prev) => ({ ...prev, discountMode: mode, discountText: '' }));
  const handleBillingDayChange = (text, badInput) => setForm((prev) => ({ ...prev, billingDayText: text, billingDayBad: badInput }));
  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { errors: nextErrors, price, discount, billingDay } = validatePlanForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit(buildPayload(form, price, discount, billingDay, isDualRole));
    } catch (err) {
      setErrors(mapSubmitError(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t(isEdit ? 'finance.planForm.titleEdit' : 'finance.planForm.titleNew')}
      onClose={handleClose}
      closeDisabled={submitting}
      footer={(
        <SheetFooter
          formId={formId}
          submitting={submitting}
          submitLabel={t(isEdit ? 'finance.planForm.submitEdit' : 'finance.planForm.submitNew')}
          onCancel={handleClose}
        />
      )}
    >
      <form id={formId} className="finance-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${fieldId}-name`}>{t('finance.planForm.nameLabel')}</label>
          <input
            id={`${fieldId}-name`}
            type="text"
            className={inputClass(errors.name)}
            value={form.name}
            maxLength={100}
            onChange={(e) => setField('name', e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(errors.name)}
            autoFocus
            required
          />
          <FieldError message={errors.name} />
        </div>

        {isDualRole && (
          <div className="field">
            <span className="field-label type-caption-strong" id={`${fieldId}-service-type`}>{t('finance.serviceType.label')}</span>
            <ChoiceGroup
              labelId={`${fieldId}-service-type`}
              options={buildServiceTypeChoices(plan)}
              value={form.serviceType}
              onChange={(value) => setField('serviceType', value)}
              disabled={submitting}
            />
          </div>
        )}

        <div className="field">
          <span className="field-label type-caption-strong" id={`${fieldId}-recurrence`}>{t('finance.planForm.recurrenceLabel')}</span>
          <ChoiceGroup
            labelId={`${fieldId}-recurrence`}
            options={RECURRENCE_CHOICES}
            value={form.recurrence}
            onChange={(value) => setField('recurrence', value)}
            disabled={submitting}
          />
        </div>

        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${fieldId}-price`}>{t('finance.planForm.priceLabel')}</label>
          <input
            id={`${fieldId}-price`}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className={inputClass(errors.price)}
            value={form.priceText}
            onChange={(e) => setField('priceText', e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(errors.price)}
            required
          />
          <FieldError message={errors.price} />
        </div>

        <div className="field">
          <span className="field-label type-caption-strong" id={`${fieldId}-discount-mode`}>{t('finance.planForm.discountLabel')}</span>
          <ChoiceGroup
            labelId={`${fieldId}-discount-mode`}
            options={DISCOUNT_CHOICES}
            value={form.discountMode}
            onChange={handleDiscountMode}
            disabled={submitting}
          />
        </div>

        {form.discountMode !== DISCOUNT_MODE.NONE && (
          <DiscountValueField
            fieldId={`${fieldId}-discount`}
            mode={form.discountMode}
            value={form.discountText}
            error={errors.discount}
            disabled={submitting}
            onChange={(value) => setField('discountText', value)}
          />
        )}

        <BillingDayField
          label={t('finance.planForm.billingDayLabel')}
          hint={t('finance.planForm.billingDayHint')}
          value={form.billingDayText}
          error={errors.billingDay}
          disabled={submitting}
          onChange={handleBillingDayChange}
        />

        <PlanPreview
          title={t('finance.planForm.previewTitle')}
          priceCents={live.price.error ? null : live.price.cents}
          percentHundredths={previewDiscount.percentHundredths ?? null}
          discountCents={previewDiscount.discountCents ?? null}
          recurrence={form.recurrence}
        />

        {showPriceBanner && <Banner>{buildPriceChangeBanner(plan, { isDualRole, ftCount })}</Banner>}
        {showBillingDayBanner && <Banner>{ft('finance.planForm.billingDayChangeBanner')}</Banner>}
        <FieldError message={errors.form} />
      </form>
    </Modal>
  );
};

const money = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

PlanFormSheet.propTypes = {
  plan: PropTypes.shape({
    name: PropTypes.string,
    recurrence: PropTypes.string,
    price: money,
    discountPercent: money,
    discountAmount: money,
    billingDay: PropTypes.number,
    activeSubscriptionCount: PropTypes.number,
    activeSubscriptionCountByKind: PropTypes.shape({ students: PropTypes.number, patients: PropTypes.number }),
    serviceType: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default PlanFormSheet;
