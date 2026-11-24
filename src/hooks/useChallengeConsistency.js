import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';
import useIntervalTick from './useIntervalTick';
import { POLL_INTERVAL_MS } from '../constants/consistencyRanking';
import { CHALLENGE_STATUS } from '../constants/challenge';

// Whether the browser tab is in the background, where polling would be wasted
const isPageHidden = () => document.visibilityState === 'hidden';

// Constancy standings of a weekly championship: loads when enabled and refreshes every 60 s while the championship is running
const useChallengeConsistency = (challengeId, { enabled = true } = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const loadRef = useRef(null);
  const isRunning = enabled && data?.status === CHALLENGE_STATUS.ACTIVE;
  const tick = useIntervalTick(isRunning ? POLL_INTERVAL_MS : null);

  const load = useCallback(async ({ silent }) => {
    const requestId = ++requestIdRef.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await api.get(`/trainer/challenges/${challengeId}/consistency`);
      if (requestId !== requestIdRef.current) return;
      setData(response.data);
      setError(null);
    } catch (err) {
      if (silent || requestId !== requestIdRef.current) return;
      setError(err.userMessage || translateError(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    if (!enabled || !challengeId) return;
    load({ silent: false });
  }, [enabled, challengeId, load]);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (tick === 0 || isPageHidden()) return;
    loadRef.current({ silent: true });
  }, [tick]);

  const reload = useCallback(() => load({ silent: false }), [load]);

  return { data, loading, error, reload };
};

export default useChallengeConsistency;
