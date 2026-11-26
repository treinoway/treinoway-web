import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const BECOME_TRAINER_URL = '/become-trainer';
const BECOME_NUTRITIONIST_URL = '/become-nutritionist';

// Grants the chosen professional roles one call at a time, storing each new token pair before the next call.
const useProfessionActivation = () => {
  const { updateTokens, refreshUser } = useAuth();
  const [activating, setActivating] = useState(false);

  const grantRole = async (url) => {
    const { data } = await api.patch(url);
    updateTokens(data.token?.accessToken || data.accessToken, data.refreshToken);
  };

  const activate = async ({ training, nutrition }) => {
    const urls = [training && BECOME_TRAINER_URL, nutrition && BECOME_NUTRITIONIST_URL].filter(Boolean);
    let grantedCount = 0;
    setActivating(true);
    try {
      for (const url of urls) {
        await grantRole(url);
        grantedCount += 1;
      }
      await refreshUser();
    } catch (error) {
      // why: a role granted before the failure is already live on the server, so the user must be reloaded
      if (grantedCount > 0 && grantedCount < urls.length) await refreshUser();
      throw error;
    } finally {
      setActivating(false);
    }
  };

  return { activate, activating };
};

export default useProfessionActivation;
