import { useState, useEffect } from 'react';
import { getTrainerBriefing } from '../api/trainerBriefing';
import { translateError } from '../i18n';

/**
 * Fetches the trainer briefing on mount (no polling).
 * Returns { data, loading, error }.
 * - data: raw briefing object from the API, or null
 * - loading: true while the request is in flight
 * - error: user-facing string on failure, or null
 */
const useTrainerBriefing = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchBriefing = async () => {
      setLoading(true);
      setError(null);
      try {
        const briefing = await getTrainerBriefing();
        if (!cancelled) {
          setData(briefing);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.userMessage || translateError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchBriefing();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
};

export default useTrainerBriefing;
