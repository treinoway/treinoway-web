import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFinanceOverview } from '../api/subscriptions';
import { patchTrainerDashboardFinanceCache } from './useTrainerDashboard';
import { FINANCE_OVERDUE_EVENT } from '../constants/finance';
import { getErrorMessage } from '../utils/financeErrors';

const isAbortError = (err) => err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED';

/** Keep the sidebar badge and the cached dashboard in sync with today's overdue. */
const broadcastOverdue = ({ userId, overdueCount, overdueAmount }) => {
  patchTrainerDashboardFinanceCache({ userId, overdueCount, overdueAmount });
  window.dispatchEvent(new CustomEvent(FINANCE_OVERDUE_EVENT, { detail: { overdueCount, overdueAmount } }));
};

/**
 * One request per month: `GET /trainer/finance/overview?month=`. A month
 * change aborts the previous request and shows skeletons; `refresh()` (after
 * a mutation) keeps the content on screen and swaps data on arrival.
 */
const useFinanceOverview = (month) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const fetchOverview = useCallback(async ({ silent }) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (!silent) {
      setLoading(true);
      setError(null);
      setData(null);
    }
    try {
      const next = await getFinanceOverview(month, { signal: controller.signal });
      setData(next);
      setError(null);
      if (next?.kpis) broadcastOverdue({ userId, ...next.kpis });
    } catch (err) {
      if (isAbortError(err)) return;
      if (!silent) setError(getErrorMessage(err));
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }, [month, userId]);

  useEffect(() => {
    fetchOverview({ silent: false });
    return () => controllerRef.current?.abort();
  }, [fetchOverview]);

  const refresh = useCallback(() => fetchOverview({ silent: true }), [fetchOverview]);
  const retry = useCallback(() => fetchOverview({ silent: false }), [fetchOverview]);

  return { data, loading, error, refresh, retry };
};

export default useFinanceOverview;
