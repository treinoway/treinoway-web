import api from './axios';

// ─── Plans ──────────────────────────────────────────────────────────────────

/** Plans list; each plan carries `activeSubscriptionCount`. */
export const listSubscriptionPlans = async ({ includeArchived = false } = {}) => {
  const response = await api.get('/professional/subscription-plans', {
    params: { includeArchived },
  });
  return response.data;
};

export const createSubscriptionPlan = async (payload) => {
  const response = await api.post('/professional/subscription-plans', payload);
  return response.data;
};

export const updateSubscriptionPlan = async (planId, payload) => {
  const response = await api.patch(`/professional/subscription-plans/${planId}`, payload);
  return response.data;
};

export const archiveSubscriptionPlan = async (planId) => {
  const response = await api.post(`/professional/subscription-plans/${planId}/archive`);
  return response.data;
};

export const unarchiveSubscriptionPlan = async (planId) => {
  const response = await api.post(`/professional/subscription-plans/${planId}/unarchive`);
  return response.data;
};

// ─── Subscriptions (per student) ────────────────────────────────────────────

export const getActiveSubscriptionForStudent = async (studentId) => {
  const response = await api.get(`/professional/students/${studentId}/subscriptions/active`);
  return response.data;
};

/**
 * Assign — or replace, when the student already has an active subscription.
 * The backend performs the replace atomically; never cancel first.
 */
export const assignPlanToStudent = async (studentId, payload) => {
  const response = await api.post(`/professional/students/${studentId}/subscriptions`, payload);
  return response.data;
};

export const cancelSubscription = async (subscriptionId, { reason } = {}) => {
  const response = await api.post(`/professional/subscriptions/${subscriptionId}/cancel`, reason ? { reason } : {});
  return response.data;
};

// ─── Finance overview & payments ────────────────────────────────────────────

export const getFinanceOverview = async (month, { signal } = {}) => {
  const response = await api.get('/professional/finance/overview', { params: { month }, signal });
  return response.data;
};

/** Every payment of a student (all subscriptions, voided included) + summary + student. */
export const listStudentPayments = async (studentId) => {
  const response = await api.get(`/professional/students/${studentId}/payments`);
  return response.data;
};

export const markPaymentAsPaid = async (paymentId, { paidAt } = {}) => {
  const response = await api.post(`/professional/payments/${paymentId}/mark-paid`, paidAt ? { paidAt } : {});
  return response.data;
};

export const markPaymentAsPending = async (paymentId) => {
  const response = await api.post(`/professional/payments/${paymentId}/mark-pending`);
  return response.data;
};

export const voidPayment = async (paymentId) => {
  const response = await api.post(`/professional/payments/${paymentId}/void`);
  return response.data;
};

export const updatePayment = async (paymentId, patch) => {
  const response = await api.patch(`/professional/payments/${paymentId}`, patch);
  return response.data;
};

/** Sidebar badge source for any professional: `{ overdueCount, overdueAmount }`. */
export const getFinanceSummary = async () => {
  const response = await api.get('/professional/finance/summary');
  return response.data;
};
