import api from './axios';

// Sends a trainer's criticism/suggestion; returns `{ id, createdAt }`.
export const sendTrainerFeedback = async (payload) => {
  const response = await api.post('/trainer/feedback', payload);
  return response.data;
};
