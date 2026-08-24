import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const RETRY_DELAYS_MS = [1000, 3000];
const OPTIMISTIC_STORAGE_KEY = 'treinoway:onboardingOptimistic';
const ONBOARDING_DISMISS_KEY_PREFIX = 'treinoway:onboardingDismissed';
const LEGACY_ONBOARDING_DISMISS_SESSION_KEY = 'treinoway:onboardingDismissed';
const OPTIMISTIC_STEP_KEYS = ['profileCompleted', 'firstStudentLinked', 'firstProtocolCreated'];

export const getOnboardingDismissKey = (userId) => `${ONBOARDING_DISMISS_KEY_PREFIX}:${userId}`;

export const clearOnboardingSessionState = () => {
  try {
    sessionStorage.removeItem(OPTIMISTIC_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_ONBOARDING_DISMISS_SESSION_KEY);
  } catch {
    // ignore storage errors (private mode, etc.)
  }
};

const readOptimisticSteps = () => {
  try {
    const raw = sessionStorage.getItem(OPTIMISTIC_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return OPTIMISTIC_STEP_KEYS.reduce((acc, key) => {
      if (parsed[key]) acc[key] = true;
      return acc;
    }, {});
  } catch {
    return null;
  }
};

const writeOptimisticStep = (stepKey) => {
  if (!OPTIMISTIC_STEP_KEYS.includes(stepKey)) return;
  try {
    const current = readOptimisticSteps() || {};
    current[stepKey] = true;
    sessionStorage.setItem(OPTIMISTIC_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
};

export const markOnboardingStepOptimistic = writeOptimisticStep;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildDefaults = () => ({
  me: null,
  onboarding: {
    profileCompleted: false,
    firstStudentLinked: false,
    firstProtocolCreated: false,
  },
  isTrainer: false,
});

/**
 * Fetches `/me?include=trainerOnboarding,address` once per mount with a
 * 2-attempt exponential retry (1s, 3s). Never surfaces toasts — callers
 * that need a user-facing error are responsible for their own handling.
 *
 * On exhaustion we return all-pending defaults so the card can still render.
 */
const useOnboardingStatus = ({ enabled = true } = {}) => {
  const [me, setMe] = useState(null);
  const [onboarding, setOnboarding] = useState(() => {
    const optimistic = readOptimisticSteps() || {};
    return { ...buildDefaults().onboarding, ...optimistic };
  });
  const [isTrainer, setIsTrainer] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [fetchFailed, setFetchFailed] = useState(false);
  const cancelledRef = useRef(false);

  const applyResponse = useCallback((data) => {
    setMe(data);
    const hasTrainerRole = Array.isArray(data?.roles)
      && data.roles.some((role) => String(role).toUpperCase() === 'TRAINER');
    setIsTrainer(hasTrainerRole);

    const trainerOnboarding = data?.trainerOnboarding;
    const optimistic = readOptimisticSteps() || {};
    if (trainerOnboarding) {
      setOnboarding({
        profileCompleted: !!trainerOnboarding.profileCompleted || !!optimistic.profileCompleted,
        firstStudentLinked: !!trainerOnboarding.firstStudentLinked || !!optimistic.firstStudentLinked,
        firstProtocolCreated: !!trainerOnboarding.firstProtocolCreated || !!optimistic.firstProtocolCreated,
      });
    } else {
      setOnboarding(buildDefaults().onboarding);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setFetchFailed(false);

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      if (cancelledRef.current) return;
      try {
        const response = await api.get('/me?include=trainerOnboarding,address');
        if (cancelledRef.current) return;
        applyResponse(response.data);
        setLoading(false);
        return;
      } catch {
        if (attempt < RETRY_DELAYS_MS.length) {
          await wait(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    if (cancelledRef.current) return;
    setFetchFailed(true);
    setLoading(false);
  }, [applyResponse]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return undefined;
    }
    fetchStatus();
    return () => {
      cancelledRef.current = true;
    };
  }, [enabled, fetchStatus]);

  const markStepDone = useCallback((stepKey) => {
    setOnboarding((prev) => {
      if (!prev || prev[stepKey]) return prev;
      return { ...prev, [stepKey]: true };
    });
  }, []);

  return {
    me,
    onboarding,
    isTrainer,
    loading,
    fetchFailed,
    refetch: fetchStatus,
    markStepDone,
  };
};

export default useOnboardingStatus;
