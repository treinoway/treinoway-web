import { useId } from 'react';
import PropTypes from 'prop-types';
import ChoiceGroup from './ChoiceGroup';
import FieldError from './FieldError';
import { t, tf } from '../../i18n';
import { DISCOUNT_MODE } from '../../utils/financeForm';
import { DISCOUNT_CHOICE, START_MODE } from '../../constants/finance';
import { RECURRENCE_LABEL, computeNetFromApi, formatCentsBRL } from '../../utils/subscriptionHelpers';


const START_CHOICES = [
  { value: START_MODE.TODAY, label: t('finance.assign.startToday') },
  { value: START_MODE.NEXT_MONTH, label: t('finance.assign.startNextMonth') },
  { value: START_MODE.CUSTOM, label: t('finance.assign.startCustom') },
];

const CUSTOM_TYPE_CHOICES = [
  { value: DISCOUNT_MODE.PERCENT, label: '%' },
  { value: DISCOUNT_MODE.AMOUNT, label: 'R$' },
];

const inputClass = (error) => `input${error ? ' input--error' : ''}`;

/* ─── Plan options (radio cards) ────────────────────────────────────────── */

export const PlanOptions = ({ plans, selectedPlanId, currentPlanId, isReplace, disabled, error, onSelect }) => (
  <div className="field">
    <span className="field-label type-caption-strong">{t('finance.assign.planLabel')}</span>
    <div className="plan-options" role="radiogroup" aria-label={t('finance.assign.planAria')}>
      {plans.map((plan) => {
        const isCurrent = isReplace && plan.id === currentPlanId;
        const isSelected = selectedPlanId === plan.id;
        const meta = isCurrent
          ? t('finance.assign.currentPlan')
          : `${plan.recurrenceLabel || RECURRENCE_LABEL[plan.recurrence]} · ${formatCentsBRL(computeNetFromApi(plan))}`;
        return (
          <button
            type="button"
            key={plan.id}
            role="radio"
            aria-checked={isSelected}
            className={`plan-option${isSelected ? ' plan-option--active' : ''}`}
            onClick={() => onSelect(plan.id)}
            disabled={disabled || isCurrent}
          >
            <span className="plan-option__name type-body-strong">{plan.name}</span>
            <span className="plan-option__meta type-caption">{meta}</span>
          </button>
        );
      })}
    </div>
    <FieldError message={error} />
  </div>
);

PlanOptions.propTypes = {
  plans: PropTypes.array.isRequired,
  selectedPlanId: PropTypes.string.isRequired,
  currentPlanId: PropTypes.string,
  isReplace: PropTypes.bool.isRequired,
  disabled: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

/* ─── Start date ────────────────────────────────────────────────────────── */

export const StartDateField = ({ startMode, customDate, disabled, error, onModeChange, onDateChange }) => {
  const fieldId = useId();
  return (
    <div className="field">
      <span className="field-label type-caption-strong" id={`${fieldId}-label`}>{t('finance.assign.startLabel')}</span>
      <ChoiceGroup labelId={`${fieldId}-label`} options={START_CHOICES} value={startMode} onChange={onModeChange} disabled={disabled} />
      {startMode === START_MODE.CUSTOM && (
        <>
          <label className="field-label type-caption-strong" htmlFor={`${fieldId}-date`}>{t('finance.assign.startDateLabel')}</label>
          <input
            id={`${fieldId}-date`}
            type="date"
            className={inputClass(error)}
            value={customDate}
            onChange={(e) => onDateChange(e.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(error)}
          />
        </>
      )}
      <FieldError message={error} />
    </div>
  );
};

StartDateField.propTypes = {
  startMode: PropTypes.string.isRequired,
  customDate: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onModeChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
};

/* ─── Discount ──────────────────────────────────────────────────────────── */

const CustomDiscountInput = ({ customType, customText, disabled, error, onTypeChange, onTextChange }) => {
  const fieldId = useId();
  const isPercent = customType === DISCOUNT_MODE.PERCENT;
  return (
    <>
      <ChoiceGroup
        ariaLabel={t('finance.assign.discountTypeAria')}
        options={CUSTOM_TYPE_CHOICES}
        value={customType}
        onChange={onTypeChange}
        disabled={disabled}
      />
      <label className="field-label type-caption-strong" htmlFor={`${fieldId}-value`}>
        {t(isPercent ? 'finance.assign.discountPercentLabel' : 'finance.assign.discountAmountLabel')}
      </label>
      <input
        id={`${fieldId}-value`}
        type="text"
        inputMode="decimal"
        placeholder={isPercent ? '0' : '0,00'}
        className={inputClass(error)}
        value={customText}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      />
    </>
  );
};

CustomDiscountInput.propTypes = {
  customType: PropTypes.string.isRequired,
  customText: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onTypeChange: PropTypes.func.isRequired,
  onTextChange: PropTypes.func.isRequired,
};

const buildDiscountChoices = (planDiscountText) => [
  {
    value: DISCOUNT_CHOICE.PLAN,
    label: planDiscountText
      ? tf('finance.assign.discountFromPlan', { discount: planDiscountText })
      : t('finance.assign.discountFromPlanNone'),
    disabled: !planDiscountText,
  },
  { value: DISCOUNT_CHOICE.NONE, label: t('finance.assign.discountNone') },
  { value: DISCOUNT_CHOICE.CUSTOM, label: t('finance.assign.discountCustom') },
];

/** Collapsed behind "Ajustar desconto"; then Do plano · Nenhum · Personalizado. */
export const DiscountField = ({ planDiscountText, discountState, disabled, error, onChange }) => {
  const { open, choice } = discountState;

  if (!open) {
    const initialChoice = planDiscountText ? DISCOUNT_CHOICE.PLAN : DISCOUNT_CHOICE.NONE;
    return (
      <button type="button" className="btn btn--ghost finance-form__link" onClick={() => onChange({ open: true, choice: initialChoice })} disabled={disabled}>
        {t('finance.assign.adjustDiscount')}
      </button>
    );
  }

  return (
    <div className="field">
      <span className="field-label type-caption-strong">{t('finance.assign.discountLabel')}</span>
      <ChoiceGroup
        ariaLabel={t('finance.assign.discountLabel')}
        options={buildDiscountChoices(planDiscountText)}
        value={choice}
        onChange={(value) => onChange({ choice: value })}
        disabled={disabled}
      />
      {choice === DISCOUNT_CHOICE.CUSTOM && (
        <CustomDiscountInput
          customType={discountState.customType}
          customText={discountState.customText}
          disabled={disabled}
          error={error}
          onTypeChange={(customType) => onChange({ customType, customText: '' })}
          onTextChange={(customText) => onChange({ customText })}
        />
      )}
      <FieldError message={error} />
    </div>
  );
};

DiscountField.propTypes = {
  planDiscountText: PropTypes.string,
  discountState: PropTypes.shape({
    open: PropTypes.bool.isRequired,
    choice: PropTypes.string.isRequired,
    customType: PropTypes.string.isRequired,
    customText: PropTypes.string.isRequired,
  }).isRequired,
  disabled: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
