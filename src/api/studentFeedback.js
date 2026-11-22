import api from './axios';

const BASE_URL = '/trainer/student-feedbacks';
const TEMPLATES_URL = `${BASE_URL}/templates`;
const MILESTONE_TEMPLATES_URL = `${BASE_URL}/milestone-templates`;

// URL of the feedbacks of one student
const studentUrl = (studentId) => `/trainer/students/${studentId}/feedbacks`;

// Inbox of the trainer: summary tiles and items for the status filter and, when chosen, the milestone
export const listStudentFeedbacks = async ({ status, milestone }) => {
  const params = milestone ? { status, milestone } : { status };
  const response = await api.get(BASE_URL, { params });
  return response.data;
};

// How many answered feedbacks the trainer has not read yet
export const getStudentFeedbackUnreadCount = async () => {
  const response = await api.get(`${BASE_URL}/unread-count`);
  return response.data.count;
};

// Marks an answered feedback as read; answers `{ id, readAt }`
export const markStudentFeedbackRead = async (id) => {
  const response = await api.patch(`${BASE_URL}/${id}/read`);
  return response.data;
};

// Every feedback of a student, oldest first, with pillars and open answers
export const getStudentFeedbackHistory = async (studentId) => {
  const response = await api.get(studentUrl(studentId));
  return response.data;
};

// Sends an ad-hoc feedback request to a student; the body only goes when a template other than the general one was chosen
export const sendAdhocStudentFeedback = async (studentId, templateId) => {
  const response = templateId ? await api.post(studentUrl(studentId), { templateId }) : await api.post(studentUrl(studentId));
  return response.data;
};

// Auto-send configuration of the trainer
export const getStudentFeedbackConfig = async () => {
  const response = await api.get(`${BASE_URL}/config`);
  return response.data;
};

// Saves the given configuration fields; answers the full configuration
export const updateStudentFeedbackConfig = async (changes) => {
  const response = await api.put(`${BASE_URL}/config`, changes);
  return response.data;
};

// Templates the trainer can use: the general one first, then their own
export const listStudentFeedbackTemplates = async () => {
  const response = await api.get(TEMPLATES_URL);
  return response.data.templates;
};

// One template with its questions in order
export const getStudentFeedbackTemplate = async (id) => {
  const response = await api.get(`${TEMPLATES_URL}/${id}`);
  return response.data.template;
};

// Creates a template of the trainer, copied from `sourceTemplateId` or blank when it is left out; answers the new template
export const createStudentFeedbackTemplate = async ({ name, sourceTemplateId }) => {
  const body = sourceTemplateId ? { name, sourceTemplateId } : { name };
  const response = await api.post(TEMPLATES_URL, body);
  return response.data.template;
};

// Copies a template into a new one owned by the trainer; answers the copy
export const duplicateStudentFeedbackTemplate = async (id) => {
  const response = await api.post(`${TEMPLATES_URL}/${id}/duplicate`);
  return response.data.template;
};

// Saves the name and the ordered questions; the answered template carries a new id when the save created a version
export const saveStudentFeedbackTemplate = async (id, { name, questions }) => {
  const response = await api.put(`${TEMPLATES_URL}/${id}`, { name, questions });
  return response.data.template;
};

// Deletes a template of the trainer
export const deleteStudentFeedbackTemplate = async (id) => {
  await api.delete(`${TEMPLATES_URL}/${id}`);
};

// Template id chosen for each milestone; null means the general template
export const getStudentFeedbackMilestoneTemplates = async () => {
  const response = await api.get(MILESTONE_TEMPLATES_URL);
  return response.data.milestoneTemplates;
};

// Saves the template of the given milestones; answers the full map
export const updateStudentFeedbackMilestoneTemplates = async (changes) => {
  const response = await api.put(MILESTONE_TEMPLATES_URL, changes);
  return response.data.milestoneTemplates;
};
