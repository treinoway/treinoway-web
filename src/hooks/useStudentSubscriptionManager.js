import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { t, tf } from '../i18n';
import {
  assignPlanToStudent,
  cancelSubscription,
  createSubscriptionPlan,
} from '../api/subscriptions';
import useStudentSubscription from './useStudentSubscription';
import usePaymentActions from './usePaymentActions';
import { ASSIGN_MODE, FINANCE_ERROR } from '../constants/finance';
import { getErrorCode, getErrorMessage } from '../utils/financeErrors';
import { pickCurrentCharge } from '../utils/financeCharges';
import { formatShortDate } from '../utils/subscriptionHelpers';

const findPlanNameInPayments = (subscription, payments) =>
  payments.find((payment) => payment.subscriptionId === subscription.id)?.plan?.name;

/** Name of the active plan: payments carry it (archived plans too), then the plans list. */
const resolvePlanName = (subscription, payments, plans) => {
  if (!subscription) return '';
  const fromPlans = plans.find((plan) => plan.id === subscription.planId)?.name;
  return findPlanNameInPayments(subscription, payments) || fromPlans || t('finance.block.fallbackPlanName');
};

/** The name is final once payments carry it, or once the plans fallback has answered. */
const isPlanNameSettled = ({ subscription, payments, plansLoaded }) =>
  !subscription || Boolean(findPlanNameInPayments(subscription, payments)) || plansLoaded;

const buildFirstPaymentPeriod = (created) => {
  const first = created?.firstPayment;
  if (!first) return '—';
  return `${formatShortDate(first.cycleStartDate)} – ${formatShortDate(first.cycleEndDate)}`;
};

/**
 * Everything the StudentDetail subscription UI needs: data, payment row
 * actions, assign/replace (ONE request — the backend replaces atomically, B1)
 * and cancel. API calls live here; components only render.
 */
const useStudentSubscriptionManager = (studentId, studentName) => {
  const { showToast } = useToast();
  const data = useStudentSubscription(studentId);
  const paymentActions = usePaymentActions({ onChanged: data.reload, isOverview: false });
  const [assignMode, setAssignMode] = useState(null);
  const [cancelState, setCancelState] = useState(null);

  const handleAssign = async (payload) => {
    const isReplace = assignMode === ASSIGN_MODE.REPLACE;
    const created = await assignPlanToStudent(studentId, payload);
    const key = isReplace ? 'finance.toast.planReplaced' : 'finance.toast.planAssigned';
    showToast(tf(key, { period: buildFirstPaymentPeriod(created) }), 'success');
    setAssignMode(null);
    data.reload();
  };

  const handleCreatePlanAndAssign = async ({ planPayload, assignPayload }) => {
    const createdPlan = await createSubscriptionPlan(planPayload);
    data.reloadPlans();
    await handleAssign({ ...assignPayload, planId: createdPlan.id });
  };

  const handleAlreadyActive = () => {
    data.reload();
    setAssignMode(ASSIGN_MODE.REPLACE);
  };

  const handleConfirmCancel = async () => {
    setCancelState({ busy: true });
    try {
      await cancelSubscription(data.subscription.id);
      showToast(t('finance.toast.subscriptionCancelled'), 'success');
    } catch (err) {
      const alreadyCancelled = getErrorCode(err) === FINANCE_ERROR.CANNOT_EDIT_CANCELLED;
      showToast(alreadyCancelled ? t('finance.toast.alreadyCancelled') : getErrorMessage(err), alreadyCancelled ? 'info' : 'error');
    } finally {
      setCancelState(null);
      data.reload();
    }
  };

  return {
    ...data,
    // Billing reads as loading until the plan name is final, so it never swaps from the fallback.
    loading: data.loading || !isPlanNameSettled(data),
    planName: resolvePlanName(data.subscription, data.payments, data.plans),
    currentCharge: pickCurrentCharge(data.payments, data.subscription?.id),
    paymentActions,
    assignMode,
    cancelState,
    cancelMessage: tf('finance.confirm.cancelSubscription', { name: studentName || t('finance.block.fallbackStudent') }),
    openAssign: () => setAssignMode(ASSIGN_MODE.ASSIGN),
    openReplace: () => setAssignMode(ASSIGN_MODE.REPLACE),
    closeAssign: () => setAssignMode(null),
    requestCancel: () => setCancelState({ busy: false }),
    dismissCancel: () => setCancelState(null),
    handleAssign,
    handleCreatePlanAndAssign,
    handleAlreadyActive,
    handleConfirmCancel,
  };
};

export default useStudentSubscriptionManager;
