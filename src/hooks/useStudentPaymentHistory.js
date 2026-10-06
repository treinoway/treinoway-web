import { useCallback, useEffect, useRef, useState } from 'react';
import { listStudentPayments } from '../api/subscriptions';
import { getErrorMessage } from '../utils/financeErrors';

/**
 * `GET /trainer/students/:id/payments` — every payment of the student across
 * subscriptions (voided included) + summary + student identity. Works after
 * the student is unlinked. `reload()` after a mutation keeps content on screen.
 */
const useStudentPaymentHistory = (studentId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!loadedRef.current) setLoading(true);
    try {
      setData(await listStudentPayments(studentId));
      setError(null);
      loadedRef.current = true;
    } catch (err) {
      if (!loadedRef.current) setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const retry = useCallback(() => {
    loadedRef.current = false;
    setError(null);
    return load();
  }, [load]);

  useEffect(() => {
    loadedRef.current = false;
    load();
  }, [load]);

  return { data, loading, error, reload: load, retry };
};

export default useStudentPaymentHistory;
