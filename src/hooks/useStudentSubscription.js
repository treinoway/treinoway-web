import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getActiveSubscriptionForStudent,
  listStudentPayments,
  listSubscriptionPlans,
} from '../api/subscriptions';
import { getErrorMessage } from '../utils/financeErrors';

const EMPTY_STATE = { subscription: null, payments: [], loading: true, error: null };

/**
 * Data for the StudentDetail "Assinatura" block: the active subscription and
 * every payment of the student (incl. debt of cancelled subscriptions), in
 * parallel — statuses come from the API. Plans (assign sheet + name fallback)
 * load separately so a plans failure never hides the block.
 *
 * When `studentId` changes the state resets and late responses for the
 * previous student are ignored. `reload()` keeps the content on screen.
 */
const useStudentSubscription = (studentId) => {
  const [state, setState] = useState(EMPTY_STATE);
  const [plans, setPlans] = useState([]);
  const currentIdRef = useRef(studentId);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    const isStale = () => currentIdRef.current !== studentId;
    if (!loadedRef.current) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [active, history] = await Promise.all([
        getActiveSubscriptionForStudent(studentId),
        listStudentPayments(studentId),
      ]);
      if (isStale()) return;
      loadedRef.current = true;
      setState({ subscription: active || null, payments: history?.payments || [], loading: false, error: null });
    } catch (err) {
      if (!isStale()) setState((prev) => ({ ...prev, loading: false, error: getErrorMessage(err) }));
    }
  }, [studentId]);

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await listSubscriptionPlans());
    } catch {
      setPlans([]);
    }
  }, []);

  useEffect(() => {
    currentIdRef.current = studentId;
    loadedRef.current = false;
    setState(EMPTY_STATE);
    load();
  }, [studentId, load]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  return { ...state, plans, reload: load, reloadPlans: loadPlans };
};

export default useStudentSubscription;
