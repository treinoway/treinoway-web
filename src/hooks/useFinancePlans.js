import { useCallback, useEffect, useState } from 'react';
import {
  archiveSubscriptionPlan,
  createSubscriptionPlan,
  listSubscriptionPlans,
  unarchiveSubscriptionPlan,
  updateSubscriptionPlan,
} from '../api/subscriptions';
import { getErrorMessage } from '../utils/financeErrors';

/**
 * Plans for the Financeiro "Planos" tab (archived included). Loaded lazily the
 * first time `enabled` turns true; each plan carries `activeSubscriptionCount`,
 * so no extra subscriptions request is needed.
 */
const useFinancePlans = (enabled) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await listSubscriptionPlans({ includeArchived: true }));
      setLoaded(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !loaded && !loading && !error) load();
  }, [enabled, loaded, loading, error, load]);

  const savePlan = useCallback(async (planId, payload) => {
    if (planId) await updateSubscriptionPlan(planId, payload);
    else await createSubscriptionPlan(payload);
    await load();
  }, [load]);

  const toggleArchive = useCallback(async (plan) => {
    if (plan.isArchived) await unarchiveSubscriptionPlan(plan.id);
    else await archiveSubscriptionPlan(plan.id);
    await load();
  }, [load]);

  return { plans, loading: loading || (enabled && !loaded && !error), loaded, error, retry: load, savePlan, toggleArchive };
};

export default useFinancePlans;
