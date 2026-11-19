import api from '../api/axios';

const BASE = '/admin/manager';

// Performs a GET and returns the response body.
const get = async (url, params) => {
  const response = params ? await api.get(url, { params }) : await api.get(url);
  return response.data;
};

// Paginated users, optionally filtered by search term and kind.
export const listUsers = ({ search, kind, page, pageSize }) =>
  get(`${BASE}/users`, { search, kind, page, pageSize });

// One user's profile, trainer info and counts.
export const getUser = (userId) => get(`${BASE}/users/${userId}`);

// Students linked to a trainer user.
export const listUserStudents = (userId, { page, pageSize }) =>
  get(`${BASE}/users/${userId}/students`, { page, pageSize });

// Trainers linked to a student user.
export const listUserTrainers = (userId, { page, pageSize }) =>
  get(`${BASE}/users/${userId}/trainers`, { page, pageSize });

// Protocols created by (`as: trainer`) or assigned to (`as: student`) a user.
export const listUserProtocols = (userId, { as, page, pageSize }) =>
  get(`${BASE}/users/${userId}/protocols`, { as, page, pageSize });

// Training or exercise templates (`type`) owned by a trainer user.
export const listUserTemplates = (userId, { type, page, pageSize }) =>
  get(`${BASE}/users/${userId}/templates`, { type, page, pageSize });

// Workout sessions of a user, newest first.
export const listUserSessions = (userId, { page, pageSize }) =>
  get(`${BASE}/users/${userId}/sessions`, { page, pageSize });

// One protocol with its trainings and exercises.
export const getProtocol = (protocolId) => get(`${BASE}/protocols/${protocolId}`);

// One workout session with its exercise logs, set logs and previous logs.
export const getSession = (sessionId) => get(`${BASE}/sessions/${sessionId}`);
