import api from './axios';

// All advanced-technique endpoints live here so contract changes stay in one file.
const BASE_PATH = '/trainer/advanced-techniques';

/**
 * GET /trainer/advanced-techniques?q&page&limit → { data, total, page, limit } (system first, then own).
 */
export const listAdvancedTechniques = async ({ q, page, limit } = {}) => {
  const params = {};
  if (q) params.q = q;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  const response = await api.get(BASE_PATH, { params });
  return response.data;
};

// GET one technique (system or own).
export const getAdvancedTechnique = async (id) => {
  const response = await api.get(`${BASE_PATH}/${id}`);
  return response.data;
};

// POST a new own technique: { name, description, videoUrl?, gifUrl? }.
export const createAdvancedTechnique = async (payload) => {
  const response = await api.post(BASE_PATH, payload);
  return response.data;
};

// PATCH an own technique (system ones answer 403).
export const updateAdvancedTechnique = async (id, payload) => {
  const response = await api.patch(`${BASE_PATH}/${id}`, payload);
  return response.data;
};

// DELETE (soft) an own technique; existing exercise links keep resolving.
export const deleteAdvancedTechnique = async (id) => {
  const response = await api.delete(`${BASE_PATH}/${id}`);
  return response.data;
};
