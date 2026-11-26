import api from './axios';

// All student-invite endpoints live here so contract changes stay in one file.

/**
 * Adds a student by email: always emails an invite, accepted or declined in the TeuFit app.
 * POST /trainer/student-invites → { outcome: 'invited', invite }
 * Service versions still in rollout may answer { outcome: 'linked', student }.
 */
export const inviteStudent = async (email) => {
  const response = await api.post('/trainer/student-invites', { email });
  return response.data;
};

/**
 * GET /trainer/student-invites?status=&page=&pageSize= → { items, total, page, pageSize }
 */
export const listStudentInvites = async ({ status, page, pageSize } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (page) params.page = page;
  if (pageSize) params.pageSize = pageSize;
  const response = await api.get('/trainer/student-invites', { params });
  return response.data;
};

/**
 * POST /trainer/student-invites/:id/resend → { invite }
 */
export const resendStudentInvite = async (inviteId) => {
  const response = await api.post(`/trainer/student-invites/${inviteId}/resend`);
  return response.data;
};

/**
 * DELETE /trainer/student-invites/:id → { invite } (status revoked)
 */
export const revokeStudentInvite = async (inviteId) => {
  const response = await api.delete(`/trainer/student-invites/${inviteId}`);
  return response.data;
};
