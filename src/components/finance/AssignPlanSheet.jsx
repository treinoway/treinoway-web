import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import Banner from '../ds/Banner';
import BillingDayField from './BillingDayField';
import FieldError from './FieldError';
import PlanPreview from './PlanPreview';
import SheetFooter from './SheetFooter';
import QuickCreatePlanSheet from './QuickCreatePlanSheet';
import useFinanceCopy from '../../hooks/useFinanceCopy';
import { DiscountField, FirstCyclePreview, PlanOptions, StartDateField } from './AssignPlanFields';
import { t, tf } from '../../i18n';
import { ASSIGN_MODE, DISCOUNT_CHOICE, FINANCE_ERROR, START_MODE } from '../../constants/finance';
import { classifyAssignError } from '../../utils/financeErrors';
import { DISCOUNT_MODE, parseBillingDay, parseDiscountInput } from '../../utils/financeForm';
import {
  SUBSCRIPTION_RECURRENCE,
  centsToApiNumber,
  currentYearMonth,
  firstDayOfNextMonth,
  formatCentsBRL,
  formatPercentHundredths,
  formatShortDate,
  hundredthsToApiNumber,
  toCents,
  todayDateString,
} from '../../utils/subscriptionHelpers';

const INITIAL_DISCOUNT = { open: false, choice: DISCOUNT_CHOICE.PLAN, customType: DISCOUNT_MODE.PERCENT, customText: '' };

const planDiscount = (plan) => ({
  percentHundredths: toCents(plan?.discountPercent) || null,
  discountCents: toCents(plan?.discountAmount) || null,
});

const formatPlanDiscount = (plan) => {
  const { percentHundredths, discountCents } = planDiscount(plan);
  if (percentHundredths) return `−${formatPercentHundredths(percentHundredths)}%`;
  if (discountCents) return `−${formatCentsBRL(discountCents)}`;
  return null;
};

const resolveStartDate = (startMode, customDate, today) => {
  if (startMode === START_MODE.TODAY) return today;
  if (startMode === START_MODE.NEXT_MONTH) return firstDayOfNextMonth(currentYearMonth());
  return customDate;
};

/** Discount actually applied → `{ percentHundredths, discountCents, error }`. */
const resolveDiscount = ({ choice, customType, customText, plan }) => {
  if (choice === DISCOUNT_CHOICE.PLAN) return { ...planDiscount(plan), error: null };
  if (choice === DISCOUNT_CHOICE.NONE) return { percentHundredths: null, discountCents: null, error: null };
  return parseDiscountInput(customType, customText, toCents(plan?.price));
};

/** "Do plano" omits both fields; otherwise both are sent explicitly (one may be null). */
const buildAssignPayload = ({ planId, startDate, choice, discount, billingDay }) => {
  const payload = { planId, startDate };
  if (billingDay !== null) payload.billingDay = billingDay;
  if (choice === DISCOUNT_CHOICE.PLAN) return payload;
  return {
    ...payload,
    discountPercent: hundredthsToApiNumber(discount.percentHundredths),
    discountAmount: centsToApiNumber(discount.discountCents),
  };
};

/** Up to two rule sentences, worded for the dates the trainer picked. */
const buildAssignRules = ({ isReplace, startDate, today, currentPlanName }) => {
  if (!startDate) return null;
  const sentences = [];
  if (isReplace && startDate <= today) sentences.push(tf('finance.assign.ruleReplaceNow', { plan: currentPlanName }));
  if (isReplace && startDate > today) {
    sentences.push(tf('finance.assign.ruleReplaceFuture', { plan: currentPlanName, date: formatShortDate(startDate, today) }));
  }
  if (startDate < today) sentences.push(t('finance.assign.rulePastStart'));
  return sentences.length > 0 ? sentences.join(' ') : null;
};

const validateAssign = ({ selectedPlan, startDate, discount, billingDayError }) => {
  const errors = {};
  if (!selectedPlan) errors.plan = t('finance.assign.selectPlan');
  if (!startDate) errors.start = t('finance.assign.startRequired');
  if (discount.error) errors.discount = discount.error;
  if (billingDayError) errors.billingDay = billingDayError;
  return errors;
};

/** Plan's default billing day as input text ('' when the plan has none). */
const planBillingDayText = (plan) => (plan?.billingDay ? String(plan.billingDay) : '');

const firstEligiblePlanId = (plans, currentPlanId) => plans.find((plan) => plan.id !== currentPlanId)?.id ?? '';

/**
 * "Atribuir plano" / "Trocar plano". Replace is a SINGLE assign request — the
 * backend detects the active subscription and replaces it atomically (B1).
 * `onAssign(payload)` performs the request and throws on failure;
 * `onAlreadyActive()` refetches and switches to replace mode;
 * `onPlanArchived()` refetches the plans. Without plans it becomes a quick-create.
 */
