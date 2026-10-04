import { useCallback, useEffect, useRef, useState } from 'react';
import { translateError } from '../i18n';
import {
  getActiveSubscriptionForStudent,
  listPaymentsForSubscription,
  listSubscriptionPlans,
  assignPlanToStudent,
  cancelSubscription,
  createSubscriptionPlan,
} from '../api/subscriptions';
import { deriveEffectivePaymentStatus, PAYMENT_STATUS } from '../utils/subscriptionHelpers';
import { td } from '../utils/studentCockpit';

/** The most recent pending/overdue cycle, falling back to the most recent cycle. */
const pickCurrentPayment = (payments) => {
  const sorted = [...payments].sort((a, b) => (b.cycleStartDate || '').localeCompare(a.cycleStartDate || ''));
  const open = sorted.find((payment) => {
    const status = deriveEffectivePaymentStatus(payment);
    return status === PAYMENT_STATUS.PENDING || status === PAYMENT_STATUS.OVERDUE;
  });
  return open || sorted[0] || null;
};

/**
 * Active subscription of a student, its current payment cycle, the trainer's plans
 * and the assign / replace / quick-create / cancel actions.
 *
 * When `studentId` changes the subscription state resets, and any response that
 * arrives later for the previous student is ignored.
 */
const useStudentSubscription = (studentId, showToast) => {
  const [subscription, setSubscription] = useState(null);
  const [nextPayment, setNextPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const currentStudentIdRef = useRef(studentId);

  useEffect(() => {
    currentStudentIdRef.current = studentId;
  }, [studentId]);

  const isStale = useCallback(() => currentStudentIdRef.current !== studentId, [studentId]);

  const notifyError = useCallback(
    (err) => showToast(err.userMessage || translateError(err), 'error'),
    [showToast],
  );

  const applySubscription = useCallback((active, payment) => {
    setSubscription(active);
    setNextPayment(payment);
  }, []);

  const fetchSubscription = useCallback(async () => {
    applySubscription(null, null);
    setLoading(true);
    try {
      const active = await getActiveSubscriptionForStudent(studentId);
      if (isStale()) return;
      const payment = active ? pickCurrentPayment(await listPaymentsForSubscription(active.id)) : null;
      if (!isStale()) applySubscription(active || null, payment);
    } catch (err) {
      if (!isStale()) notifyError(err);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [studentId, isStale, applySubscription, notifyError]);

  const fetchPlans = useCallback(async () => {
    try {
      setPlans(await listSubscriptionPlans());
    } catch (err) {
      notifyError(err);
    }
  }, [notifyError]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const assignPlan = async (payload) => {
    const created = await assignPlanToStudent(studentId, payload);
    showToast(td('subscriptionToasts.assigned'), 'success');
    if (!isStale()) applySubscription(created, created?.firstPayment || null);
  };

  // The assign endpoint cancels the current active subscription and creates the new one in a
  // single transaction, so a failed assignment never leaves the student without a plan.
  const replacePlan = assignPlan;

  const createPlanAndAssign = async ({ planPayload, assignPayload }) => {
    const createdPlan = await createSubscriptionPlan(planPayload);
    setPlans((prev) => [...prev, createdPlan]);
    await assignPlan({ ...assignPayload, planId: createdPlan.id });
  };

  const cancel = async () => {
    try {
      if (subscription) await cancelSubscription(subscription.id);
      showToast(td('subscriptionToasts.cancelled'), 'success');
      if (!isStale()) applySubscription(null, null);
    } catch (err) {
      notifyError(err);
    }
  };

  const planName = subscription ? plans.find((plan) => plan.id === subscription.planId)?.name ?? null : null;
  const activePlans = plans.filter((plan) => !plan.isArchived);

  return {
    subscription,
    nextPayment,
    loading,
    planName,
    activePlans,
    assignPlan,
    replacePlan,
    createPlanAndAssign,
    cancel,
  };
};

export default useStudentSubscription;
