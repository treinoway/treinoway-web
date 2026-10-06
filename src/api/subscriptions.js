import api from './axios';

// ─── Plans ──────────────────────────────────────────────────────────────────

/** Plans list; each plan carries `activeSubscriptionCount`. */
export const listSubscriptionPlans = async ({ includeArchived = false } = {}) => {
  const response = await api.get('/trainer/subscription-plans', {
    params: { includeArchived },
  });
  return response.data;
};

export const createSubscriptionPlan = async (payload) => {
  const response = await api.post('/trainer/subscription-plans', payload);
  return response.data;
};

export const updateSubscriptionPlan = async (planId, payload) => {
  const response = await api.patch(`/trainer/subscription-plans/${planId}`, payload);
  return response.data;
};

export const archiveSubscriptionPlan = async (planId) => {
  const response = await api.post(`/trainer/subscription-plans/${planId}/archive`);
  return response.data;
};

export const unarchiveSubscriptionPlan = async (planId) => {
  const response = await api.post(`/trainer/subscription-plans/${planId}/unarchive`);
  return response.data;
};

// ─── Subscriptions (per student) ────────────────────────────────────────────

export const getActiveSubscriptionForStudent = async (studentId) => {
  const response = await api.get(`/trainer/students/${studentId}/subscriptions/active`);
  return response.data;
};

/**
 * Assign — or replace, when the student already has an active subscription.
 * The backend performs the replace atomically; never cancel first.
 */
export const assignPlanToStudent = async (studentId, payload) => {
  const response = await api.post(`/trainer/students/${studentId}/subscriptions`, payload);
  return response.data;
};

export const cancelSubscription = async (subscriptionId, { reason } = {}) => {
  const response = await api.post(`/trainer/subscriptions/${subscriptionId}/cancel`, reason ? { reason } : {});
  return response.data;
};

// ─── Finance overview & payments ────────────────────────────────────────────

export const getFinanceOverview = async (month, { signal } = {}) => {
  const response = await api.get('/trainer/finance/overview', { params: { month }, signal });
  return response.data;
};

/** Every payment of a student (all subscriptions, voided included) + summary + student. */
export const listStudentPayments = async (studentId) => {
  const response = await api.get(`/trainer/students/${studentId}/payments`);
  return response.data;
};

export const markPaymentAsPaid = async (paymentId, { paidAt } = {}) => {
  const response = await api.post(`/trainer/payments/${paymentId}/mark-paid`, paidAt ? { paidAt } : {});
  return response.data;
};

export const markPaymentAsPending = async (paymentId) => {
  const response = await api.post(`/trainer/payments/${paymentId}/mark-pending`);
  return response.data;
};

export const voidPayment = async (paymentId) => {
  const response = await api.post(`/trainer/payments/${paymentId}/void`);
  return response.data;
};

export const updatePayment = async (paymentId, patch) => {
  const response = await api.patch(`/trainer/payments/${paymentId}`, patch);
  return response.data;
};