const AssignPlanSheet = ({
  mode = ASSIGN_MODE.ASSIGN,
  plans,
  currentPlanId = null,
  currentPlanName = '',
  onClose,
  onAssign,
  onCreatePlanAndAssign,
  onAlreadyActive,
  onPlanArchived,
}) => {
  const isReplace = mode === ASSIGN_MODE.REPLACE;
  const { audience } = useFinanceCopy();
  const today = todayDateString();
  const formId = `${useId()}-form`;
  const [selectedPlanId, setSelectedPlanId] = useState(() => firstEligiblePlanId(plans, isReplace ? currentPlanId : null));
  const [billingDayBad, setBillingDayBad] = useState(false);
  const [billingDayText, setBillingDayText] = useState(() => planBillingDayText(plans.find((plan) => plan.id === selectedPlanId)));
  const [startMode, setStartMode] = useState(START_MODE.TODAY);
  const [customDate, setCustomDate] = useState(today);
  const [discountState, setDiscountState] = useState(INITIAL_DISCOUNT);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || null;
  const startDate = resolveStartDate(startMode, customDate, today);
  const discount = resolveDiscount({ ...discountState, plan: selectedPlan });
  const billingDay = parseBillingDay(billingDayText, billingDayBad);
  const showFirstCycle = Boolean(startDate) && startDate >= today && !billingDay.error;
  const previewDiscount = discount.error ? planDiscount(null) : discount;
  const rules = buildAssignRules({ isReplace, startDate, today, currentPlanName });
  const title = t(isReplace ? 'finance.assign.titleReplace' : 'finance.assign.titleAssign');

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSelectPlan = (planId) => {
    setSelectedPlanId(planId);
    setDiscountState(INITIAL_DISCOUNT);
    setBillingDayText(planBillingDayText(plans.find((plan) => plan.id === planId)));
    setBillingDayBad(false);
  };

  const handleBillingDayChange = (text, badInput) => {
    setBillingDayText(text);
    setBillingDayBad(badInput);
  };

  const handleAssignError = (err) => {
    const outcome = classifyAssignError(err, audience);
    setErrors({ [outcome.field]: outcome.message });
    if (outcome.code === FINANCE_ERROR.ALREADY_ACTIVE) onAlreadyActive?.();
    if (outcome.code === FINANCE_ERROR.PLAN_ARCHIVED) onPlanArchived?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateAssign({ selectedPlan, startDate, discount, billingDayError: billingDay.error });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    try {
      await onAssign(buildAssignPayload({ planId: selectedPlan.id, startDate, choice: discountState.choice, discount, billingDay: billingDay.day }));
    } catch (err) {
      handleAssignError(err);
      setSubmitting(false);
    }
  };

  if (plans.length === 0) {
    const handleQuickCreate = (planPayload) => onCreatePlanAndAssign({ planPayload, assignPayload: { startDate: today } });
    return <QuickCreatePlanSheet title={title} onClose={onClose} onSubmit={handleQuickCreate} />;
  }

  return (
    <Modal
      title={title}
      onClose={handleClose}
      closeDisabled={submitting}
      footer={(
        <SheetFooter
          formId={formId}
          submitting={submitting}
          submitLabel={t(isReplace ? 'finance.assign.submitReplace' : 'finance.assign.submitAssign')}
          onCancel={handleClose}
        />
      )}
    >
      <form id={formId} className="finance-form" onSubmit={handleSubmit} noValidate>
        <PlanOptions
          plans={plans}
          selectedPlanId={selectedPlanId}
          currentPlanId={currentPlanId}
          isReplace={isReplace}
          disabled={submitting}
          error={errors.plan}
          onSelect={handleSelectPlan}
        />
        <StartDateField
          startMode={startMode}
          customDate={customDate}
          disabled={submitting}
          error={errors.start}
          onModeChange={setStartMode}
          onDateChange={setCustomDate}
        />
        <DiscountField
          planDiscountText={formatPlanDiscount(selectedPlan)}
          discountState={discountState}
          disabled={submitting}
          error={errors.discount}
          onChange={(patch) => setDiscountState((prev) => ({ ...prev, ...patch }))}
        />
        <BillingDayField
          label={t('finance.assign.billingDayLabel')}
          hint={t('finance.assign.billingDayHint')}
          value={billingDayText}
          error={errors.billingDay}
          disabled={submitting}
          onChange={handleBillingDayChange}
        />
        {showFirstCycle && (
          <FirstCyclePreview
            startDate={startDate}
            billingDay={billingDay.day}
            recurrence={selectedPlan?.recurrence || SUBSCRIPTION_RECURRENCE.MONTHLY}
            today={today}
          />
        )}
        <PlanPreview
          title={t('finance.assign.previewTitle')}
          priceCents={toCents(selectedPlan?.price)}
          percentHundredths={previewDiscount.percentHundredths}
          discountCents={previewDiscount.discountCents}
          recurrence={selectedPlan?.recurrence || SUBSCRIPTION_RECURRENCE.MONTHLY}
        />
        {rules && <Banner>{rules}</Banner>}
        <FieldError message={errors.form} />
      </form>
    </Modal>
  );
};

AssignPlanSheet.propTypes = {
  mode: PropTypes.oneOf(Object.values(ASSIGN_MODE)),
  plans: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    recurrence: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    billingDay: PropTypes.number,
  })).isRequired,
  currentPlanId: PropTypes.string,
  currentPlanName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onAssign: PropTypes.func.isRequired,
  onCreatePlanAndAssign: PropTypes.func.isRequired,
  onAlreadyActive: PropTypes.func,
  onPlanArchived: PropTypes.func,
};

export default AssignPlanSheet;
