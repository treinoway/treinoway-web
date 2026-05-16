import api from './axios';

// ─── Plans ──────────────────────────────────────────────────────────────────

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

// ─── Subscriptions (trainer-wide and per student) ───────────────────────────

export const listAllSubscriptions = async ({ status, planId } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (planId) params.planId = planId;
  const response = await api.get('/trainer/subscriptions', { params });
  return response.data;
};

export const getActiveSubscriptionForStudent = async (studentId) => {
  const response = await api.get(`/trainer/students/${studentId}/subscriptions/active`);
  return response.data;
};

export const listSubscriptionsForStudent = async (studentId) => {
  const response = await api.get(`/trainer/students/${studentId}/subscriptions`);
  return response.data;
};

export const assignPlanToStudent = async (studentId, payload) => {
  const response = await api.post(`/trainer/students/${studentId}/subscriptions`, payload);
  return response.data;
};

export const cancelSubscription = async (subscriptionId, { reason } = {}) => {
  const response = await api.post(`/trainer/subscriptions/${subscriptionId}/cancel`, reason ? { reason } : {});
  return response.data;
};

// ─── Payments ───────────────────────────────────────────────────────────────

export const listPaymentsForSubscription = async (subscriptionId) => {
  const response = await api.get(`/trainer/subscriptions/${subscriptionId}/payments`);
  return response.data;
};

export const createPaymentCycle = async (subscriptionId, payload) => {
  const response = await api.post(`/trainer/subscriptions/${subscriptionId}/payments`, payload);
  return response.data;
};

export const updatePaymentCycle = async (paymentId, payload) => {
  const response = await api.patch(`/trainer/payments/${paymentId}`, payload);
  return response.data;
};

export const markPaymentAsPaid = async (paymentId) => {
  const response = await api.post(`/trainer/payments/${paymentId}/mark-paid`);
  return response.data;
};

export const markPaymentAsPending = async (paymentId) => {
  const response = await api.post(`/trainer/payments/${paymentId}/mark-pending`);
  return response.data;
};

export const deletePaymentCycle = async (paymentId) => {
  await api.delete(`/trainer/payments/${paymentId}`);
};
