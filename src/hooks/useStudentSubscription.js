import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getActiveSubscriptionForStudent,
  listStudentPayments,
  listSubscriptionPlans,
} from '../api/subscriptions';
import { getErrorMessage } from '../utils/financeErrors';

const EMPTY_STATE = { id: null, subscription: null, payments: [], loading: true, error: null };

/**
 * Data for the StudentDetail "Assinatura" block: the active subscription and
 * every payment of the student (incl. debt of cancelled subscriptions), in
 * parallel — statuses come from the API. Plans (assign sheet + name fallback)
 * load separately, also in parallel, so a plans failure never hides the block;
 * `plansLoaded` tells when that fallback is usable.
 *
 * State is keyed by student id: until the current id answers it reads as
 * loading/empty, and late responses for a previous student are ignored.
 * `reload()` keeps the content on screen.
 */
const useStudentSubscription = (studentId) => {
  const [state, setState] = useState(EMPTY_STATE);
  const [plansState, setPlansState] = useState({ plans: [], loaded: false });
  const currentIdRef = useRef(studentId);

  const load = useCallback(async () => {
    const isStale = () => currentIdRef.current !== studentId;
    // A retry after an error shows the skeleton again; a reload of loaded content does not.
    setState((prev) => (prev.id === studentId && prev.error ? { ...prev, loading: true, error: null } : prev));
    try {
      const [active, history] = await Promise.all([
        getActiveSubscriptionForStudent(studentId),
        listStudentPayments(studentId),
      ]);
      if (isStale()) return;
      setState({ id: studentId, subscription: active || null, payments: history?.payments || [], loading: false, error: null });
    } catch (err) {
      if (isStale()) return;
      setState((prev) => ({ ...(prev.id === studentId ? prev : EMPTY_STATE), id: studentId, loading: false, error: getErrorMessage(err) }));
    }
  }, [studentId]);

  const loadPlans = useCallback(async () => {
    try {
      setPlansState({ plans: await listSubscriptionPlans(), loaded: true });
    } catch {
      setPlansState({ plans: [], loaded: true });
    }
  }, []);

  useEffect(() => {
    currentIdRef.current = studentId;
    load();
  }, [studentId, load]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const current = state.id === studentId ? state : EMPTY_STATE;
  return {
    subscription: current.subscription,
    payments: current.payments,
    loading: current.loading,
    error: current.error,
    plans: plansState.plans,
    plansLoaded: plansState.loaded,
    reload: load,
    reloadPlans: loadPlans,
  };
};

export default useStudentSubscription;
