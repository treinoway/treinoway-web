import api from './axios';

/**
 * Fetches the trainer briefing summary.
 * GET /trainer/briefing
 */
export const getTrainerBriefing = async () => {
  const response = await api.get('/trainer/briefing');
  return response.data;
};
