import { useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';

// Builds runMutation(request) (toasts errors, returns null) and its throwing twin applyLatest(request); both apply only the latest issued response.
const createRunner = (setPlan, showToast) => {
  let issued = 0;

  const applyLatest = async (request) => {
    issued += 1;
    const ticket = issued;
    const updated = await request();
    if (ticket === issued) setPlan(updated);
    return updated;
  };

  const runMutation = async (request) => {
    try {
      return await applyLatest(request);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      return null;
    }
  };

  return Object.assign(runMutation, { applyLatest });
};

// Returns runMutation(request): applies the returned plan (older responses are dropped), or toasts the API error and returns null.
const usePlanMutation = (setPlan) => {
  const { showToast } = useToast();
  return useMemo(() => createRunner(setPlan, showToast), [setPlan, showToast]);
};

export default usePlanMutation;
