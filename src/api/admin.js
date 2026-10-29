import api from './axios';

// ─── Trainers & platform plan ───────────────────────────────────────────────

/** Paginated trainers (plus signups without invite when `includeSignups`), optionally filtered by invite state. */
export const listTrainers = async ({ search, includeSignups, inviteStatus, page, pageSize }) => {
  const response = await api.get('/admin/trainers', {
    params: { search, includeSignups, inviteStatus, page, pageSize },
  });
  return response.data;
};

/** DB-only plan override (no Asaas call); returns the new tier and student usage. */
export const changeTrainerPlan = async (trainerId, tier) => {
  const response = await api.patch(`/admin/trainers/${trainerId}/platform-plan`, { tier });
  return response.data;
};

// ─── iArnold token usage ────────────────────────────────────────────────────

/** Month totals plus per-trainer token usage; `month` is `YYYY-MM`. */
export const getAiUsage = async (month) => {
  const response = await api.get('/admin/ai-usage', { params: { month } });
  return response.data;
};

// ─── Trainer invites ────────────────────────────────────────────────────────

// Serializes the invite list filters into a query string.
const buildInviteQuery = ({ status, email, page, pageSize }) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (email) params.append('email', email);
  params.append('page', String(page));
  params.append('pageSize', String(pageSize));
  return params.toString();
};

// Paginated trainer invites, optionally filtered by status and email.
export const listTrainerInvites = async (filters) => {
  const response = await api.get(`/admin/trainer-invites?${buildInviteQuery(filters)}`);
  return response.data;
};

// Creates a beta invite; returns `{ invite, code }`.
export const createTrainerInvite = async (email) => {
  const response = await api.post('/admin/trainer-invites', { email });
  return response.data;
};

// Revokes a pending invite so its code stops working.
export const revokeTrainerInvite = async (inviteId) => {
  const response = await api.post(`/admin/trainer-invites/${inviteId}/revoke`);
  return response.data;
};
