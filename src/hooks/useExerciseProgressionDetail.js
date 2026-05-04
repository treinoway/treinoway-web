import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const isCancelledError = (error) =>
  error?.code === 'ERR_CANCELED'
  || error?.name === 'CanceledError'
  || error?.name === 'AbortError';

/**
 * Self-sufficient fetcher for the exercise drilldown route. Reads everything
 * from URL params (studentId, exerciseId) + the period descriptor passed in,
 * never relying on router state — so deep links and back-navigation both work.
 */
const useExerciseProgressionDetail = (studentId, exerciseId, period) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchDetail = useCallback(async () => {
    if (!studentId || !exerciseId || !period?.from || !period?.to) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `/trainer/students/${studentId}/dashboard/exercise-progression/${exerciseId}`,
        {
          params: { dateFrom: period.from, dateTo: period.to, sessionLimit: 10 },
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      setData(response.data);
    } catch (err) {
      if (isCancelledError(err) || controller.signal.aborted) return;
      setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [studentId, exerciseId, period]);

  useEffect(() => {
    fetchDetail();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchDetail]);

  return { data, loading, error, refetch: fetchDetail };
};

export default useExerciseProgressionDetail;
