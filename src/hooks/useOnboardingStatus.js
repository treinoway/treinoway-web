import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { readJsonCache, writeJsonCache } from '../utils/trainerCaches';

const RETRY_DELAYS_MS = [1000, 3000];
const OPTIMISTIC_STORAGE_KEY = 'treinoway:onboardingOptimistic';
const ONBOARDING_DISMISS_KEY_PREFIX = 'treinoway:onboardingDismissed';
const ONBOARDING_STATUS_KEY_PREFIX = 'treinoway:onboardingStatus';
const LEGACY_ONBOARDING_DISMISS_SESSION_KEY = 'treinoway:onboardingDismissed';
const OPTIMISTIC_STEP_KEYS = ['profileCompleted', 'firstStudentLinked', 'firstProtocolCreated'];
export const ONBOARDING_STEP_KEYS = [
  'profileCompleted',
  'firstStudentLinked',
  'firstProtocolCreated',
  'firstStudentInvited',
  'firstAnamnesisSent',
];

export const getOnboardingDismissKey = (userId) => `${ONBOARDING_DISMISS_KEY_PREFIX}:${userId}`;

// Storage key of the user's last-known status, or null while the id is unknown.
const getOnboardingStatusKey = (userId) => (
  userId === undefined || userId === null ? null : `${ONBOARDING_STATUS_KEY_PREFIX}:${userId}`
);

// Last-known onboarding status of the user (`{ onboarding }`), or null.
export const readOnboardingStatusCache = (userId) => {
  const parsed = readJsonCache(getOnboardingStatusKey(userId));
  if (!parsed || typeof parsed.onboarding !== 'object' || parsed.onboarding === null) return null;
  // why: older caches may carry a stale `brandingAllowed`; it is ignored
  return { onboarding: parsed.onboarding };
};

// Persists the user's last-known onboarding status.
const writeOnboardingStatusCache = (userId, status) => {
  writeJsonCache(getOnboardingStatusKey(userId), status);
};

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
  onboarding: ONBOARDING_STEP_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {}),
  isTrainer: false,
});

// Merges the cached/server flags with session-optimistic ones into the full step map.
const buildOnboarding = (source, optimistic) => ONBOARDING_STEP_KEYS.reduce((acc, key) => {
  acc[key] = !!source?.[key] || !!optimistic?.[key];
  return acc;
}, {});

/**
 * Fetches `/me?include=trainerOnboarding,address` once per mount with a
 * 2-attempt exponential retry (1s, 3s). Never surfaces toasts — callers
 * that need a user-facing error are responsible for their own handling.
 *
 * Starts from the user's last-known status (localStorage) so the card never
 * needs a skeleton for returning trainers. On exhaustion `fetchFailed` is set
 * and the state keeps whatever the cache held; without a cache the caller
 * renders nothing rather than a misleading all-pending card.
 */
const useOnboardingStatus = ({ enabled = true, userId = null } = {}) => {
  const [cached] = useState(() => readOnboardingStatusCache(userId));
  const [me, setMe] = useState(null);
  const [onboarding, setOnboarding] = useState(
    () => buildOnboarding(cached?.onboarding, readOptimisticSteps()),
  );
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
    if (!trainerOnboarding) {
      setOnboarding(buildDefaults().onboarding);
      return;
    }
    const nextOnboarding = buildOnboarding(trainerOnboarding, readOptimisticSteps());
    setOnboarding(nextOnboarding);
    writeOnboardingStatusCache(userId, { onboarding: nextOnboarding });
  }, [userId]);

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
    writeOptimisticStep(stepKey);
    setOnboarding((prev) => {
      if (!prev || prev[stepKey]) return prev;
      return { ...prev, [stepKey]: true };
    });
  }, []);

  return {
    me,
    onboarding,
    hasCache: cached !== null,
    isTrainer,
    loading,
    fetchFailed,
    refetch: fetchStatus,
    markStepDone,
  };
};

export default useOnboardingStatus;
